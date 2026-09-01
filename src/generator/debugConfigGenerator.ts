import type { FlashProbeProfile } from '../flash/probeProfiles';
import type { FlashTargetProfile } from '../flash/targets/targetProfiles';

const generatedConfigurationName = 'CMake-Embedded OpenOCD';

export interface CortexDebugConfigurationOptions {
  openocdPath: string;
  armToolchainPath?: string;
  target: FlashTargetProfile;
  probe: FlashProbeProfile;
  searchDirs?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function removeJsonComments(source: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (inString) {
      result += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
    } else if (character === '/' && next === '/') {
      index += 1;
      while (index + 1 < source.length && source[index + 1] !== '\n') {
        index += 1;
      }
      result += '\n';
    } else if (character === '/' && next === '*') {
      index += 2;
      while (index + 1 < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1;
      }
      index += 1;
      result += ' ';
    } else {
      result += character;
    }
  }
  return result;
}

function removeTrailingCommas(source: string): string {
  let result = '';
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (inString) {
      result += character;
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      result += character;
      continue;
    }
    if (character === ',') {
      let lookahead = index + 1;
      while (/\s/.test(source[lookahead] ?? '')) {
        lookahead += 1;
      }
      if (source[lookahead] === '}' || source[lookahead] === ']') {
        continue;
      }
    }
    result += character;
  }
  return result;
}

function parseJsonc(source: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(removeTrailingCommas(removeJsonComments(source)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to parse .vscode/launch.json: ${message}`);
  }
  if (!isRecord(value)) {
    throw new Error('Unable to parse .vscode/launch.json: the root must be an object');
  }
  if (value.configurations !== undefined && !Array.isArray(value.configurations)) {
    throw new Error('Unable to parse .vscode/launch.json: configurations must be an array');
  }
  return value;
}

function createConfiguration(options: CortexDebugConfigurationOptions): Record<string, unknown> {
  const configuration: Record<string, unknown> = {
    name: generatedConfigurationName,
    type: 'cortex-debug',
    request: 'launch',
    cwd: '${workspaceRoot}',
    executable: '${command:cmake.launchTargetPath}',
    servertype: 'openocd',
    configFiles: [options.probe.interfaceConfig, options.target.targetConfig],
    runToEntryPoint: 'main',
    showDevDebugOutput: 'none',
    toolchainPrefix: 'arm-none-eabi'
  };
  const openocdPath = options.openocdPath.trim();
  if (openocdPath && openocdPath !== 'openocd') {
    configuration.serverpath = openocdPath;
  }
  if (options.target.transport !== 'swd') {
    configuration.openOCDLaunchCommands = [`transport select ${options.target.transport}`];
  }
  if (options.armToolchainPath?.trim()) {
    configuration.armToolchainPath = options.armToolchainPath.trim();
  }
  if (options.searchDirs && options.searchDirs.length > 0) {
    configuration.searchDir = [...options.searchDirs];
  }
  return configuration;
}

export function generateCortexDebugLaunchJson(
  existingContent: string | undefined,
  options: CortexDebugConfigurationOptions
): string {
  const document = existingContent?.trim()
    ? parseJsonc(existingContent)
    : { version: '0.2.0', configurations: [] as unknown[] };
  const configurations = Array.isArray(document.configurations) ? document.configurations : [];
  document.version = typeof document.version === 'string' ? document.version : '0.2.0';
  document.configurations = configurations.filter((configuration) => (
    !isRecord(configuration) || configuration.name !== generatedConfigurationName
  ));
  (document.configurations as unknown[]).push(createConfiguration(options));
  return `${JSON.stringify(document, null, 2)}\n`;
}
