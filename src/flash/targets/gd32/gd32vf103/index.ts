import type { FlashTargetProfile } from '../../targetProfiles';
export const gd32vf103FlashTargets: FlashTargetProfile[] = [{ id: 'gd32vf103', label: 'GD32VF103', vendor: 'GD32', series: 'VF103', targetConfig: 'target/gd32vf103.cfg', transport: 'swd', flashBase: 0x08000000 }];
