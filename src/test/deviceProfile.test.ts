import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeviceProfile, listDeviceProfiles } from '../devices/deviceProfiles';
import { validateDeviceProfile } from '../devices/profileValidation';
import {
  listDeviceProfilesForSeries,
  listDeviceSeries,
  listDeviceVendors
} from '../devices/deviceSelection';

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
  assert.throws(() => getDeviceProfile('NOT_A_REAL_MCU'), /Unsupported MCU/);
});

test('lists the initial STM32 and GD32 device profiles', () => {
  assert.deepEqual(
    listDeviceProfiles().map((profile) => profile.part).sort(),
    [
      'GD32F103C8T6',
      'GD32F103CBT6',
      'GD32F103R8T6',
      'GD32F103RBT6',
      'GD32F103RCT6',
      'GD32F407RGT6',
      'GD32F407VGT6',
      'GD32F407ZGT6',
      'GD32F450VGT6',
      'STM32F103C8T6',
      'STM32F103CBT6',
      'STM32F103R8T6',
      'STM32F103RBT6',
      'STM32F103RCT6',
      'STM32F103VBT6',
      'STM32F103ZET6',
      'STM32F405RGT6',
      'STM32F407RGT6',
      'STM32F407VET6',
      'STM32F407VGT6',
      'STM32F407ZGT6',
      'STM32F429ZIT6',
      'STM32L476RGT6',
      'STM32L496VET6'
    ]
  );
});

test('normalizes the selected part name', () => {
  assert.equal(getDeviceProfile(' stm32f407vgt6 ').part, 'STM32F407VGT6');
});

test('builds progressive vendor, series, and device choices', () => {
  const profiles = listDeviceProfiles();

  assert.deepEqual(listDeviceVendors(profiles), ['STM', 'GD']);
  assert.deepEqual(listDeviceSeries(profiles, 'STM'), ['F1x', 'F4x', 'L4x']);
  assert.deepEqual(listDeviceSeries(profiles, 'GD'), ['F1x', 'F4x']);
  assert.deepEqual(
    listDeviceProfilesForSeries(profiles, 'STM', 'F1x').map((profile) => profile.part),
    ['STM32F103C8T6', 'STM32F103CBT6', 'STM32F103R8T6', 'STM32F103RBT6', 'STM32F103RCT6', 'STM32F103VBT6', 'STM32F103ZET6']
  );
});

test('provides verified memory and compiler settings for each initial part', () => {
  const expectations = [
    {
      part: 'STM32F103C8T6',
      family: 'STM32F1xx',
      core: 'cortex-m3',
      flash: 64 * 1024,
      ram: 20 * 1024,
      define: 'STM32F103xB',
      flags: ['-mcpu=cortex-m3', '-mthumb']
    },
    {
      part: 'STM32F407VGT6',
      family: 'STM32F4xx',
      core: 'cortex-m4',
      flash: 1024 * 1024,
      ram: 128 * 1024,
      define: 'STM32F407xx',
      flags: ['-mcpu=cortex-m4', '-mthumb', '-mfpu=fpv4-sp-d16', '-mfloat-abi=hard']
    },
    {
      part: 'GD32F450VGT6',
      family: 'GD32F4xx',
      core: 'cortex-m4',
      flash: 1024 * 1024,
      ram: 256 * 1024,
      define: 'GD32F450',
      flags: ['-mcpu=cortex-m4', '-mthumb', '-mfpu=fpv4-sp-d16', '-mfloat-abi=hard']
    },
    {
      part: 'GD32F103RCT6',
      family: 'GD32F10x',
      core: 'cortex-m3',
      flash: 256 * 1024,
      ram: 48 * 1024,
      define: 'GD32F10X_HD',
      flags: ['-mcpu=cortex-m3', '-mthumb']
    },
    {
      part: 'GD32F407ZGT6',
      family: 'GD32F4xx',
      core: 'cortex-m4',
      flash: 1024 * 1024,
      ram: 192 * 1024,
      define: 'GD32F407',
      flags: ['-mcpu=cortex-m4', '-mthumb', '-mfpu=fpv4-sp-d16', '-mfloat-abi=hard']
    },
    {
      part: 'STM32F103RCT6',
      family: 'STM32F1xx',
      core: 'cortex-m3',
      flash: 256 * 1024,
      ram: 48 * 1024,
      define: 'STM32F10X_HD',
      flags: ['-mcpu=cortex-m3', '-mthumb']
    },
    {
      part: 'STM32F103ZET6',
      family: 'STM32F1xx',
      core: 'cortex-m3',
      flash: 512 * 1024,
      ram: 64 * 1024,
      define: 'STM32F10X_HD',
      flags: ['-mcpu=cortex-m3', '-mthumb']
    },
    {
      part: 'STM32F429ZIT6',
      family: 'STM32F4xx',
      core: 'cortex-m4',
      flash: 2048 * 1024,
      ram: 192 * 1024,
      define: 'STM32F429xx',
      flags: ['-mcpu=cortex-m4', '-mthumb', '-mfpu=fpv4-sp-d16', '-mfloat-abi=hard']
    },
    {
      part: 'STM32L476RGT6',
      family: 'STM32L4xx',
      core: 'cortex-m4',
      flash: 1024 * 1024,
      ram: 96 * 1024,
      define: 'STM32L476xx',
      flags: ['-mcpu=cortex-m4', '-mthumb', '-mfpu=fpv4-sp-d16', '-mfloat-abi=hard']
    }
  ];

  for (const expected of expectations) {
    const profile = getDeviceProfile(expected.part);
    assert.equal(profile.family, expected.family);
    assert.equal(profile.core, expected.core);
    assert.equal(profile.flash.length, expected.flash);
    assert.equal(profile.ram.length, expected.ram);
    assert.ok(profile.defines.includes(expected.define));
    assert.deepEqual(profile.compilerFlags, expected.flags);
  }

  assert.deepEqual(getDeviceProfile('STM32F407VGT6').additionalMemory, [
    { name: 'CCMRAM', attributes: 'rw', origin: 0x10000000, length: 64 * 1024 }
  ]);
  assert.equal(getDeviceProfile('STM32F103CBT6').flash.length, 128 * 1024);
  assert.equal(getDeviceProfile('GD32F103RBT6').flash.length, 128 * 1024);
  assert.equal(getDeviceProfile('STM32F407VET6').flash.length, 512 * 1024);
  assert.equal(getDeviceProfile('GD32F407VGT6').ram.length, 192 * 1024);
  assert.deepEqual(getDeviceProfile('STM32F429ZIT6').additionalMemory, [
    { name: 'CCMRAM', attributes: 'rw', origin: 0x10000000, length: 64 * 1024 }
  ]);
  assert.deepEqual(getDeviceProfile('STM32L476RGT6').additionalMemory, [
    { name: 'RAM2', attributes: 'rw', origin: 0x10000000, length: 32 * 1024 }
  ]);
});

test('rejects incomplete device profiles before registry exposure', () => {
  const profile = getDeviceProfile('GD32F103C8T6');

  assert.throws(
    () => validateDeviceProfile({ ...profile, interruptHandlers: [] }),
    /Invalid MCU profile.*interruptHandlers/
  );
  assert.throws(
    () => validateDeviceProfile({ ...profile, compilerFlags: [] }),
    /Invalid MCU profile.*compilerFlags/
  );
  assert.throws(
    () => validateDeviceProfile({ ...profile, flash: { ...profile.flash, length: 0 } }),
    /Invalid MCU profile.*flash/
  );
  assert.throws(
    () => validateDeviceProfile({ ...profile, ram: { ...profile.ram, length: 0 } }),
    /Invalid MCU profile.*ram/
  );
});

test('returns defensive copies of profile data', () => {
  const profile = getDeviceProfile('GD32F103C8T6');
  profile.defines.push('MUTATED');
  profile.compilerFlags.length = 0;
  profile.interruptHandlers[0] = 'MUTATED_IRQHandler';
  profile.flash.length = 1;

  const freshProfile = getDeviceProfile('GD32F103C8T6');
  assert.doesNotMatch(freshProfile.defines.join(' '), /MUTATED/);
  assert.notEqual(freshProfile.compilerFlags.length, 0);
  assert.notEqual(freshProfile.interruptHandlers[0], 'MUTATED_IRQHandler');
  assert.equal(freshProfile.flash.length, 64 * 1024);
});
