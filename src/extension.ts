import * as vscode from 'vscode';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { getDeviceProfile, listDeviceProfiles } from './devices/deviceProfiles';
import { buildDeviceSelectionItems } from './devices/deviceSelection';
import { generateCMakeLists } from './generator/cmakeGenerator';
import { generateLinkerScript } from './generator/linkerGenerator';
import { generateCMakePresets } from './generator/presetsGenerator';
import { generateGnuStartup } from './generator/startupGenerator';
import { generateToolchainFile } from './generator/toolchainGenerator';
import { generateSyscalls, generateSysmem, runtimeSourceNames } from './generator/runtimeGenerator';
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

function projectNameFromRoot(root: string): string {
  const name = basename(root).replace(/[^A-Za-z0-9_-]/g, '_');
  return name || 'firmware';
}

function createGeneratedFiles(root: string, projectName: string, part: string, project: Awaited<ReturnType<typeof scanProject>>, files: GeneratedFile[]): GeneratedFile[] {
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
    {
      path: join(root, '.mcu-cmake.json'),
      content: `${JSON.stringify({ device: profile.part, projectName }, null, 2)}\n`
    }
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
  const generatedFiles = createGeneratedFiles(root, projectName, profile.part, project, initialFiles);
  const existingFiles: string[] = [];
  for (const file of generatedFiles) {
    if (await exists(file.path)) {
      existingFiles.push(file.path);
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
  await Promise.all(generatedFiles.map((file) => writeFile(file.path, file.content, 'utf8')));
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
