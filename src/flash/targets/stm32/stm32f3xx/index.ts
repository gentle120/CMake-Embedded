import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32f3xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32f3xx', label: 'STM32F3xx', vendor: 'STM32', series: 'F3xx', targetConfig: 'target/stm32f3x.cfg', transport: 'swd', flashBase: 0x08000000 }];
