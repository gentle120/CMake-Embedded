import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeviceProfile } from '../devices/deviceProfiles';
import { generateGnuStartup } from '../generator/startupGenerator';

test('generates a GNU assembler startup file for GD32F103C8T6', () => {
  const startup = generateGnuStartup(getDeviceProfile('GD32F103C8T6'));

  assert.match(startup, /\.section \.isr_vector/);
  assert.match(startup, /\.word _estack/);
  assert.match(startup, /\.global Reset_Handler/);
  assert.match(startup, /bl SystemInit/);
  assert.match(startup, /bl __libc_init_array/);
  assert.match(startup, /bl SystemInit[\s\S]*ldr r0, =_sidata[\s\S]*bl __libc_init_array[\s\S]*bl main/);
  assert.match(startup, /\.weak USART0_IRQHandler/);
});
