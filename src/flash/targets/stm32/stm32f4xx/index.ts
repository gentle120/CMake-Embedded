import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32f4xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32f4xx', label: 'STM32F4xx', vendor: 'STM32', series: 'F4xx', targetConfig: 'target/stm32f4x.cfg', transport: 'swd', flashBase: 0x08000000 }];
