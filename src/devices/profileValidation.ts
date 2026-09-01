import type { DeviceProfile } from './deviceProfiles';

export function validateDeviceProfile(profile: DeviceProfile): void {
  const requiredTextFields: Array<keyof DeviceProfile> = [
    'part',
    'vendor',
    'series',
    'family',
    'core',
    'toolchainPrefix',
    'linkerFileName',
    'gnuStartupFileName',
    'toolchainFileName'
  ];
  for (const field of requiredTextFields) {
    if (typeof profile[field] !== 'string' || profile[field].trim().length === 0) {
      throw new Error(`Invalid MCU profile ${profile.part}: ${String(field)} is required`);
    }
  }
  if (!['F1x', 'F4x', 'L4x'].includes(profile.series)) {
    throw new Error(`Invalid MCU profile ${profile.part}: series is unsupported`);
  }
  if (!['STM', 'GD'].includes(profile.vendor)) {
    throw new Error(`Invalid MCU profile ${profile.part}: vendor is unsupported`);
  }
  if (profile.architecture !== 'arm') {
    throw new Error(`Invalid MCU profile ${profile.part}: architecture is unsupported`);
  }
  if (profile.compilerFlags.length === 0) {
    throw new Error(`Invalid MCU profile ${profile.part}: compilerFlags is empty`);
  }
  if (profile.interruptHandlers.length === 0) {
    throw new Error(`Invalid MCU profile ${profile.part}: interruptHandlers is empty`);
  }
  for (const [name, region] of [['flash', profile.flash], ['ram', profile.ram] ] as const) {
    if (!Number.isInteger(region.origin) || region.origin < 0 || !Number.isInteger(region.length) || region.length <= 0) {
      throw new Error(`Invalid MCU profile ${profile.part}: ${name} memory region is invalid`);
    }
  }
  const additionalMemory = profile.additionalMemory ?? [];
  const memoryNames = new Set(['FLASH', 'RAM']);
  for (const region of additionalMemory) {
    const regionName = region.name.trim().toUpperCase();
    if (regionName.length === 0) {
      throw new Error(`Invalid MCU profile ${profile.part}: additionalMemory name is invalid`);
    }
    if (memoryNames.has(regionName)) {
      throw new Error(`Invalid MCU profile ${profile.part}: duplicate memory region`);
    }
    if (!['rx', 'rw', 'rwx'].includes(region.attributes)) {
      throw new Error(`Invalid MCU profile ${profile.part}: additionalMemory attributes are invalid`);
    }
    if (!Number.isInteger(region.origin) || region.origin < 0 || !Number.isInteger(region.length) || region.length <= 0) {
      throw new Error(`Invalid MCU profile ${profile.part}: additionalMemory region is invalid`);
    }
    memoryNames.add(regionName);
  }
  if (new Set(profile.interruptHandlers).size !== profile.interruptHandlers.length) {
    throw new Error(`Invalid MCU profile ${profile.part}: interruptHandlers contains duplicates`);
  }
}
