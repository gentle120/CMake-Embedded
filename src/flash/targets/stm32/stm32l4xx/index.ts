import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32l4xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32l4xx', label: 'STM32L4xx', vendor: 'STM32', series: 'L4xx', targetConfig: 'target/stm32l4x.cfg', transport: 'swd', flashBase: 0x08000000 }];
