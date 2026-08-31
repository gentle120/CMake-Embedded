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
