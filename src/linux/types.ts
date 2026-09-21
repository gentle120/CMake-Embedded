/**
 * Types for the Linux / SoC cross compilation direction.
 *
 * The supported toolchains are Loongson LoongArch64, ARM aarch64, 32-bit ARM
 * (armv7 hard-float) and RISC-V riscv64. Nothing in this module is shared with
 * the MCU direction.
 */

export type LinuxToolchainFamily = 'arm' | 'arm32' | 'loongson' | 'riscv';

export interface LinuxToolchainDefaults {
  family: LinuxToolchainFamily;
  /** Human readable name for the selection list. */
  label: string;
  /** Value written to CMAKE_SYSTEM_PROCESSOR. */
  processor: string;
  /** Compiler prefix, for example loongarch64-linux-gnu-. */
  compilerPrefix: string;
  /** Architecture flags applied to C, C++ and the linker. */
  targetFlags: string;
  /** Extra flags that only apply to C++. */
  cxxOnlyFlags: string;
  /** C/C++ extension IntelliSense mode used for the generated c_cpp_properties.json. */
  intelliSenseMode: string;
}

const linuxToolchainDefaults: Record<LinuxToolchainFamily, LinuxToolchainDefaults> = {
  loongson: {
    family: 'loongson',
    label: 'Loongson (loongarch64)',
    processor: 'loongarch64',
    compilerPrefix: 'loongarch64-linux-gnu-',
    targetFlags: '-march=loongarch64 -mtune=loongarch64 -fPIC',
    cxxOnlyFlags: '',
    intelliSenseMode: 'linux-gcc-x64'
  },
  arm: {
    family: 'arm',
    label: 'ARM (aarch64)',
    processor: 'aarch64',
    compilerPrefix: 'aarch64-linux-gnu-',
    targetFlags: '-fPIC',
    cxxOnlyFlags: '',
    intelliSenseMode: 'linux-gcc-arm64'
  },
  arm32: {
    family: 'arm32',
    label: 'ARM 32-bit (armv7 hard-float)',
    processor: 'arm',
    compilerPrefix: 'arm-linux-gnueabihf-',
    // The gnueabihf triple already targets armv7-a hard-float; the flags are
    // written out so the generated toolchain file is explicit about the ABI.
    targetFlags: '-march=armv7-a -mfpu=vfpv3-d16 -mfloat-abi=hard -fPIC',
    cxxOnlyFlags: '',
    intelliSenseMode: 'linux-gcc-arm'
  },
  riscv: {
    family: 'riscv',
    label: 'RISC-V (riscv64)',
    processor: 'riscv64',
    compilerPrefix: 'riscv64-linux-gnu-',
    targetFlags: '-march=rv64gc -mabi=lp64d -fPIC',
    cxxOnlyFlags: '',
    // The C/C++ extension has no RISC-V specific mode, so fall back to the generic Linux GCC one.
    intelliSenseMode: 'linux-gcc-x64'
  }
};

/** Selection and display order. */
export const linuxToolchainFamilies: LinuxToolchainFamily[] = ['loongson', 'arm', 'arm32', 'riscv'];

export function getLinuxToolchainDefaults(family: LinuxToolchainFamily): LinuxToolchainDefaults {
  return { ...linuxToolchainDefaults[family] };
}

export function isLinuxToolchainFamily(value: string): value is LinuxToolchainFamily {
  return linuxToolchainFamilies.includes(value as LinuxToolchainFamily);
}

/** How a toolchain was found. */
export type LinuxToolchainSource = 'cross-compile' | 'cc-env' | 'path';

export interface LinuxToolchain {
  family: LinuxToolchainFamily;
  processor: string;
  compilerPrefix: string;
  targetFlags: string;
  cxxOnlyFlags?: string;
  cFlags?: string[];
  cxxFlags?: string[];
  linkerFlags?: string[];
}

export interface LinuxToolchainHit extends LinuxToolchain {
  label: string;
  source: LinuxToolchainSource;
  /** True when the compiler commands were actually located on disk. */
  verified: boolean;
  /** Directory holding the compiler. Diagnostics only, never written to CMake. */
  binDir?: string;
}

export const linuxToolchainFileName = 'linux-toolchain.cmake';
export const linuxConfigFileName = '.linux-cmake.json';

export type LinuxTargetType = 'executable' | 'static' | 'shared';

/**
 * Everything the Linux generators need, derived from a workspace scan exactly
 * like the MCU direction derives its inputs from the selected device profile
 * plus the scan. All paths are relative to the CMake source directory, which is
 * the workspace root.
 */
export interface LinuxProjectStructure {
  /** Source files collected from the workspace scan. */
  sources: string[];
  /** Include roots collected from the workspace scan. */
  includeDirs: string[];
  /** Preprocessor definitions collected from the workspace scan. */
  defines: string[];
  /** Output name used for the executable or library. */
  targetName: string;
  targetType: LinuxTargetType;
  cStandard: number;
  cxxStandard: number;
}
