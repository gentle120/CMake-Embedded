export interface MemoryRegion {
  origin: number;
  length: number;
}

export type DeviceSeries = 'F1x' | 'F4x' | 'L4x';
export type DeviceVendor = 'STM' | 'GD';

export interface AdditionalMemoryRegion {
  name: string;
  attributes: 'rx' | 'rw' | 'rwx';
  origin: number;
  length: number;
}

export interface DeviceProfile {
  part: string;
  vendor: DeviceVendor;
  series: DeviceSeries;
  family: string;
  core: string;
  architecture: 'arm';
  toolchainPrefix: string;
  defines: string[];
  compilerFlags: string[];
  flash: MemoryRegion;
  ram: MemoryRegion;
  additionalMemory?: AdditionalMemoryRegion[];
  linkerFileName: string;
  gnuStartupFileName: string;
  toolchainFileName: string;
  interruptHandlers: string[];
  debugTarget?: string;
}

import { gd32Profiles } from './gd32';
import { stm32Profiles } from './stm32';
import { validateDeviceProfile } from './profileValidation';

const allProfiles = [...gd32Profiles, ...stm32Profiles];
const profiles: Record<string, DeviceProfile> = {};
for (const profile of allProfiles) {
  validateDeviceProfile(profile);
  const key = profile.part.toUpperCase();
  if (profiles[key]) {
    throw new Error(`Invalid MCU profile ${profile.part}: duplicate part`);
  }
  profiles[key] = profile;
}

function copyProfile(profile: DeviceProfile): DeviceProfile {
  return {
    ...profile,
    defines: [...profile.defines],
    compilerFlags: [...profile.compilerFlags],
    interruptHandlers: [...profile.interruptHandlers],
    flash: { ...profile.flash },
    ram: { ...profile.ram },
    additionalMemory: profile.additionalMemory?.map((region) => ({ ...region }))
  };
}

export function listDeviceProfiles(): DeviceProfile[] {
  return Object.values(profiles).map(copyProfile);
}

export function getDeviceProfile(part: string): DeviceProfile {
  const profile = profiles[part.trim().toUpperCase()];
  if (!profile) {
    throw new Error(`Unsupported MCU: ${part}`);
  }
  return copyProfile(profile);
}
