import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { getDeviceProfile } from '../devices/deviceProfiles';
import {
  generateLinuxWorkflow,
  generateMcuWorkflow,
  generateNativeWorkflow,
  type ProjectWorkflowHost
} from '../generation/workflow';
import { createLinuxToolchain } from '../linux/toolchainGenerator';
import type { NativeProjectStructure } from '../native/types';
import { scanProject } from '../scanner/projectScanner';

async function withWorkspace(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'cmake-embedded-workflow-'));
  await writeFile(join(root, 'main.c'), 'int main(void) { return 0; }\n');
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function createHost(
  root: string,
  confirmOverwrite: (files: string[]) => Promise<boolean> = async () => true
): ProjectWorkflowHost {
  return {
    workspaceRoot: () => root,
    scanWorkspace: (workspaceRoot) => scanProject(workspaceRoot),
    confirmOverwrite,
    updateSettings: async () => {}
  };
}

test('MCU workflow writes one startup, one linker, and a relative result list', async () => {
  await withWorkspace(async (root) => {
    const result = await generateMcuWorkflow(
      createHost(root),
      getDeviceProfile('STM32F103C8T6'),
      {}
    );

    assert.equal(result.ok, true);
    assert.equal(result.kind, 'mcu');
    assert.equal(result.files.filter((file) => file.toLowerCase().endsWith('.s')).length, 1);
    assert.equal(result.files.filter((file) => file.toLowerCase().endsWith('.ld')).length, 1);
    assert.ok(result.files.includes('startup_stm32f103xb.S'));
    assert.ok(result.files.includes('STM32F103C8T6.ld'));
    assert.match(await readFile(join(root, 'CMakeLists.txt'), 'utf8'), /CMAKE-EMBEDDED USER CODE BEGIN/);
  });
});

test('MCU workflow preserves an existing user CMake section', async () => {
  await withWorkspace(async (root) => {
    const initial = await generateMcuWorkflow(
      createHost(root),
      getDeviceProfile('STM32F103C8T6'),
      {}
    );
    assert.equal(initial.ok, true);
    const cmakePath = join(root, 'CMakeLists.txt');
    const cmake = (await readFile(cmakePath, 'utf8')).replace(
      '# This section is preserved when CMakeLists.txt is generated again.',
      '# This section is preserved when CMakeLists.txt is generated again.\nset(MY_CUSTOM_FLAG ON)'
    );
    await writeFile(cmakePath, cmake);

    const result = await generateMcuWorkflow(
      createHost(root),
      getDeviceProfile('STM32F103C8T6'),
      {}
    );

    assert.equal(result.ok, true);
    assert.match(await readFile(cmakePath, 'utf8'), /set\(MY_CUSTOM_FLAG ON\)/);
  });
});

test('declining overwrite leaves generated files untouched', async () => {
  await withWorkspace(async (root) => {
    const first = await generateMcuWorkflow(
      createHost(root),
      getDeviceProfile('STM32F103C8T6'),
      {}
    );
    assert.equal(first.ok, true);
    const cmakePath = join(root, 'CMakeLists.txt');
    const before = await readFile(cmakePath, 'utf8');

    const result = await generateMcuWorkflow(
      createHost(root, async () => false),
      getDeviceProfile('STM32F103C8T6'),
      {}
    );

    assert.equal(result.ok, false);
    assert.equal(result.cancelled, true);
    assert.equal(await readFile(cmakePath, 'utf8'), before);
  });
});

test('Linux workflow writes the Linux toolchain and project config without MCU files', async () => {
  await withWorkspace(async (root) => {
    const result = await generateLinuxWorkflow(createHost(root), createLinuxToolchain('arm'));

    assert.equal(result.ok, true);
    assert.equal(result.kind, 'linux');
    assert.ok(result.files.includes('cmake/linux-toolchain.cmake'));
    assert.ok(result.files.includes('.linux-cmake.json'));
    assert.equal(result.files.some((file) => file.endsWith('.ld')), false);
    assert.equal(result.files.some((file) => /\.S$/i.test(file)), false);
  });
});

test('native workflow writes a CMake project for the host C/C++ toolchain', async () => {
  await withWorkspace(async (root) => {
    const structure: NativeProjectStructure = {
      sources: ['main.c'],
      includeDirs: [],
      defines: [],
      targetName: 'daily_tool',
      targetType: 'executable',
      cStandard: 11,
      cxxStandard: 17
    };
    const result = await generateNativeWorkflow(createHost(root), structure);

    assert.equal(result.ok, true);
    assert.equal(result.kind, 'native');
    assert.ok(result.files.includes('CMakeLists.txt'));
    assert.ok(result.files.includes('CMakePresets.json'));
    assert.ok(result.files.includes('.native-cmake.json'));
    assert.equal(result.files.some((file) => file.endsWith('.ld')), false);
    assert.equal(result.files.some((file) => /\.S$/i.test(file)), false);
  });
});
