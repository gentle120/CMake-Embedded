/**
 * Generates cmake/linux-toolchain.cmake for a cross compilation project.
 *
 * Compiler commands are written by name so the file is machine independent and
 * the toolchain is resolved from PATH, exactly like the MCU toolchain file does
 * for arm-none-eabi-gcc.
 */

import {
  getLinuxToolchainDefaults,
  type LinuxToolchain,
  type LinuxToolchainFamily
} from './types';

function cmakeQuote(value: string): string {
  return `"${value.trim().replace(/\\/g, '/').replace(/"/g, '\\"')}"`;
}

function normalizedFlags(flags: string[] | undefined): string[] {
  return [...(flags ?? [])].map((flag) => flag.trim()).filter(Boolean);
}

function flagSuffix(flags: string[]): string {
  return flags.length > 0 ? ` ${flags.join(' ')}` : '';
}

export function createLinuxToolchain(
  family: LinuxToolchainFamily,
  overrides: Partial<LinuxToolchain> = {}
): LinuxToolchain {
  const defaults = getLinuxToolchainDefaults(family);
  return {
    family,
    processor: overrides.processor?.trim() || defaults.processor,
    compilerPrefix: overrides.compilerPrefix?.trim() || defaults.compilerPrefix,
    targetFlags: overrides.targetFlags?.trim() ?? defaults.targetFlags,
    cxxOnlyFlags: overrides.cxxOnlyFlags?.trim() ?? defaults.cxxOnlyFlags,
    cFlags: normalizedFlags(overrides.cFlags),
    cxxFlags: normalizedFlags(overrides.cxxFlags),
    linkerFlags: normalizedFlags(overrides.linkerFlags)
  };
}

export function generateLinuxToolchainFile(toolchain: LinuxToolchain): string {
  const prefix = toolchain.compilerPrefix;
  const cxxOnlyFlags = toolchain.cxxOnlyFlags ? ` ${toolchain.cxxOnlyFlags}` : '';

  const lines = [
    '# Generated for the selected Linux cross toolchain.',
    '# The compiler commands are resolved from PATH, so this file stays machine independent.',
    'set(CMAKE_SYSTEM_NAME Linux)',
    `set(CMAKE_SYSTEM_PROCESSOR ${cmakeQuote(toolchain.processor)})`,
    '',
    `set(CMAKE_C_COMPILER ${prefix}gcc)`,
    `set(CMAKE_CXX_COMPILER ${prefix}g++)`,
    `set(CMAKE_ASM_COMPILER ${prefix}gcc)`,
    `set(CMAKE_AR ${prefix}ar CACHE FILEPATH "ar executable")`,
    `set(CMAKE_RANLIB ${prefix}ranlib CACHE FILEPATH "ranlib executable")`,
    `set(CMAKE_STRIP ${prefix}strip CACHE FILEPATH "strip executable")`,
    `set(CMAKE_SIZE ${prefix}size CACHE FILEPATH "size executable")`,
    '',
    `set(TARGET_FLAGS ${cmakeQuote(toolchain.targetFlags)})`,
    `set(CMAKE_C_FLAGS_INIT "\${TARGET_FLAGS} -Wall -fdata-sections -ffunction-sections${flagSuffix(normalizedFlags(toolchain.cFlags))}")`,
    `set(CMAKE_CXX_FLAGS_INIT "\${TARGET_FLAGS} -Wall -fdata-sections -ffunction-sections${cxxOnlyFlags}${flagSuffix(normalizedFlags(toolchain.cxxFlags))}")`,
    // Assembly must see the same architecture, ABI and PIC settings as C, because
    // Linux user space assembly is normally PIC aware and branches on __PIC__.
    `set(CMAKE_ASM_FLAGS_INIT "\${TARGET_FLAGS}")`,
    '',
    '# Keep the optimization settings in the toolchain.',
    'set(CMAKE_C_FLAGS_DEBUG "-Og -g3")',
    'set(CMAKE_C_FLAGS_RELEASE "-O3 -g0")',
    'set(CMAKE_C_FLAGS_MINSIZEREL "-Os -g0")',
    'set(CMAKE_C_FLAGS_RELWITHDEBINFO "-O3 -g3")',
    '',
    'set(CMAKE_CXX_FLAGS_DEBUG "-Og -g3")',
    'set(CMAKE_CXX_FLAGS_RELEASE "-O3 -g0")',
    'set(CMAKE_CXX_FLAGS_MINSIZEREL "-Os -g0")',
    'set(CMAKE_CXX_FLAGS_RELWITHDEBINFO "-O3 -g3")',
    '',
    `set(CMAKE_EXE_LINKER_FLAGS_INIT "\${TARGET_FLAGS}${flagSuffix(normalizedFlags(toolchain.linkerFlags))} -Wl,--gc-sections -Wl,-Map=\${CMAKE_BINARY_DIR}/\${CMAKE_PROJECT_NAME}.map")`,
    '',
    'set(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY)',
    ''
  ];

  return lines.join('\n');
}
