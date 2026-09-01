import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32h7xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32h7xx', label: 'STM32H7xx', vendor: 'STM32', series: 'H7xx', targetConfig: 'target/stm32h7x.cfg', transport: 'swd', flashBase: 0x08000000 }];
