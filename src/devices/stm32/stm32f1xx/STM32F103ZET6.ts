import { createStm32F1Profile, stm32f1HighDensityInterruptHandlers } from '../common';

export const STM32F103ZET6 = createStm32F1Profile(
  'STM32F103ZET6',
  512 * 1024,
  'STM32F103ZET6.ld',
  {
    define: 'STM32F10X_HD',
    ramLength: 64 * 1024,
    gnuStartupFileName: 'startup_stm32f10x_hd.S',
    interruptHandlers: stm32f1HighDensityInterruptHandlers
  }
);
