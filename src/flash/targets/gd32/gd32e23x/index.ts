import type { FlashTargetProfile } from '../../targetProfiles';
export const gd32e23xFlashTargets: FlashTargetProfile[] = [{ id: 'gd32e23x', label: 'GD32E23x', vendor: 'GD32', series: 'E23x', targetConfig: 'target/gd32e23x.cfg', transport: 'swd', flashBase: 0x08000000 }];
