import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32u5xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32u5xx', label: 'STM32U5xx', vendor: 'STM32', series: 'U5xx', targetConfig: 'target/stm32u5x.cfg', transport: 'swd', flashBase: 0x08000000 }];
