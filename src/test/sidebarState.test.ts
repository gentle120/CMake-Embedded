import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSidebarState,
  defaultSidebarSelection,
  nextMcuSelection,
  sanitizeSidebarSelection
} from '../sidebar/state';

test('defaults to the first STM32 F1 device', () => {
  const selection = defaultSidebarSelection();

  assert.equal(selection.mode, 'mcu');
  assert.equal(selection.mcu.vendor, 'STM');
  assert.equal(selection.mcu.series, 'F1x');
  assert.equal(selection.mcu.part, 'STM32F103C8T6');
  assert.equal(selection.flash.enabled, false);
});

test('replaces stale values with current registry defaults', () => {
  const selection = sanitizeSidebarSelection({
    mode: 'linux',
    mcu: { vendor: 'bad', series: 'bad', part: 'bad' },
    linux: { toolchainFamily: 'bad' },
    debugEnabled: 'yes',
    flash: { enabled: true, targetId: 'bad', probeId: 'bad', openocdPath: '  ' }
  });

  assert.equal(selection.mode, 'linux');
  assert.equal(selection.mcu.part, 'STM32F103C8T6');
  assert.equal(selection.linux.toolchainFamily, 'loongson');
  assert.equal(selection.debugEnabled, false);
  assert.equal(selection.flash.enabled, false);
  assert.equal(selection.flash.probeId, 'stlink');
  assert.equal(selection.flash.openocdPath, 'openocd');
});

test('changing vendor selects its first series and part', () => {
  const updated = nextMcuSelection(defaultSidebarSelection(), { vendor: 'GD' });

  assert.equal(updated.mode, 'mcu');
  assert.equal(updated.mcu.vendor, 'GD');
  assert.equal(updated.mcu.series, 'F1x');
  assert.equal(updated.mcu.part, 'GD32F103C8T6');
});

test('changing series selects its first part', () => {
  const updated = nextMcuSelection(defaultSidebarSelection(), { series: 'F4x' });

  assert.equal(updated.mcu.series, 'F4x');
  assert.match(updated.mcu.part, /^STM32F4/);
});

test('bootstrap filters parts and annotates detected toolchains', () => {
  const state = buildSidebarState(
    'firmware',
    defaultSidebarSelection(),
    [{ family: 'arm', verified: true, binDir: 'C:\\Tools\\arm\\bin', source: 'path' }]
  );

  assert.ok(state.devices.every((device) => device.value.startsWith('STM32F1')));
  assert.ok(state.linuxToolchains.some((toolchain) => toolchain.value === 'arm'));
  assert.match(state.linuxToolchains.find((toolchain) => toolchain.value === 'arm')?.detail ?? '', /PATH/);
});
