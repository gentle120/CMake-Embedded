import assert from 'node:assert/strict';
import test from 'node:test';
import { generateCMakePresets } from '../generator/presetsGenerator';

test('generates valid debug CMake presets', () => {
  const presetsText = generateCMakePresets();
  const presets = JSON.parse(presetsText) as {
    version: number;
    configurePresets: Array<{ name: string; binaryDir: string; cacheVariables: { CMAKE_TOOLCHAIN_FILE: string } }>;
  };

  assert.equal(presets.version, 3);
  assert.equal(presets.configurePresets[0].name, 'debug');
  assert.equal(presets.configurePresets[0].binaryDir, '${sourceDir}/build/debug');
  assert.equal(
    presets.configurePresets[0].cacheVariables.CMAKE_TOOLCHAIN_FILE,
    '${sourceDir}/cmake/gd32-toolchain.cmake'
  );
});
