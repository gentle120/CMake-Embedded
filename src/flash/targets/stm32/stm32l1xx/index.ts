import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32l1xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32l1xx', label: 'STM32L1xx', vendor: 'STM32', series: 'L1xx', targetConfig: 'target/stm32l1.cfg', transport: 'swd', flashBase: 0x08000000 }];
