import * as vscode from 'vscode';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename, dirname, isAbsolute, relative } from 'node:path';
import { getDeviceProfile, listDeviceProfiles, type DeviceSeries, type DeviceVendor } from './devices/deviceProfiles';
import { listDeviceProfilesForSeries, listDeviceSeries, listDeviceVendors } from './devices/deviceSelection';
import { generateCMakeLists } from './generator/cmakeGenerator';
import { generateLinkerScript } from './generator/linkerGenerator';
import { generateCMakePresets } from './generator/presetsGenerator';
import { generateGnuStartup } from './generator/startupGenerator';
import { generateToolchainFile } from './generator/toolchainGenerator';
import { generateSyscalls, generateSysmem, runtimeSourceNames } from './generator/runtimeGenerator';
import { generateProjectConfig } from './generator/configGenerator';
import { generateFlashScript } from './generator/flashScriptGenerator';
import { generateCortexDebugLaunchJson } from './generator/debugConfigGenerator';
import { getFlashProbeProfile, listFlashProbeProfiles, type FlashProbeProfile } from './flash/probeProfiles';
import {
  getFlashTargetProfile,
  getFlashTargetProfileForDevice,
  listFlashTargetSeries,
  listFlashTargetProfiles,
  listFlashTargetVendors,
  listFlashTargetsForSeries,
  type FlashTargetProfile
} from './flash/targets/targetProfiles';
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

function createGeneratedFiles(
  root: string,
  part: string,
  project: Awaited<ReturnType<typeof scanProject>>,
  files: GeneratedFile[],
  flashTarget?: FlashTargetProfile,
  flashProbe?: FlashProbeProfile,
  openocdPath = 'openocd'
): GeneratedFile[] {
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
  const flashFiles = flashProbe
    && flashTarget
    ? [{
        path: join(root, 'flash.py'),
        content: generateFlashScript(projectNameFromRoot(root), flashTarget, flashProbe, openocdPath)
      }]
    : [];
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
    ...flashFiles,
  ];
}

async function selectDeviceProfile(): Promise<ReturnType<typeof getDeviceProfile> | undefined> {
  const profiles = listDeviceProfiles();
  const vendorSelection = await vscode.window.showQuickPick(
    listDeviceVendors(profiles).map((vendor) => ({
      label: vendor === 'STM' ? 'STM32' : 'GD32',
      description: `${profiles.filter((profile) => profile.vendor === vendor).length} supported device(s)`,
      vendor
    })),
    { placeHolder: 'Select MCU vendor' }
  );
  if (!vendorSelection) {
    return undefined;
  }

  const vendor = vendorSelection.vendor as DeviceVendor;
  const seriesSelection = await vscode.window.showQuickPick(
    listDeviceSeries(profiles, vendor).map((series) => {
      const seriesProfiles = listDeviceProfilesForSeries(profiles, vendor, series);
      return {
        label: seriesProfiles[0]?.family ?? series,
        description: `${seriesProfiles.length} supported device(s)`,
        detail: `${seriesProfiles[0]?.core ?? 'ARM'} MCU family`,
        series
      };
    }),
    { placeHolder: `Select MCU series (${vendorSelection.label})` }
  );
  if (!seriesSelection) {
    return undefined;
  }

  const series = seriesSelection.series as DeviceSeries;
  const deviceSelection = await vscode.window.showQuickPick(
    listDeviceProfilesForSeries(profiles, vendor, series).map((profile) => ({
      label: profile.part,
      description: `${profile.family} / ${profile.core}`,
      detail: `${profile.flash.length / 1024} KB Flash, ${profile.ram.length / 1024} KB RAM`
    })),
    { placeHolder: `Select MCU model (${seriesSelection.label})` }
  );
  return deviceSelection ? getDeviceProfile(deviceSelection.label) : undefined;
}

async function selectFlashProbe(): Promise<FlashProbeProfile | undefined> {
  const selection = await vscode.window.showQuickPick(
    listFlashProbeProfiles().map((profile) => ({
      label: profile.label,
      description: profile.interfaceConfig,
      id: profile.id
    })),
    { placeHolder: 'Select the debug probe for OpenOCD' }
  );
  return selection ? getFlashProbeProfile(selection.id) : undefined;
}

async function selectFlashTarget(): Promise<FlashTargetProfile | undefined> {
  const targets = listFlashTargetProfiles();
  const vendorSelection = await vscode.window.showQuickPick(
    listFlashTargetVendors().map((vendor) => ({
      label: vendor,
      description: `${targets.filter((target) => target.vendor === vendor).length} OpenOCD target(s)`,
      vendor
    })),
    { placeHolder: 'Select OpenOCD target vendor' }
  );
  if (!vendorSelection) {
    return undefined;
  }

  const seriesSelection = await vscode.window.showQuickPick(
    listFlashTargetSeries(vendorSelection.vendor).map((series) => {
      const seriesTargets = listFlashTargetsForSeries(vendorSelection.vendor, series);
      return {
        label: seriesTargets[0]?.label ?? series,
        description: `${seriesTargets.length} OpenOCD target(s)`,
        series
      };
    }),
    { placeHolder: `Select OpenOCD target series (${vendorSelection.label})` }
  );
  if (!seriesSelection) {
    return undefined;
  }

  const targetSelection = await vscode.window.showQuickPick(
    listFlashTargetsForSeries(vendorSelection.vendor, seriesSelection.series).map((target) => ({
      label: target.label,
      description: `${target.vendor} / ${target.series}`,
      detail: `${target.targetConfig} / ${target.transport}`,
      id: target.id
    })),
    { placeHolder: `Select OpenOCD target (${seriesSelection.label})` }
  );
  return targetSelection ? getFlashTargetProfile(targetSelection.id) : undefined;
}

async function shouldGenerateFlashScript(): Promise<boolean | undefined> {
  const selection = await vscode.window.showQuickPick(
    [
      { label: 'Generate flash.py', value: true },
      { label: 'Skip flash.py', value: false }
    ],
    { placeHolder: 'Generate an OpenOCD flash script too?' }
  );
  return selection?.value;
}

function getOpenOcdPath(): string {
  return vscode.workspace.getConfiguration('mcuCmake').get<string>('openocdPath', 'openocd')?.trim() || 'openocd';
}

function getArmToolchainPath(): string | undefined {
  const configuredPath = vscode.workspace.getConfiguration('mcuCmake')
    .get<string>('armToolchainPath', '')?.trim();
  return configuredPath || undefined;
}

async function findOpenOcdSearchDirs(openocdPath: string): Promise<string[]> {
  if (!isAbsolute(openocdPath)) {
    return [];
  }
  const prefix = dirname(dirname(openocdPath));
  const candidates = [
    join(prefix, 'scripts'),
    join(prefix, 'share', 'openocd', 'scripts'),
    join(prefix, 'openocd', 'scripts')
  ];
  for (const candidate of candidates) {
    if (await exists(join(candidate, 'target'))) {
      return [candidate];
    }
  }
  return [];
}

async function generateDebugConfigurationOnly(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open an MCU project folder before generating a debug configuration.');
    return;
  }
  const target = await selectFlashTarget();
  if (!target) {
    return;
  }
  const probe = await selectFlashProbe();
  if (!probe) {
    return;
  }

  const root = workspaceFolder.uri.fsPath;
  const launchPath = join(root, '.vscode', 'launch.json');
  const existingContent = await exists(launchPath) ? await readFile(launchPath, 'utf8') : undefined;
  const openocdPath = getOpenOcdPath();
  let content: string;
  try {
    content = generateCortexDebugLaunchJson(existingContent, {
      openocdPath,
      armToolchainPath: getArmToolchainPath(),
      target,
      probe,
      searchDirs: await findOpenOcdSearchDirs(openocdPath)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(message);
    return;
  }
  await mkdir(join(root, '.vscode'), { recursive: true });
  await writeFile(launchPath, content, 'utf8');
  vscode.window.showInformationMessage(
    `Generated Cortex-Debug configuration for ${target.label} with ${probe.label}.`
  );
}

async function generateFlashScriptOnly(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open an MCU project folder before generating a flash script.');
    return;
  }
  const target = await selectFlashTarget();
  if (!target) {
    return;
  }
  const probe = await selectFlashProbe();
  if (!probe) {
    return;
  }

  const root = workspaceFolder.uri.fsPath;
  const flashPath = join(root, 'flash.py');
  if (await exists(flashPath)) {
    const action = await vscode.window.showWarningMessage(
      'flash.py already exists. Overwrite it?',
      'Overwrite',
      'Cancel'
    );
    if (action !== 'Overwrite') {
      return;
    }
  }
  await writeFile(flashPath, generateFlashScript(projectNameFromRoot(root), target, probe, getOpenOcdPath()), 'utf8');
  vscode.window.showInformationMessage(`Generated OpenOCD flash.py for ${target.label} with ${probe.label}.`);
}

async function generateProject(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open an MCU project folder before generating CMake.');
    return;
  }

  const profile = await selectDeviceProfile();
  if (!profile) {
    return;
  }

  const root = workspaceFolder.uri.fsPath;
  const project = await scanProject(root);
  if (project.sources.length === 0) {
    vscode.window.showErrorMessage('No C/C++ or assembly source files were found in the workspace.');
    return;
  }

  const projectName = projectNameFromRoot(root);
  const cmakePath = join(root, 'CMakeLists.txt');
  const existingCMakeContent = await exists(cmakePath)
    ? await readFile(cmakePath, 'utf8')
    : undefined;
  const initialFiles: GeneratedFile[] = [{
    path: cmakePath,
    content: generateCMakeLists(projectName, project, profile, existingCMakeContent)
  }];
  const generateFlash = await shouldGenerateFlashScript();
  if (generateFlash === undefined) {
    return;
  }
  const flashTarget = generateFlash ? getFlashTargetProfileForDevice(profile) : undefined;
  const flashProbe = generateFlash ? await selectFlashProbe() : undefined;
  if (generateFlash && !flashProbe) {
    return;
  }
  const openocdPath = getOpenOcdPath();
  const generatedFiles = createGeneratedFiles(root, profile.part, project, initialFiles, flashTarget, flashProbe, openocdPath);
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
      existingFiles.map(relativePath),
      flashTarget && flashProbe ? {
        script: 'flash.py',
        probe: flashProbe.id,
        interfaceConfig: flashProbe.interfaceConfig,
        openocdPath,
        target: flashTarget.targetConfig,
        transport: flashTarget.transport
      } : undefined
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
    vscode.commands.registerCommand('mcuCmake.generate', () => generateProject()),
    vscode.commands.registerCommand('mcuCmake.generateFlashScript', () => generateFlashScriptOnly()),
    vscode.commands.registerCommand('mcuCmake.generateDebugConfiguration', () => generateDebugConfigurationOnly())
  );
}

export function deactivate(): void {
  // No resources need explicit cleanup.
}
