export function generateCMakePresets(): string {
  return `${JSON.stringify({
    version: 3,
    configurePresets: [
      {
        name: 'debug',
        displayName: 'Debug',
        generator: 'Ninja',
        binaryDir: '${sourceDir}/build/debug',
        cacheVariables: {
          CMAKE_BUILD_TYPE: 'Debug',
          CMAKE_TOOLCHAIN_FILE: '${sourceDir}/cmake/gd32-toolchain.cmake'
        }
      }
    ],
    buildPresets: [
      {
        name: 'debug',
        configurePreset: 'debug'
      }
    ]
  }, null, 2)}\n`;
}
