import type { FlashTargetProfile } from '../../targetProfiles';
export const gd32f4xxFlashTargets: FlashTargetProfile[] = [{ id: 'gd32f4xx', label: 'GD32F4xx', vendor: 'GD32', series: 'F4xx', targetConfig: 'target/stm32f4x.cfg', transport: 'swd', flashBase: 0x08000000 }];
