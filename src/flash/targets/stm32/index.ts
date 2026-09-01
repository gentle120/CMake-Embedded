import { stm32f0xxFlashTargets } from './stm32f0xx';
import { stm32f1xxFlashTargets } from './stm32f1xx';
import { stm32f2xxFlashTargets } from './stm32f2xx';
import { stm32f3xxFlashTargets } from './stm32f3xx';
import { stm32f4xxFlashTargets } from './stm32f4xx';
import { stm32f7xxFlashTargets } from './stm32f7xx';
import { stm32g0xxFlashTargets } from './stm32g0xx';
import { stm32g4xxFlashTargets } from './stm32g4xx';
import { stm32h7xxFlashTargets } from './stm32h7xx';
import { stm32l0xxFlashTargets } from './stm32l0xx';
import { stm32l1xxFlashTargets } from './stm32l1xx';
import { stm32l4xxFlashTargets } from './stm32l4xx';
import { stm32l5xxFlashTargets } from './stm32l5xx';
import { stm32u5xxFlashTargets } from './stm32u5xx';
import { stm32wbxxFlashTargets } from './stm32wbxx';
import { stm32wlxxFlashTargets } from './stm32wlxx';

export const stm32FlashTargets = [
  ...stm32f0xxFlashTargets, ...stm32f1xxFlashTargets, ...stm32f2xxFlashTargets,
  ...stm32f3xxFlashTargets, ...stm32f4xxFlashTargets, ...stm32f7xxFlashTargets,
  ...stm32g0xxFlashTargets, ...stm32g4xxFlashTargets, ...stm32h7xxFlashTargets,
  ...stm32l0xxFlashTargets, ...stm32l1xxFlashTargets, ...stm32l4xxFlashTargets,
  ...stm32l5xxFlashTargets, ...stm32u5xxFlashTargets, ...stm32wbxxFlashTargets,
  ...stm32wlxxFlashTargets
];
