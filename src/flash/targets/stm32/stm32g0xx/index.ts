import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32g0xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32g0xx', label: 'STM32G0xx', vendor: 'STM32', series: 'G0xx', targetConfig: 'target/stm32g0x.cfg', transport: 'swd', flashBase: 0x08000000 }];
