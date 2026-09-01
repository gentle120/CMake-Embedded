import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { getDeviceProfile } from '../devices/deviceProfiles';
import { getFlashProbeProfile, listFlashProbeProfiles } from '../flash/probeProfiles';
import { getFlashTargetProfile, listFlashTargetProfiles } from '../flash/targets/targetProfiles';
import { generateFlashScript } from '../generator/flashScriptGenerator';

function assertPythonSyntax(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('python', ['-c', 'import sys; compile(sys.stdin.read(), "<flash.py>", "exec")'], {
      stdio: ['pipe', 'ignore', 'pipe']
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `python exited with code ${code}`));
      }
    });
    child.stdin.end(script);
  });
}

test('maps the supported probes to OpenOCD interface configurations', () => {
  assert.deepEqual(
    listFlashProbeProfiles().map((profile) => ({
      id: profile.id,
      label: profile.label,
      interfaceConfig: profile.interfaceConfig
    })),
    [
      { id: 'jlink-ob', label: 'J-Link OB', interfaceConfig: 'interface/jlink.cfg' },
      { id: 'jlink', label: 'J-Link', interfaceConfig: 'interface/jlink.cfg' },
      { id: 'stlink', label: 'ST-Link', interfaceConfig: 'interface/stlink.cfg' },
      { id: 'daplink', label: 'DapLink', interfaceConfig: 'interface/cmsis-dap.cfg' }
    ]
  );
  assert.equal(getFlashProbeProfile('STLINK').interfaceConfig, 'interface/stlink.cfg');
});

test('keeps the flash target database independent from build profiles', () => {
  const targets = listFlashTargetProfiles();

  assert.ok(targets.length > 13);
  assert.equal(getFlashTargetProfile('stm32g0xx').targetConfig, 'target/stm32g0x.cfg');
  assert.throws(() => getDeviceProfile('STM32G0XX'), /Unsupported MCU/);
  assert.equal(getFlashTargetProfile('stm32f1xx').targetConfig, 'target/stm32f1x.cfg');
  assert.equal(getFlashTargetProfile('stm32l4xx').targetConfig, 'target/stm32l4x.cfg');
  assert.equal(getFlashTargetProfile('gd32f1xx').targetConfig, 'target/stm32f1x.cfg');
  assert.equal(getFlashTargetProfile('gd32f4xx').targetConfig, 'target/stm32f4x.cfg');
  assert.equal(getFlashTargetProfile('gd32e23x').targetConfig, 'target/gd32e23x.cfg');
});

test('generates an OpenOCD flash script with the selected chip and probe', async () => {
  const script = generateFlashScript(
    'firmware',
    getFlashTargetProfile('gd32f1xx'),
    getFlashProbeProfile('jlink-ob'),
    'D:\\Tools\\OpenOCD\\bin\\openocd.exe'
  );

  assert.ok(script.includes(`OPENOCD_DEFAULT = ${JSON.stringify('D:\\Tools\\OpenOCD\\bin\\openocd.exe')}`));
  assert.match(script, /TARGET_CFG = "target\/stm32f1x\.cfg"/);
  assert.match(script, /DEFAULT_PROBE = "jlink-ob"/);
  assert.match(script, /interface\/jlink\.cfg/);
  assert.match(script, /command = \["program", tcl_quote\(firmware\)\]/);
  assert.match(script, /command\.append\("verify"\)/);
  assert.match(script, /command\.append\("reset"\)/);
  assert.match(script, /build_program_command\(firmware, args\.verify, args\.reset\)/);
  assert.match(script, /work-area-backup 1/);
  assert.match(script, /FLASH_BASE = 0x08000000/);
  assert.match(script, /--firmware.*-f/);
  assert.match(script, /--openocd.*-o/);
  assert.match(script, /from pathlib import Path/);
  assert.match(script, /subprocess\.Popen/);
  assert.match(script, /Popen\(command, cwd=scripts_root\)/);
  assert.match(script, /process\.kill\(\)/);
  assert.match(script, /--transport/);
  assert.match(script, /"transport select " \+ args\.transport/);
  assert.match(script, /positive_int/);
  assert.match(script, /OPENOCD_SCRIPTS/);
  assert.match(script, /--dry-run/);
  await assertPythonSyntax(script);
});

test('uses the F4 target and flash base for an F4 script', () => {
  const script = generateFlashScript(
    'firmware',
    getFlashTargetProfile('stm32f4xx'),
    getFlashProbeProfile('daplink'),
    'openocd'
  );

  assert.match(script, /TARGET_CFG = "target\/stm32f4x\.cfg"/);
  assert.match(script, /interface\/cmsis-dap\.cfg/);
  assert.match(script, /FLASH_BASE = 0x08000000/);
});
