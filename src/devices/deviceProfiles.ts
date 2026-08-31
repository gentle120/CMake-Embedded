export interface MemoryRegion {
  origin: number;
  length: number;
}

export interface DeviceProfile {
  part: string;
  family: string;
  core: string;
  architecture: 'arm';
  toolchainPrefix: string;
  defines: string[];
  compilerFlags: string[];
  flash: MemoryRegion;
  ram: MemoryRegion;
  linkerFileName: string;
  gnuStartupFileName: string;
}

const profiles: Record<string, DeviceProfile> = {
  GD32F103C8T6: {
    part: 'GD32F103C8T6',
    family: 'GD32F10x',
    core: 'cortex-m3',
    architecture: 'arm',
    toolchainPrefix: 'arm-none-eabi',
    defines: ['GD32F10X_MD'],
    compilerFlags: ['-mcpu=cortex-m3', '-mthumb'],
    flash: { origin: 0x08000000, length: 64 * 1024 },
    ram: { origin: 0x20000000, length: 20 * 1024 },
    linkerFileName: 'GD32F103C8T6.ld',
    gnuStartupFileName: 'startup_gd32f10x_md.S'
  }
};

export function listDeviceProfiles(): DeviceProfile[] {
  return Object.values(profiles).map((profile) => ({
    ...profile,
    defines: [...profile.defines],
    compilerFlags: [...profile.compilerFlags],
    flash: { ...profile.flash },
    ram: { ...profile.ram }
  }));
}

export function getDeviceProfile(part: string): DeviceProfile {
  const profile = profiles[part.trim().toUpperCase()];
  if (!profile) {
    throw new Error(`Unsupported MCU: ${part}`);
  }
  return profile;
}
