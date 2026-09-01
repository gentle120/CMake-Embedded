import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32l5xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32l5xx', label: 'STM32L5xx', vendor: 'STM32', series: 'L5xx', targetConfig: 'target/stm32l5x.cfg', transport: 'swd', flashBase: 0x08000000 }];
