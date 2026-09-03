import { createGd32F1Profile, gd32f1HighDensityInterruptHandlers } from '../common';

export const GD32F103RCT6 = createGd32F1Profile(
  'GD32F103RCT6',
  256 * 1024,
  'GD32F103RCT6.ld',
  {
    define: 'GD32F10X_HD',
    ramLength: 48 * 1024,
    gnuStartupFileName: 'startup_gd32f10x_hd.S',
    interruptHandlers: gd32f1HighDensityInterruptHandlers
  }
);
