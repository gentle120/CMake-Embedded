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
  // The data copy and the BSS clear run before SystemInit, as in the ST startup files.
  assert.match(startup, /ldr r0, =_sidata[\s\S]*ldr r1, =_sbss[\s\S]*bl SystemInit[\s\S]*bl __libc_init_array[\s\S]*bl main/);
  // The BSS clear cursor must advance exactly once per word.
  assert.doesNotMatch(startup, /str r3, \[r1\], #4\s*\n\s*adds r1, r1, #4/);
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

test('generates the STM32F1 high-density vector table', () => {
  const startup = generateGnuStartup(getDeviceProfile('STM32F103RCT6'));

  assert.match(startup, /\.word DMA2_Channel4_5_IRQHandler/);
  assert.match(startup, /\.weak FSMC_IRQHandler/);
  assert.doesNotMatch(startup, /PVD_PVM_IRQHandler|DMA0_Channel0_IRQHandler/);
});

test('generates the GD32F1 high-density vector table', () => {
  const startup = generateGnuStartup(getDeviceProfile('GD32F103RCT6'));

  assert.match(startup, /\.word DMA1_Channel3_4_IRQHandler/);
  assert.match(startup, /\.weak ADC2_IRQHandler/);
  assert.doesNotMatch(startup, /DMA1_Channel7_IRQHandler|PVD_IRQHandler/);
});

test('generates the STM32F429 extended vector table', () => {
  const startup = generateGnuStartup(getDeviceProfile('STM32F429ZIT6'));

  assert.match(startup, /\.word LTDC_IRQHandler/);
  assert.match(startup, /\.word LTDC_ER_IRQHandler/);
  assert.match(startup, /\.word DMA2D_IRQHandler/);
  assert.doesNotMatch(startup, /\.weak 0/);
  assert.doesNotMatch(startup, /RCU_IRQHandler|USBFS_IRQHandler/);
});

test('generates the STM32L496 L4 vector table', () => {
  const startup = generateGnuStartup(getDeviceProfile('STM32L496VET6'));

  assert.match(startup, /\.cpu cortex-m4/);
  assert.match(startup, /\.word PVD_PVM_IRQHandler/);
  assert.match(startup, /\.word LPUART1_IRQHandler/);
  assert.match(startup, /\.word QUADSPI_IRQHandler/);
  assert.match(startup, /\.word DMA2D_IRQHandler/);
  assert.doesNotMatch(startup, /DMA1_Stream7_IRQHandler/);
});

test('generates the STM32L476 vector table without L496-only handlers', () => {
  const startup = generateGnuStartup(getDeviceProfile('STM32L476RGT6'));

  assert.match(startup, /\.word LPUART1_IRQHandler/);
  assert.match(startup, /\.word FPU_IRQHandler/);
  assert.doesNotMatch(startup, /DMA2D_IRQHandler|CAN2_TX_IRQHandler/);
});

/** Reads the vector table entries in declaration order. */
function vectorEntries(startup: string): string[] {
  const body = startup.match(/__Vectors:\n([\s\S]*?)\n\.size __Vectors/)?.[1] ?? '';
  return body
    .split('\n')
    .map((line) => line.trim().replace(/^\.word\s+/, ''))
    .filter((entry) => entry.length > 0);
}

test('places the STM32F4 external handlers at their hardware IRQ numbers', () => {
  // IRQ n is the (16 + n)-th entry, after the stack pointer and the reset vector.
  const slot = (part: string, irq: number): string =>
    vectorEntries(generateGnuStartup(getDeviceProfile(part)))[16 + irq];

  for (const part of ['STM32F407VGT6', 'STM32F407ZGT6']) {
    assert.equal(slot(part, 77), 'OTG_HS_IRQHandler');
    assert.equal(slot(part, 78), 'DCMI_IRQHandler');
    // IRQ 79 is the reserved CRYP slot in the ST table and must stay empty,
    // otherwise HASH_RNG and FPU are installed one interrupt too early.
    assert.equal(slot(part, 79), '0');
    assert.equal(slot(part, 80), 'HASH_RNG_IRQHandler');
    assert.equal(slot(part, 81), 'FPU_IRQHandler');
  }

  assert.equal(slot('STM32F429ZIT6', 78), 'DCMI_IRQHandler');
  assert.equal(slot('STM32F429ZIT6', 79), '0');
  assert.equal(slot('STM32F429ZIT6', 80), 'HASH_RNG_IRQHandler');
  assert.equal(slot('STM32F429ZIT6', 81), 'FPU_IRQHandler');
  assert.equal(slot('STM32F429ZIT6', 82), 'UART7_IRQHandler');
  assert.equal(slot('STM32F429ZIT6', 90), 'DMA2D_IRQHandler');
});
