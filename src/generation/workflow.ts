import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import type { DeviceProfile } from '../devices/deviceProfiles';
import type { FlashProbeProfile } from '../flash/probeProfiles';
import type { FlashTargetProfile } from '../flash/targets/targetProfiles';
import { generateCMakeLists } from '../generator/cmakeGenerator';
import { generateProjectConfig } from '../generator/configGenerator';
import { generateCortexDebugLaunchJson } from '../generator/debugConfigGenerator';
import { generateFlashScript } from '../generator/flashScriptGenerator';
import { generateLinkerScript } from '../generator/linkerGenerator';
import { generateCMakePresets } from '../generator/presetsGenerator';
import { generateGnuStartup } from '../generator/startupGenerator';
import { generateSyscalls, generateSysmem, runtimeSourceNames } from '../generator/runtimeGenerator';
import { generateToolchainFile } from '../generator/toolchainGenerator';
import { configureCppProperties } from '../integration/cppProperties';
import { getWorkspaceSettings } from '../integration/workspaceSettings';
import {
  configureNativeCppProperties,
  getNativeWorkspaceSettings
} from '../native/integration';
import { generateLinuxCMakeLists } from '../linux/cmakeGenerator';
import { generateLinuxProjectConfig } from '../linux/configGenerator';
import { configureLinuxCppProperties, getLinuxWorkspaceSettings } from '../linux/integration';
import { generateLinuxCMakePresets } from '../linux/presetsGenerator';
import { describeLinuxProject } from '../linux/projectStructure';
import { readLinuxProjectConfig } from '../linux/projectConfig';
import { generateLinuxToolchainFile } from '../linux/toolchainGenerator';
import {
  linuxConfigFileName,
  linuxToolchainFileName,
  type LinuxToolchain,
  type LinuxToolchainHit
} from '../linux/types';
import { generateNativeCMakeLists } from '../native/cmakeGenerator';
import { generateNativeCMakePresets } from '../native/presetsGenerator';
import { nativeConfigFileName, type NativeProjectStructure } from '../native/types';
import type { ProjectDescription } from '../scanner/projectScanner';
import {
  findExistingFiles,
  toWorkspacePath,
  writeGeneratedFiles,
  type GeneratedFile
} from '../shared/generatedFiles';

export interface ProjectWorkflowHost {
  workspaceRoot(): string | undefined;
  scanWorkspace(root: string): Promise<ProjectDescription | undefined>;
  confirmOverwrite(existingFiles: string[]): Promise<boolean>;
  updateSettings(settings: Record<string, string | boolean>): Promise<void>;
}

export interface WorkflowResult {
  kind: 'mcu' | 'linux' | 'native' | 'flash' | 'debug';
  ok: boolean;
  cancelled?: boolean;
  files: string[];
  message: string;
}

export interface McuWorkflowOptions {
  flash?: {
    target: FlashTargetProfile;
    probe: FlashProbeProfile;
    openocdPath: string;
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function projectNameFromRoot(root: string): string {
  const name = basename(root).replace(/[^A-Za-z0-9_-]/g, '_');
  return name || 'firmware';
}

function createMcuFiles(
  root: string,
  projectName: string,
  profile: DeviceProfile,
  project: ProjectDescription,
  existingCMakeContent: string | undefined,
  flash?: McuWorkflowOptions['flash']
): GeneratedFile[] {
  const cmakeDir = join(root, 'cmake');
  const hasSource = (fileName: string): boolean => {
    const sourceBasename = basename(fileName).toLowerCase();
    return project.sources.some((source) => basename(source).toLowerCase() === sourceBasename);
  };
  const files: GeneratedFile[] = [{
    path: join(root, 'CMakeLists.txt'),
    content: generateCMakeLists(projectName, project, profile, existingCMakeContent)
  }];

  if (!hasSource(runtimeSourceNames[0])) {
    files.push({
      path: join(root, runtimeSourceNames[0]),
      content: generateSyscalls()
    });
  }
  if (!hasSource(runtimeSourceNames[1])) {
    files.push({
      path: join(root, runtimeSourceNames[1]),
      content: generateSysmem()
    });
  }
  files.push(
    {
      path: join(root, profile.gnuStartupFileName),
      content: generateGnuStartup(profile)
    },
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
    }
  );
  if (flash) {
    files.push({
      path: join(root, 'flash.py'),
      content: generateFlashScript(projectName, flash.target, flash.probe, flash.openocdPath)
    });
  }
  return files;
}

export async function generateMcuWorkflow(
  host: ProjectWorkflowHost,
  profile: DeviceProfile,
  options: McuWorkflowOptions
): Promise<WorkflowResult> {
  const root = host.workspaceRoot();
  if (!root) {
    return {
      kind: 'mcu',
      ok: false,
      files: [],
      message: '请先打开一个 MCU 工程目录。'
    };
  }
  const project = await host.scanWorkspace(root);
  if (!project) {
    return {
      kind: 'mcu',
      ok: false,
      cancelled: true,
      files: [],
      message: '工作区扫描已取消。'
    };
  }
  if (project.sources.length === 0) {
    return {
      kind: 'mcu',
      ok: false,
      files: [],
      message: '工作区中没有找到 C/C++ 或汇编源文件。'
    };
  }

  const projectName = projectNameFromRoot(root);
  const cmakePath = join(root, 'CMakeLists.txt');
  const existingCMakeContent = await exists(cmakePath)
    ? await readFile(cmakePath, 'utf8')
    : undefined;
  const generatedFiles = createMcuFiles(
    root,
    projectName,
    profile,
    project,
    existingCMakeContent,
    options.flash
  );
  const configPath = join(root, '.mcu-cmake.json');
  const settingsPath = join(root, '.vscode', 'settings.json');
  const cppPropertiesPath = join(root, '.vscode', 'c_cpp_properties.json');
  const existingFiles = await findExistingFiles([
    ...generatedFiles.map((file) => file.path),
    settingsPath,
    cppPropertiesPath,
    configPath
  ]);
  if (existingFiles.length > 0 && !(await host.confirmOverwrite(existingFiles))) {
    return {
      kind: 'mcu',
      ok: false,
      cancelled: true,
      files: [],
      message: '已取消覆盖。'
    };
  }

  await mkdir(join(root, 'cmake'), { recursive: true });
  await mkdir(join(root, 'system'), { recursive: true });
  await mkdir(join(root, '.vscode'), { recursive: true });
  const configFile: GeneratedFile = {
    path: configPath,
    content: generateProjectConfig(
      projectName,
      profile,
      [
        ...generatedFiles.map((file) => toWorkspacePath(root, file.path)),
        toWorkspacePath(root, settingsPath),
        toWorkspacePath(root, cppPropertiesPath)
      ],
      existingFiles.map((filePath) => toWorkspacePath(root, filePath)),
      options.flash
        ? {
            script: 'flash.py',
            probe: options.flash.probe.id,
            interfaceConfig: options.flash.probe.interfaceConfig,
            openocdPath: options.flash.openocdPath,
            target: options.flash.target.targetConfig,
            transport: options.flash.target.transport
          }
        : undefined
    )
  };
  const cppPropertiesContent = await exists(cppPropertiesPath)
    ? await readFile(cppPropertiesPath, 'utf8')
    : undefined;
  const cppPropertiesFile: GeneratedFile = {
    path: cppPropertiesPath,
    content: configureCppProperties(cppPropertiesContent)
  };
  await writeGeneratedFiles([...generatedFiles, configFile, cppPropertiesFile]);
  await host.updateSettings(getWorkspaceSettings());
  return {
    kind: 'mcu',
    ok: true,
    files: [
      ...generatedFiles,
      configFile,
      cppPropertiesFile,
      { path: settingsPath, content: '' }
    ].map((file) => toWorkspacePath(root, file.path)),
    message: `已为 ${profile.part} 生成 CMake 工程，共扫描到 ${project.sources.length} 个源文件。`
  };
}

export async function generateLinuxWorkflow(
  host: ProjectWorkflowHost,
  toolchain: LinuxToolchain | LinuxToolchainHit
): Promise<WorkflowResult> {
  const root = host.workspaceRoot();
  if (!root) {
    return {
      kind: 'linux',
      ok: false,
      files: [],
      message: '请先打开一个工程目录。'
    };
  }
  const project = await host.scanWorkspace(root);
  if (!project) {
    return {
      kind: 'linux',
      ok: false,
      cancelled: true,
      files: [],
      message: '工作区扫描已取消。'
    };
  }
  if (project.sources.length === 0) {
    return {
      kind: 'linux',
      ok: false,
      files: [],
      message: '工作区中没有找到 C/C++ 或汇编源文件。'
    };
  }

  const configPath = join(root, linuxConfigFileName);
  const saved = await readLinuxProjectConfig(configPath);
  const structure = describeLinuxProject(
    project,
    projectNameFromRoot(root),
    saved?.defines ?? []
  );
  const cmakePath = join(root, 'CMakeLists.txt');
  const existingCMakeContent = await exists(cmakePath)
    ? await readFile(cmakePath, 'utf8')
    : undefined;
  const generatedFiles: GeneratedFile[] = [
    {
      path: cmakePath,
      content: generateLinuxCMakeLists(structure, existingCMakeContent)
    },
    {
      path: join(root, 'CMakePresets.json'),
      content: generateLinuxCMakePresets()
    },
    {
      path: join(root, 'cmake', linuxToolchainFileName),
      content: generateLinuxToolchainFile(toolchain)
    }
  ];
  const settingsPath = join(root, '.vscode', 'settings.json');
  const cppPropertiesPath = join(root, '.vscode', 'c_cpp_properties.json');
  const existingFiles = await findExistingFiles([
    ...generatedFiles.map((file) => file.path),
    settingsPath,
    cppPropertiesPath,
    configPath
  ]);
  if (existingFiles.length > 0 && !(await host.confirmOverwrite(existingFiles))) {
    return {
      kind: 'linux',
      ok: false,
      cancelled: true,
      files: [],
      message: '已取消覆盖。'
    };
  }

  const configFile: GeneratedFile = {
    path: configPath,
    content: generateLinuxProjectConfig(
      structure.targetName,
      toolchain,
      structure,
      [
        ...generatedFiles.map((file) => toWorkspacePath(root, file.path)),
        toWorkspacePath(root, settingsPath),
        toWorkspacePath(root, cppPropertiesPath)
      ],
      existingFiles.map((filePath) => toWorkspacePath(root, filePath))
    )
  };
  const cppPropertiesContent = await exists(cppPropertiesPath)
    ? await readFile(cppPropertiesPath, 'utf8')
    : undefined;
  const cppPropertiesFile: GeneratedFile = {
    path: cppPropertiesPath,
    content: configureLinuxCppProperties(cppPropertiesContent, toolchain)
  };
  await mkdir(join(root, 'cmake'), { recursive: true });
  await mkdir(join(root, '.vscode'), { recursive: true });
  await writeGeneratedFiles([...generatedFiles, configFile, cppPropertiesFile]);
  await host.updateSettings(getLinuxWorkspaceSettings());
  return {
    kind: 'linux',
    ok: true,
    files: [
      ...generatedFiles,
      configFile,
      cppPropertiesFile,
      { path: settingsPath, content: '' }
    ].map((file) => toWorkspacePath(root, file.path)),
    message: `已生成 Linux 交叉编译工程，共扫描到 ${structure.sources.length} 个源文件。`
  };
}

export async function generateNativeWorkflow(
  host: ProjectWorkflowHost,
  structure: NativeProjectStructure
): Promise<WorkflowResult> {
  const root = host.workspaceRoot();
  if (!root) {
    return {
      kind: 'native',
      ok: false,
      files: [],
      message: '请先打开一个 C/C++ 工程目录。'
    };
  }
  const cmakePath = join(root, 'CMakeLists.txt');
  const existingCMakeContent = await exists(cmakePath)
    ? await readFile(cmakePath, 'utf8')
    : undefined;
  const generatedFiles: GeneratedFile[] = [
    {
      path: cmakePath,
      content: generateNativeCMakeLists(structure, existingCMakeContent)
    },
    {
      path: join(root, 'CMakePresets.json'),
      content: generateNativeCMakePresets()
    }
  ];
  const configPath = join(root, nativeConfigFileName);
  const settingsPath = join(root, '.vscode', 'settings.json');
  const cppPropertiesPath = join(root, '.vscode', 'c_cpp_properties.json');
  const existingFiles = await findExistingFiles([
    ...generatedFiles.map((file) => file.path),
    settingsPath,
    cppPropertiesPath,
    configPath
  ]);
  if (existingFiles.length > 0 && !(await host.confirmOverwrite(existingFiles))) {
    return {
      kind: 'native',
      ok: false,
      cancelled: true,
      files: [],
      message: '已取消覆盖。'
    };
  }

  const configFile: GeneratedFile = {
    path: configPath,
    content: `${JSON.stringify({
      projectName: structure.targetName,
      kind: 'native',
      targetType: structure.targetType,
      structure: {
        sourceCount: structure.sources.length,
        includeDirs: structure.includeDirs,
        defines: structure.defines,
        cStandard: structure.cStandard,
        cxxStandard: structure.cxxStandard
      },
      defines: structure.defines,
      generatedFiles: [
        ...generatedFiles.map((file) => toWorkspacePath(root, file.path)),
        toWorkspacePath(root, settingsPath),
        toWorkspacePath(root, cppPropertiesPath)
      ],
      overwrittenFiles: existingFiles.map((filePath) => toWorkspacePath(root, filePath))
    }, null, 2)}\n`
  };
  const cppPropertiesContent = await exists(cppPropertiesPath)
    ? await readFile(cppPropertiesPath, 'utf8')
    : undefined;
  const cppPropertiesFile: GeneratedFile = {
    path: cppPropertiesPath,
    content: configureNativeCppProperties(cppPropertiesContent)
  };
  await mkdir(join(root, '.vscode'), { recursive: true });
  await writeGeneratedFiles([...generatedFiles, configFile, cppPropertiesFile]);
  await host.updateSettings(getNativeWorkspaceSettings());
  return {
    kind: 'native',
    ok: true,
    files: [
      ...generatedFiles,
      configFile,
      cppPropertiesFile,
      { path: settingsPath, content: '' }
    ].map((file) => toWorkspacePath(root, file.path)),
    message: `已生成普通 C/C++ CMake 工程，共扫描到 ${structure.sources.length} 个源文件。`
  };
}

export async function generateFlashWorkflow(
  host: ProjectWorkflowHost,
  target: FlashTargetProfile,
  probe: FlashProbeProfile,
  openocdPath: string
): Promise<WorkflowResult> {
  const root = host.workspaceRoot();
  if (!root) {
    return {
      kind: 'flash',
      ok: false,
      files: [],
      message: '请先打开一个 MCU 工程目录。'
    };
  }
  const flashPath = join(root, 'flash.py');
  const existingFiles = await findExistingFiles([flashPath]);
  if (existingFiles.length > 0 && !(await host.confirmOverwrite(existingFiles))) {
    return {
      kind: 'flash',
      ok: false,
      cancelled: true,
      files: [],
      message: '已取消覆盖 flash.py。'
    };
  }
  await writeFile(
    flashPath,
    generateFlashScript(projectNameFromRoot(root), target, probe, openocdPath),
    'utf8'
  );
  return {
    kind: 'flash',
    ok: true,
    files: ['flash.py'],
    message: `已生成 ${target.label} 的 OpenOCD 烧录脚本。`
  };
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

export async function generateDebugWorkflow(
  host: ProjectWorkflowHost,
  target: FlashTargetProfile,
  probe: FlashProbeProfile,
  openocdPath: string,
  armToolchainPath?: string
): Promise<WorkflowResult> {
  const root = host.workspaceRoot();
  if (!root) {
    return {
      kind: 'debug',
      ok: false,
      files: [],
      message: '请先打开一个 MCU 工程目录。'
    };
  }
  const launchPath = join(root, '.vscode', 'launch.json');
  const existingContent = await exists(launchPath)
    ? await readFile(launchPath, 'utf8')
    : undefined;
  const content = generateCortexDebugLaunchJson(existingContent, {
    openocdPath,
    armToolchainPath,
    target,
    probe,
    searchDirs: await findOpenOcdSearchDirs(openocdPath)
  });
  await mkdir(join(root, '.vscode'), { recursive: true });
  await writeFile(launchPath, content, 'utf8');
  return {
    kind: 'debug',
    ok: true,
    files: ['.vscode/launch.json'],
    message: `已生成 ${target.label} 和 ${probe.label} 的 Cortex-Debug 配置。`
  };
}
