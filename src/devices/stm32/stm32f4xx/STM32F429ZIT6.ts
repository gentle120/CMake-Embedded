import { createStm32F4Profile, stm32f4ExtendedInterruptHandlers } from '../common';

export const STM32F429ZIT6 = createStm32F4Profile(
  'STM32F429ZIT6',
  2 * 1024 * 1024,
  'STM32F429ZIT6.ld',
  'STM32F429xx',
  {
    ramLength: 192 * 1024,
    gnuStartupFileName: 'startup_stm32f429xx.S',
    interruptHandlers: stm32f4ExtendedInterruptHandlers
  }
);
