import { stm32f1xxProfiles } from './stm32f1xx';
import { stm32f4xxProfiles } from './stm32f4xx';
import { stm32l4xxProfiles } from './stm32l4xx';

export const stm32Profiles = [...stm32f1xxProfiles, ...stm32f4xxProfiles, ...stm32l4xxProfiles];
