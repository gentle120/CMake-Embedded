import * as vscode from 'vscode';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename, relative } from 'node:path';
import { getDeviceProfile, listDeviceProfiles } from './devices/deviceProfiles';
import { buildDeviceSelectionItems } from './devices/deviceSelection';
import { generateCMakeLists } from './generator/cmakeGenerator';
import { generateLinkerScript } from './generator/linkerGenerator';
import { generateCMakePresets } from './generator/presetsGenerator';
import { generateGnuStartup } from './generator/startupGenerator';
import { generateToolchainFile } from './generator/toolchainGenerator';
import { generateSyscalls, generateSysmem, runtimeSourceNames } from './generator/runtimeGenerator';
import { generateProjectConfig } from './generator/configGenerator';
import { getWorkspaceSettings } from './integration/workspaceSettings';
import { configureCppProperties } from './integration/cppProperties';
import { scanProject } from './scanner/projectScanner';

interface GeneratedFile {
  path: string;
  content: string;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function updateWorkspaceSettings(): Promise<void> {
  for (const [key, value] of Object.entries(getWorkspaceSettings())) {
    const separator = key.indexOf('.');
    const section = key.slice(0, separator);
    const setting = key.slice(separator + 1);
    await vscode.workspace.getConfiguration(section).update(
      setting,
      value,
      vscode.ConfigurationTarget.Workspace
    );
  }
}

function projectNameFromRoot(root: string): string {
  const name = basename(root).replace(/[^A-Za-z0-9_-]/g, '_');
  return name || 'firmware';
}

function createGeneratedFiles(root: string, part: string, project: Awaited<ReturnType<typeof scanProject>>, files: GeneratedFile[]): GeneratedFile[] {
  const profile = getDeviceProfile(part);
  const cmakeDir = join(root, 'cmake');
  const hasSource = (fileName: string): boolean => {
    const sourceBasename = basename(fileName).toLowerCase();
    return project.sources.some((source) => basename(source).toLowerCase() === sourceBasename);
  };
  const runtimeFiles: GeneratedFile[] = [];
  if (!hasSource(runtimeSourceNames[0])) {
    runtimeFiles.push({ path: join(root, runtimeSourceNames[0]), content: generateSyscalls() });
  }
  if (!hasSource(runtimeSourceNames[1])) {
    runtimeFiles.push({ path: join(root, runtimeSourceNames[1]), content: generateSysmem() });
  }
  const startupFiles = [{
    path: join(root, profile.gnuStartupFileName),
    content: generateGnuStartup(profile)
  }];
  return [
    ...files,
    ...startupFiles,
    ...runtimeFiles,
    {
      path: join(cmakeDir, profile.toolchainFileName),
      content: generateToolchainFile(profile)
    },
    {
      path: join(root, profile.linkerFileName),
      content: generateLinkerScript(profile)
    },
    {
      path: join(root, 'CMakePresets.json'),
      content: generateCMakePresets(profile.toolchainFileName)
    },
  ];
}

async function generateProject(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open an MCU project folder before generating CMake.');
    return;
  }

  const selection = await vscode.window.showQuickPick(
    buildDeviceSelectionItems(listDeviceProfiles()).map((item) => item.kind === 'separator'
      ? {
          label: item.label,
          kind: vscode.QuickPickItemKind.Separator
        }
      : {
          label: item.profile.part,
          description: `${item.profile.family} / ${item.profile.core}`,
          detail: `${item.profile.flash.length / 1024} KB Flash, ${item.profile.ram.length / 1024} KB RAM`
        }),
    { placeHolder: 'Select the MCU for this project' }
  );
  if (!selection || selection.kind === vscode.QuickPickItemKind.Separator) {
    return;
  }

  const root = workspaceFolder.uri.fsPath;
  const profile = getDeviceProfile(selection.label);
  const project = await scanProject(root);
  if (project.sources.length === 0) {
    vscode.window.showErrorMessage('No C/C++ or assembly source files were found in the workspace.');
    return;
  }

  const projectName = projectNameFromRoot(root);
  const initialFiles: GeneratedFile[] = [{
    path: join(root, 'CMakeLists.txt'),
    content: generateCMakeLists(projectName, project, profile)
  }];
  const generatedFiles = createGeneratedFiles(root, profile.part, project, initialFiles);
  const configPath = join(root, '.mcu-cmake.json');
  const settingsPath = join(root, '.vscode', 'settings.json');
  const cppPropertiesPath = join(root, '.vscode', 'c_cpp_properties.json');
  const filesToCheck = [...generatedFiles.map((file) => file.path), settingsPath, cppPropertiesPath, configPath];
  const existingFiles: string[] = [];
  for (const filePath of filesToCheck) {
    if (await exists(filePath)) {
      existingFiles.push(filePath);
    }
  }
  if (existingFiles.length > 0) {
    const action = await vscode.window.showWarningMessage(
      `${existingFiles.length} generated file(s) already exist. Overwrite them?`,
      'Overwrite',
      'Cancel'
    );
    if (action !== 'Overwrite') {
      return;
    }
  }

  await mkdir(join(root, 'cmake'), { recursive: true });
  await mkdir(join(root, 'system'), { recursive: true });
  await mkdir(join(root, '.vscode'), { recursive: true });
  const relativePath = (filePath: string): string => relative(root, filePath).replace(/\\/g, '/');
  const configFile: GeneratedFile = {
    path: configPath,
    content: generateProjectConfig(
      projectName,
      profile,
      [...generatedFiles.map((file) => relativePath(file.path)), relativePath(settingsPath), relativePath(cppPropertiesPath)],
      existingFiles.map(relativePath)
    )
  };
  let cppPropertiesContent: string | undefined;
  if (await exists(cppPropertiesPath)) {
    cppPropertiesContent = await readFile(cppPropertiesPath, 'utf8');
  }
  const cppPropertiesFile: GeneratedFile = {
    path: cppPropertiesPath,
    content: configureCppProperties(cppPropertiesContent)
  };
  await Promise.all([...generatedFiles, configFile, cppPropertiesFile].map((file) => writeFile(file.path, file.content, 'utf8')));
  try {
    await updateWorkspaceSettings();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showWarningMessage(`CMake Tools/IntelliSense settings were not updated: ${message}`);
  }
  vscode.window.showInformationMessage(
    `Generated CMake project for ${profile.part}: ${project.sources.length} source file(s).`
  );
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mcuCmake.generate', () => generateProject())
  );
}

export function deactivate(): void {
  // No resources need explicit cleanup.
}
