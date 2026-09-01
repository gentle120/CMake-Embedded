import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32f1xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32f1xx', label: 'STM32F1xx', vendor: 'STM32', series: 'F1xx', targetConfig: 'target/stm32f1x.cfg', transport: 'swd', flashBase: 0x08000000 }];
