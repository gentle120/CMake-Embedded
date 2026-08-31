import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { getDeviceProfile } from '../devices/deviceProfiles';
import { generateCMakeLists } from '../generator/cmakeGenerator';
import { generateLinkerScript } from '../generator/linkerGenerator';
import { generateToolchainFile } from '../generator/toolchainGenerator';
import { generateSyscalls, generateSysmem } from '../generator/runtimeGenerator';
import { generateGnuStartup } from '../generator/startupGenerator';

const execFileAsync = promisify(execFile);

test('generated files configure and build a minimal GD32 firmware', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mcu-cmake-build-'));
  const profile = getDeviceProfile('GD32F103C8T6');
  try {
    await writeFile(join(root, 'CMakeLists.txt'), generateCMakeLists('firmware', {
      sources: ['main.c', 'startup.s'],
      includeDirs: [],
      defines: []
    }, profile));
    await mkdir(join(root, 'cmake'), { recursive: true });
    await mkdir(join(root, 'system'), { recursive: true });
    await writeFile(join(root, 'cmake', 'toolchain.cmake'), generateToolchainFile(profile));
    await writeFile(join(root, profile.linkerFileName), generateLinkerScript(profile));
    await writeFile(join(root, profile.gnuStartupFileName), generateGnuStartup(profile));
    await writeFile(join(root, 'system', 'syscalls.c'), generateSyscalls());
    await writeFile(join(root, 'system', 'sysmem.c'), generateSysmem());
    await writeFile(join(root, 'main.c'), 'void SystemInit(void) {}\nvolatile int initialized_data = 1;\nint main(void) { return initialized_data; }\n');
    await writeFile(join(root, 'startup.s'), `.syntax unified
.cpu cortex-m3
.thumb
.section .isr_vector,"a",%progbits
.word _estack
.word Reset_Handler
.section .text.Reset_Handler,"ax",%progbits
.global Reset_Handler
.type Reset_Handler, %function
Reset_Handler:
  bl main
1: b 1b
`);

    const buildDir = join(root, 'build');
    await execFileAsync('cmake', [
      '-S', root,
      '-B', buildDir,
      '-G', 'Ninja',
      `-DCMAKE_TOOLCHAIN_FILE=${join(root, 'cmake', 'toolchain.cmake')}`
    ]);
    const buildResult = await execFileAsync('cmake', ['--build', buildDir]);
    const buildOutput = `${buildResult.stdout}\n${buildResult.stderr}`;
    assert.doesNotMatch(buildOutput, /does not take linker garbage collection into account/);
    await access(`${buildDir}/firmware.elf`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
