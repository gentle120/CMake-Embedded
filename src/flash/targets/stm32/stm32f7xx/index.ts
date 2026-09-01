import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32f7xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32f7xx', label: 'STM32F7xx', vendor: 'STM32', series: 'F7xx', targetConfig: 'target/stm32f7x.cfg', transport: 'swd', flashBase: 0x08000000 }];
