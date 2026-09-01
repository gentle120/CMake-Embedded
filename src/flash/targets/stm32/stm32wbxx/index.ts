import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32wbxxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32wbxx', label: 'STM32WBxx', vendor: 'STM32', series: 'WBxx', targetConfig: 'target/stm32wbx.cfg', transport: 'swd', flashBase: 0x08000000 }];
