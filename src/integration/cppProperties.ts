const compileCommandsPath = '${workspaceFolder}/build/debug/compile_commands.json';

type CppConfiguration = Record<string, unknown>;

interface CppProperties {
  configurations?: unknown;
  version?: unknown;
  [key: string]: unknown;
}

function configureEntry(entry: CppConfiguration): CppConfiguration {
  const configured = { ...entry };
  configured.name = 'ARM GCC (arm-none-eabi)';
  configured.compilerPath = 'arm-none-eabi-gcc';
  configured.compileCommands = compileCommandsPath;
  configured.intelliSenseMode = 'gcc-arm';
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

export function configureCppProperties(content: string | undefined): string {
  const properties: CppProperties = content
    ? JSON.parse(content) as CppProperties
    : { version: 4 };

  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new Error('C/C++ properties must be a JSON object.');
  }

  const configurations = properties.configurations;
  if (configurations === undefined) {
    properties.configurations = [configureEntry({ name: 'MCU' })];
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
