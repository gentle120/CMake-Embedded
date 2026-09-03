import { stm32FlashTargets } from './stm32';
import { gd32FlashTargets } from './gd32';
import type { DeviceProfile } from '../../devices/deviceProfiles';

export type FlashTargetVendor = 'STM32' | 'GD32';
export type FlashTargetTransport = 'swd' | 'jtag';

export interface FlashTargetProfile {
  id: string;
  label: string;
  vendor: FlashTargetVendor;
  series: string;
  targetConfig: string;
  transport: FlashTargetTransport;
  flashBase: number;
}

const allFlashTargets: FlashTargetProfile[] = [...stm32FlashTargets, ...gd32FlashTargets];
const targetMap = new Map(allFlashTargets.map((target) => [target.id, target]));

export function listFlashTargetProfiles(): FlashTargetProfile[] {
  return allFlashTargets.map((target) => ({ ...target }));
}

export function listFlashTargetVendors(): FlashTargetVendor[] {
  return [...new Set(allFlashTargets.map((target) => target.vendor))];
}

export function listFlashTargetSeries(vendor: FlashTargetVendor): string[] {
  return [...new Set(
    allFlashTargets
      .filter((target) => target.vendor === vendor)
      .map((target) => target.series)
  )];
}

export function listFlashTargetsForSeries(vendor: FlashTargetVendor, series: string): FlashTargetProfile[] {
  return allFlashTargets
    .filter((target) => target.vendor === vendor && target.series === series)
    .map((target) => ({ ...target }));
}

export function getFlashTargetProfile(id: string): FlashTargetProfile {
  const target = targetMap.get(id.trim().toLowerCase());
  if (!target) {
    throw new Error(`Unsupported flash target: ${id}`);
  }
  return { ...target };
}

export function getFlashTargetProfileForDevice(profile: Pick<DeviceProfile, 'vendor' | 'debugTarget'>): FlashTargetProfile {
  if (!profile.debugTarget) {
    throw new Error('The selected MCU has no OpenOCD target mapping.');
  }

  const targetConfig = `target/${profile.debugTarget}.cfg`;
  const target = allFlashTargets.find((candidate) =>
    candidate.vendor === (profile.vendor === 'GD' ? 'GD32' : 'STM32')
    && candidate.targetConfig === targetConfig
  );
  if (!target) {
    throw new Error(`Unsupported OpenOCD target mapping: ${profile.vendor}/${profile.debugTarget}`);
  }
  return { ...target };
}
