export function generateCMakePresets(toolchainFileName = 'gd32-toolchain.cmake'): string {
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
          CMAKE_TOOLCHAIN_FILE: '${sourceDir}/cmake/' + toolchainFileName
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
