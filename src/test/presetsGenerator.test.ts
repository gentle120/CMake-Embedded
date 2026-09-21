import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeviceProfile } from '../devices/deviceProfiles';
import { generateCMakePresets } from '../generator/presetsGenerator';

test('generates valid debug and release CMake presets', () => {
  const presetsText = generateCMakePresets();
  const presets = JSON.parse(presetsText) as {
    version: number;
    configurePresets: Array<{ name: string; binaryDir: string; cacheVariables: { CMAKE_BUILD_TYPE: string; CMAKE_TOOLCHAIN_FILE: string } }>;
    buildPresets: Array<{ name: string; configurePreset: string }>;
  };

  assert.equal(presets.version, 3);
  assert.deepEqual(presets.configurePresets.map((preset) => preset.name), ['debug', 'release']);
  assert.equal(presets.configurePresets[0].binaryDir, '${sourceDir}/build/debug');
  assert.equal(presets.configurePresets[0].cacheVariables.CMAKE_BUILD_TYPE, 'Debug');
  assert.equal(
    presets.configurePresets[0].cacheVariables.CMAKE_TOOLCHAIN_FILE,
    '${sourceDir}/cmake/gd32-toolchain.cmake'
  );
  assert.equal(presets.configurePresets[1].binaryDir, '${sourceDir}/build/release');
  assert.equal(presets.configurePresets[1].cacheVariables.CMAKE_BUILD_TYPE, 'Release');
  assert.equal(
    presets.configurePresets[1].cacheVariables.CMAKE_TOOLCHAIN_FILE,
    '${sourceDir}/cmake/gd32-toolchain.cmake'
  );
  assert.deepEqual(presets.buildPresets, [
    { name: 'debug', configurePreset: 'debug' },
    { name: 'release', configurePreset: 'release' }
  ]);
});

test('uses the selected device toolchain filename in presets', () => {
  const presets = JSON.parse(generateCMakePresets(getDeviceProfile('STM32F407VGT6').toolchainFileName));

  assert.equal(
    presets.configurePresets[0].cacheVariables.CMAKE_TOOLCHAIN_FILE,
    '${sourceDir}/cmake/stm32f4-toolchain.cmake'
  );
});
