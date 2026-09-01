import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32l0xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32l0xx', label: 'STM32L0xx', vendor: 'STM32', series: 'L0xx', targetConfig: 'target/stm32l0.cfg', transport: 'swd', flashBase: 0x08000000 }];
