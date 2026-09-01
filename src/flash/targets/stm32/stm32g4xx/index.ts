import type { FlashTargetProfile } from '../../targetProfiles';
export const stm32g4xxFlashTargets: FlashTargetProfile[] = [{ id: 'stm32g4xx', label: 'STM32G4xx', vendor: 'STM32', series: 'G4xx', targetConfig: 'target/stm32g4x.cfg', transport: 'swd', flashBase: 0x08000000 }];
