type CppConfiguration = Record<string, unknown>;

interface CppProperties {
  configurations?: unknown;
  version?: unknown;
  [key: string]: unknown;
}

const compileCommandsPath = '${workspaceFolder}/build/debug/compile_commands.json';

function configureEntry(entry: CppConfiguration): CppConfiguration {
  const configured = { ...entry };
  configured.name = 'Desktop C/C++';
  configured.compileCommands = compileCommandsPath;
  configured.intelliSenseMode = '${default}';
  delete configured.compilerPath;
  delete configured.compilerArgs;
  delete configured.configurationProvider;
  return configured;
}

export function configureNativeCppProperties(content: string | undefined): string {
  const properties: CppProperties = content
    ? JSON.parse(content) as CppProperties
    : { version: 4 };

  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new Error('C/C++ properties must be a JSON object.');
  }

  const configurations = properties.configurations;
  if (configurations === undefined) {
    properties.configurations = [configureEntry({ name: 'Desktop C/C++' })];
  } else if (Array.isArray(configurations)) {
    properties.configurations = configurations.map((configuration) => {
      if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) {
        throw new Error('C/C++ configuration entries must be JSON objects.');
      }
      return configureEntry(configuration as CppConfiguration);
    });
  } else {
    throw new Error('C/C++ configurations must be a JSON array.');
  }

  properties.version = 4;
  return `${JSON.stringify(properties, null, 4)}\n`;
}

export function getNativeWorkspaceSettings(): Record<string, string | boolean> {
  return {
    'cmake.sourceDirectory': '${workspaceFolder}',
    'cmake.useCMakePresets': 'always',
    'cmake.configureOnOpen': true,
    'C_Cpp.intelliSenseEngine': 'default',
    'C_Cpp.default.compileCommands': compileCommandsPath,
    'C_Cpp.dimInactiveRegions': true
  };
}
