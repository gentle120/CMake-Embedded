import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32f2xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32f2xx', label: 'STM32F2xx', vendor: 'STM32', series: 'F2xx', targetConfig: 'target/stm32f2x.cfg', transport: 'swd', flashBase: 0x08000000 }];
