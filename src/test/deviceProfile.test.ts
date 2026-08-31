import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeviceProfile } from '../devices/deviceProfiles';

test('provides the GD32F103C8T6 build profile', () => {
  const profile = getDeviceProfile('GD32F103C8T6');

  assert.equal(profile.part, 'GD32F103C8T6');
  assert.equal(profile.core, 'cortex-m3');
  assert.equal(profile.flash.origin, 0x08000000);
  assert.equal(profile.flash.length, 64 * 1024);
  assert.equal(profile.ram.length, 20 * 1024);
  assert.deepEqual(profile.defines, ['GD32F10X_MD']);
  assert.equal('gccCompatHeaderFileName' in profile, false);
});

test('rejects an unsupported device', () => {
  assert.throws(() => getDeviceProfile('STM32F103C8T6'), /Unsupported MCU/);
});
