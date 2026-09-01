import assert from 'node:assert/strict';
import test from 'node:test';
import { getFlashProbeProfile } from '../flash/probeProfiles';
import { getFlashTargetProfile } from '../flash/targets/targetProfiles';
import { generateCortexDebugLaunchJson } from '../generator/debugConfigGenerator';

test('generates a standard Cortex-Debug OpenOCD launch configuration', () => {
  const launch = JSON.parse(generateCortexDebugLaunchJson(undefined, {
    openocdPath: 'openocd',
    target: getFlashTargetProfile('gd32f1xx'),
    probe: getFlashProbeProfile('stlink')
  }));
  const config = launch.configurations[0];

  assert.equal(launch.version, '0.2.0');
  assert.equal(config.name, 'CMake-Embedded OpenOCD');
  assert.equal(config.type, 'cortex-debug');
  assert.equal(config.request, 'launch');
  assert.equal(config.cwd, '${workspaceRoot}');
  assert.equal(config.servertype, 'openocd');
  assert.equal(config.executable, '${command:cmake.launchTargetPath}');
  assert.equal(config.serverpath, undefined);
  assert.equal(config.toolchainPrefix, 'arm-none-eabi');
  assert.equal(config.armToolchainPath, undefined);
  assert.deepEqual(config.configFiles, ['interface/stlink.cfg', 'target/stm32f1x.cfg']);
  assert.equal(config.openOCDLaunchCommands, undefined);
  assert.equal(config.runToEntryPoint, 'main');
});

test('preserves user Cortex-Debug configurations and replaces its generated entry', () => {
  const existing = `{
    // Keep user configurations and JSONC comments valid.
    "version": "0.2.0",
    "configurations": [
      { "name": "User Debug", "type": "cortex-debug", },
      { "name": "CMake-Embedded OpenOCD", "type": "cortex-debug", },
    ],
  }`;
  const launch = JSON.parse(generateCortexDebugLaunchJson(existing, {
    openocdPath: 'D:\\Tools\\OpenOCD\\bin\\openocd.exe',
    target: getFlashTargetProfile('stm32f4xx'),
    probe: getFlashProbeProfile('jlink'),
    searchDirs: ['D:\\Tools\\OpenOCD\\scripts']
  }));

  assert.deepEqual(launch.configurations.map((config: { name: string }) => config.name), [
    'User Debug',
    'CMake-Embedded OpenOCD'
  ]);
  assert.equal(launch.configurations[1].serverpath, 'D:\\Tools\\OpenOCD\\bin\\openocd.exe');
  assert.equal(launch.configurations[1].cwd, '${workspaceRoot}');
  assert.deepEqual(launch.configurations[1].searchDir, ['D:\\Tools\\OpenOCD\\scripts']);
  assert.deepEqual(launch.configurations[1].configFiles, [
    'interface/jlink.cfg',
    'target/stm32f4x.cfg'
  ]);
});

test('adds the configured ARM GNU toolchain path for Cortex-Debug', () => {
  const launch = JSON.parse(generateCortexDebugLaunchJson(undefined, {
    openocdPath: 'D:\\Tools\\OpenOCD\\bin\\openocd.exe',
    armToolchainPath: 'D:/Desktop/tools/toolchain/arm_gnu_toolchain/bin',
    target: getFlashTargetProfile('stm32f4xx'),
    probe: getFlashProbeProfile('stlink')
  }));

  const config = launch.configurations[0];
  assert.equal(config.armToolchainPath, 'D:/Desktop/tools/toolchain/arm_gnu_toolchain/bin');
  assert.equal(config.toolchainPrefix, 'arm-none-eabi');
});
