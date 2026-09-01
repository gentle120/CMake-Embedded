import { stm32FlashTargets } from './stm32';
import { gd32FlashTargets } from './gd32';

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

export function getFlashTargetProfile(id: string): FlashTargetProfile {
  const target = targetMap.get(id.trim().toLowerCase());
  if (!target) {
    throw new Error(`Unsupported flash target: ${id}`);
  }
  return { ...target };
}
