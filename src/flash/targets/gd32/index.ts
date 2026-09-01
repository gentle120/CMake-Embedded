import { gd32e23xFlashTargets } from './gd32e23x';
import { gd32f1xxFlashTargets } from './gd32f1xx';
import { gd32f4xxFlashTargets } from './gd32f4xx';
import { gd32vf103FlashTargets } from './gd32vf103';

export const gd32FlashTargets = [
  ...gd32e23xFlashTargets, ...gd32f1xxFlashTargets,
  ...gd32f4xxFlashTargets, ...gd32vf103FlashTargets
];
