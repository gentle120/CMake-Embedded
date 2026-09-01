import { createGd32F4Profile } from '../common';

export const GD32F407VGT6 = createGd32F4Profile(
  'GD32F407VGT6', 1024 * 1024, 192 * 1024, 'GD32F407VGT6.ld', 'GD32F407', 'startup_gd32f407_427.S'
);
