import type { FlashTargetProfile } from '../../targetProfiles';
export const gd32f1xxFlashTargets: FlashTargetProfile[] = [{ id: 'gd32f1xx', label: 'GD32F1xx', vendor: 'GD32', series: 'F1xx', targetConfig: 'target/stm32f1x.cfg', transport: 'swd', flashBase: 0x08000000 }];
