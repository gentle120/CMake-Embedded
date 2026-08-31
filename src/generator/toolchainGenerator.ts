import type { DeviceProfile } from '../devices/deviceProfiles';

export function generateToolchainFile(profile: DeviceProfile): string {
  const prefix = profile.toolchainPrefix;
  const targetFlags = profile.compilerFlags.join(' ');
  return `set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR arm)

set(CMAKE_C_COMPILER ${prefix}-gcc)
set(CMAKE_CXX_COMPILER ${prefix}-g++)
set(CMAKE_ASM_COMPILER ${prefix}-gcc)
set(CMAKE_OBJCOPY ${prefix}-objcopy CACHE FILEPATH "objcopy executable")
set(CMAKE_SIZE ${prefix}-size CACHE FILEPATH "size executable")

set(TARGET_FLAGS "${targetFlags}")

# MCU-specific compiler and assembler flags.
set(CMAKE_C_FLAGS_INIT "\${TARGET_FLAGS} -Wall -fdata-sections -ffunction-sections -fstack-usage")
set(CMAKE_ASM_FLAGS_INIT "\${TARGET_FLAGS} -x assembler-with-cpp -MMD -MP")

# Keep the optimization settings in the toolchain, as CubeMX does.
set(CMAKE_C_FLAGS_DEBUG "-Og -g3")
set(CMAKE_C_FLAGS_RELEASE "-Os -g0")
set(CMAKE_C_FLAGS_MINSIZEREL "-Os -g0")
set(CMAKE_C_FLAGS_RELWITHDEBINFO "-Og -g3")

set(CMAKE_CXX_FLAGS_DEBUG "-Og -g3")
set(CMAKE_CXX_FLAGS_RELEASE "-Os -g0")
set(CMAKE_CXX_FLAGS_MINSIZEREL "-Os -g0")
set(CMAKE_CXX_FLAGS_RELWITHDEBINFO "-Og -g3")
set(CMAKE_CXX_FLAGS_INIT "\${TARGET_FLAGS} -Wall -fdata-sections -ffunction-sections -fstack-usage -fno-rtti -fno-exceptions -fno-threadsafe-statics")

# Link with the same architecture and the generated MCU memory layout.
set(CMAKE_EXE_LINKER_FLAGS_INIT "\${TARGET_FLAGS} -T\${CMAKE_SOURCE_DIR}/${profile.linkerFileName} --specs=nano.specs -Wl,-Map=\${CMAKE_BINARY_DIR}/\${CMAKE_PROJECT_NAME}.map -Wl,--gc-sections -Wl,--print-memory-usage")

set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)
`;
}
