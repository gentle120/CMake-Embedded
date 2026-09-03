import { createStm32L4Profile, stm32l4ShortInterruptHandlers } from '../common';

export const STM32L476RGT6 = createStm32L4Profile(
  'STM32L476RGT6',
  'STM32L476RGT6.ld',
  {
    define: 'STM32L476xx',
    flashLength: 1024 * 1024,
    ramLength: 96 * 1024,
    additionalMemory: [{ name: 'RAM2', attributes: 'rw', origin: 0x10000000, length: 32 * 1024 }],
    gnuStartupFileName: 'startup_stm32l476xx.S',
    interruptHandlers: stm32l4ShortInterruptHandlers
  }
);
