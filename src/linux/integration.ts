/**
 * Visual Studio Code integration for the Linux direction.
 *
 * Mirrors the MCU integration, but points CMake Tools and the C/C++ extension at
 * the cross compiler and compile database of the selected Linux toolchain. The
 * build directory comes from the generated presets: build/debug.
 */

import type { LinuxToolchain } from './types';
import { getLinuxToolchainDefaults } from './types';

export interface LinuxWorkspaceIntegration {
  cmakeTools: {
    preset: string;
    configurePreset: string;
    buildPreset: string;
    settingsFile: string;
  };
  cppTools: {
    configurationSource: string;
    compileCommands: string;
    dimInactiveRegions: boolean;
  };
}

type CppConfiguration = Record<string, unknown>;

interface CppProperties {
  configurations?: unknown;
  version?: unknown;
  [key: string]: unknown;
}

/** Compile database location relative to the workspace root. */
export const linuxCompileCommandsPath = 'build/debug/compile_commands.json';

export function getLinuxWorkspaceIntegration(): LinuxWorkspaceIntegration {
  return {
    cmakeTools: {
      preset: 'debug',
      configurePreset: 'debug',
      buildPreset: 'debug',
      settingsFile: '.vscode/settings.json'
    },
    cppTools: {
      configurationSource: 'CMake compile_commands.json',
      compileCommands: linuxCompileCommandsPath,
      dimInactiveRegions: true
    }
  };
}

export function getLinuxWorkspaceSettings(): Record<string, string | boolean> {
  return {
    // The generated CMakeLists.txt and CMakePresets.json always live in the workspace root,
    // so a stale source directory would hide the generated presets from CMake Tools.
    'cmake.sourceDirectory': '${workspaceFolder}',
    'cmake.useCMakePresets': 'always',
    'cmake.configureOnOpen': true,
    'C_Cpp.intelliSenseEngine': 'default',
    'C_Cpp.default.compileCommands': `\${workspaceFolder}/${linuxCompileCommandsPath}`,
    'C_Cpp.dimInactiveRegions': true
  };
}

function configureEntry(entry: CppConfiguration, toolchain: LinuxToolchain): CppConfiguration {
  const configured = { ...entry };
  const compiler = `${toolchain.compilerPrefix}gcc`;
  configured.name = `Linux GCC (${compiler})`;
  configured.compilerPath = compiler;
  configured.compileCommands = `\${workspaceFolder}/${linuxCompileCommandsPath}`;
  configured.intelliSenseMode = getLinuxToolchainDefaults(toolchain.family).intelliSenseMode;
  delete configured.configurationProvider;

  if (Array.isArray(configured.compilerArgs)) {
    const compilerArgs = configured.compilerArgs.filter(
      (argument): argument is string => typeof argument === 'string' && argument.length > 0
    );
    if (compilerArgs.length === 0) {
      delete configured.compilerArgs;
    } else {
      configured.compilerArgs = compilerArgs;
    }
  }

  return configured;
}

export function configureLinuxCppProperties(
  content: string | undefined,
  toolchain: LinuxToolchain
): string {
  const properties: CppProperties = content
    ? JSON.parse(content) as CppProperties
    : { version: 4 };

  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new Error('C/C++ properties must be a JSON object.');
  }

  const configurations = properties.configurations;
  if (configurations === undefined) {
    properties.configurations = [configureEntry({ name: 'Linux' }, toolchain)];
  } else if (Array.isArray(configurations)) {
    properties.configurations = configurations.map((configuration) => {
      if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
        throw new Error('C/C++ configuration entries must be JSON objects.');
      }
      return configureEntry(configuration as CppConfiguration, toolchain);
    });
  } else {
    throw new Error('C/C++ configurations must be a JSON array.');
  }

  properties.version = 4;
  return `${JSON.stringify(properties, null, 4)}\n`;
}
