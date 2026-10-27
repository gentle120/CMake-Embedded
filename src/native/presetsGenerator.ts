export function generateNativeCMakePresets(): string {
  const configurePreset = (name: string, displayName: string): Record<string, unknown> => ({
    name,
    displayName,
    generator: 'Ninja',
    binaryDir: `\${sourceDir}/build/${name}`,
    cacheVariables: {
      CMAKE_BUILD_TYPE: displayName,
      CMAKE_EXPORT_COMPILE_COMMANDS: 'ON'
    }
  });

  return `${JSON.stringify({
    version: 3,
    configurePresets: [
      configurePreset('debug', 'Debug'),
      configurePreset('release', 'Release')
    ],
    buildPresets: [
      { name: 'debug', configurePreset: 'debug' },
      { name: 'release', configurePreset: 'release' }
    ]
  }, null, 2)}\n`;
}
