import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32wlxxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32wlxx', label: 'STM32WLxx', vendor: 'STM32', series: 'WLxx', targetConfig: 'target/stm32wlx.cfg', transport: 'swd', flashBase: 0x08000000 }];
