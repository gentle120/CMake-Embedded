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

test('generates the STM32F1 medium-density vector table without GD32 handlers', () => {
  const startup = generateGnuStartup(getDeviceProfile('STM32F103C8T6'));

  assert.match(startup, /\.cpu cortex-m3/);
  assert.match(startup, /\.word USBWakeUp_IRQHandler/);
  assert.match(startup, /\.weak USART3_IRQHandler/);
  assert.doesNotMatch(startup, /RCU_IRQHandler|USBD_WKUP_IRQHandler/);
});

test('generates the STM32F4 vector table with Cortex-M4 assembly settings', () => {
  const startup = generateGnuStartup(getDeviceProfile('STM32F407VGT6'));

  assert.match(startup, /\.cpu cortex-m4/);
  assert.match(startup, /\.word DMA1_Stream7_IRQHandler/);
  assert.match(startup, /\.weak FPU_IRQHandler/);
  assert.doesNotMatch(startup, /USBWakeUp_IRQHandler|RCU_IRQHandler/);
});

test('generates the GD32F4 vector table with GD32-specific handlers', () => {
  const startup = generateGnuStartup(getDeviceProfile('GD32F450VGT6'));

  assert.match(startup, /\.cpu cortex-m4/);
  assert.match(startup, /\.word DMA1_Channel7_IRQHandler/);
  assert.match(startup, /\.weak USART5_IRQHandler/);
  assert.doesNotMatch(startup, /USBWakeUp_IRQHandler/);
});

test('uses the same verified F1 startup table for STM32F103 xB variants', () => {
  const startup = generateGnuStartup(getDeviceProfile('STM32F103VBT6'));

  assert.match(startup, /\.cpu cortex-m3/);
  assert.match(startup, /\.word DMA1_Channel7_IRQHandler/);
  assert.match(startup, /\.word USBWakeUp_IRQHandler/);
});

test('uses the GD32F407 startup table for the GD32F4 variant', () => {
  const startup = generateGnuStartup(getDeviceProfile('GD32F407VGT6'));

  assert.match(startup, /\.cpu cortex-m4/);
  assert.match(startup, /\.word DMA1_Channel7_IRQHandler/);
  assert.match(startup, /\.word FPU_IRQHandler/);
});
