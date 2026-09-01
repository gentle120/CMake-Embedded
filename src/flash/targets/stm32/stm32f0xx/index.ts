import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32f0xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32f0xx', label: 'STM32F0xx', vendor: 'STM32', series: 'F0xx', targetConfig: 'target/stm32f0x.cfg', transport: 'swd', flashBase: 0x08000000 }];
