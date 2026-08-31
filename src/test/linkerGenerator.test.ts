import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeviceProfile } from '../devices/deviceProfiles';
import { generateLinkerScript } from '../generator/linkerGenerator';

test('generates a linker memory map for GD32F103C8T6', () => {
  const linker = generateLinkerScript(getDeviceProfile('GD32F103C8T6'));

  assert.match(linker, /FLASH \(rx\).*ORIGIN = 0x08000000.*LENGTH = 64K/s);
  assert.match(linker, /RAM \(rw\).*ORIGIN = 0x20000000.*LENGTH = 20K/s);
  assert.doesNotMatch(linker, /RAM \(xrw\)/);
  assert.match(linker, /KEEP\(\*\(\.isr_vector\)\)/);
  assert.match(linker, /ENTRY\(Reset_Handler\)/);
  assert.match(linker, /_sidata = LOADADDR\(\.data\)/);
  assert.match(linker, /_sdata = \.[\s\S]*_edata = \./);
  assert.match(linker, /\.ARM\.extab \(READONLY\)/);
  assert.match(linker, /\.ARM \(READONLY\)/);
  assert.match(linker, /\.preinit_array \(READONLY\)/);
  assert.match(linker, /\.init_array \(READONLY\)/);
  assert.match(linker, /\.fini_array \(READONLY\)/);
  assert.match(linker, /PROVIDE_HIDDEN\(__preinit_array_start/);
  assert.match(linker, /PROVIDE_HIDDEN\(__init_array_end/);
  assert.match(linker, /ASSERT\(/);
});

test('generates the STM32F407VGT6 memory map without an RWX RAM segment', () => {
  const linker = generateLinkerScript(getDeviceProfile('STM32F407VGT6'));

  assert.match(linker, /FLASH \(rx\).*ORIGIN = 0x08000000.*LENGTH = 1024K/s);
  assert.match(linker, /RAM \(rw\).*ORIGIN = 0x20000000.*LENGTH = 128K/s);
  assert.match(linker, /CCMRAM \(rw\).*ORIGIN = 0x10000000.*LENGTH = 64K/s);
  assert.doesNotMatch(linker, /RAM \(xrw\)/);
  assert.match(linker, /ASSERT\(_ebss \+ _Min_Heap_Size \+ _Min_Stack_Size/);
});

test('generates the GD32F450VGT6 memory map', () => {
  const linker = generateLinkerScript(getDeviceProfile('GD32F450VGT6'));

  assert.match(linker, /FLASH \(rx\).*ORIGIN = 0x08000000.*LENGTH = 1024K/s);
  assert.match(linker, /RAM \(rw\).*ORIGIN = 0x20000000.*LENGTH = 256K/s);
});

test('generates explicit CCMRAM for all STM32F4 memory variants', () => {
  const linker = generateLinkerScript(getDeviceProfile('STM32F405RGT6'));

  assert.match(linker, /FLASH \(rx\).*LENGTH = 1024K/s);
  assert.match(linker, /RAM \(rw\).*LENGTH = 128K/s);
  assert.match(linker, /CCMRAM \(rw\).*LENGTH = 64K/s);
});

test('generates explicit TCMSRAM for GD32F407', () => {
  const linker = generateLinkerScript(getDeviceProfile('GD32F407VGT6'));

  assert.match(linker, /RAM \(rw\).*LENGTH = 192K/s);
  assert.match(linker, /TCMSRAM \(rwx\).*LENGTH = 64K/s);
});
