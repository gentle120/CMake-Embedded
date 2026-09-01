import { createGd32F4Profile } from '../common';

export const GD32F450VGT6 = createGd32F4Profile(
  'GD32F450VGT6', 1024 * 1024, 256 * 1024, 'GD32F450VGT6.ld', 'GD32F450', 'startup_gd32f450_470.S'
);
