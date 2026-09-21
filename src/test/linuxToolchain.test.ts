import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, sep } from 'node:path';
import test from 'node:test';
import { compilerPrefixFromCommand, discoverLinuxToolchains } from '../linux/discovery';
import { createLinuxToolchain, generateLinuxToolchainFile } from '../linux/toolchainGenerator';
import { buildLinuxToolchainChoices } from '../linux/toolchainChoices';
import {
  getLinuxToolchainDefaults,
  linuxConfigFileName,
  linuxToolchainFamilies,
  linuxToolchainFileName
} from '../linux/types';

async function createFakeToolchain(directory: string, prefix: string): Promise<void> {
  await mkdir(directory, { recursive: true });
  for (const tool of ['gcc', 'g++', 'ar', 'ranlib', 'strip', 'size']) {
    const filePath = join(directory, `${prefix}${tool}`);
    await writeFile(filePath, '');
    await chmod(filePath, 0o755);
  }
}

async function withTemporaryDirectory(run: (directory: string) => Promise<void>): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'linux-toolchain-'));
  try {
    await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('derives a compiler prefix from a command name', () => {
  assert.equal(compilerPrefixFromCommand('aarch64-linux-gnu-gcc'), 'aarch64-linux-gnu-');
  assert.equal(compilerPrefixFromCommand('loongarch64-linux-gnu-g++'), 'loongarch64-linux-gnu-');
  assert.equal(compilerPrefixFromCommand('arm-linux-gnueabihf-gcc'), 'arm-linux-gnueabihf-');
  assert.equal(compilerPrefixFromCommand('/opt/tools/bin/loongarch64-linux-gnu-gcc'), 'loongarch64-linux-gnu-');
  assert.equal(compilerPrefixFromCommand('aarch64-linux-gnu-gcc.exe'), 'aarch64-linux-gnu-');
  assert.equal(compilerPrefixFromCommand('gcc'), undefined);
});

test('discovers the supported toolchains from PATH', async () => {
  await withTemporaryDirectory(async (directory) => {
    const loongson = join(directory, 'loongson');
    const arm = join(directory, 'arm');
    await createFakeToolchain(loongson, 'loongarch64-linux-gnu-');
    await createFakeToolchain(arm, 'aarch64-linux-gnu-');

    const hits = discoverLinuxToolchains({ PATH: `${arm}${delimiter}${loongson}` });

    assert.deepEqual(hits.map((hit) => hit.family), ['loongson', 'arm']);
    assert.deepEqual(hits.map((hit) => hit.source), ['path', 'path']);
    assert.deepEqual(hits.map((hit) => hit.verified), [true, true]);
    assert.equal(hits[0].processor, 'loongarch64');
    assert.equal(hits[0].compilerPrefix, 'loongarch64-linux-gnu-');
    assert.equal(hits[1].processor, 'aarch64');
    assert.equal(hits[0].binDir, loongson);
  });
});

test('ignores a compiler prefix that is not a complete toolchain', async () => {
  await withTemporaryDirectory(async (directory) => {
    const incomplete = join(directory, 'incomplete');
    await mkdir(incomplete, { recursive: true });
    await writeFile(join(incomplete, 'loongarch64-linux-gnu-gcc'), '');

    assert.deepEqual(discoverLinuxToolchains({ PATH: incomplete }), []);
  });
});

test('takes the toolchain from CROSS_COMPILE before scanning PATH', async () => {
  await withTemporaryDirectory(async (directory) => {
    const arm = join(directory, 'arm');
    await createFakeToolchain(arm, 'aarch64-linux-gnu-');

    const hits = discoverLinuxToolchains({ PATH: arm, CROSS_COMPILE: 'loongarch64-linux-gnu-' });

    assert.deepEqual(hits.map((hit) => hit.family), ['loongson', 'arm']);
    assert.equal(hits[0].source, 'cross-compile');
    assert.equal(hits[0].verified, false);
    assert.equal(hits[1].source, 'path');
  });
});

test('accepts a CROSS_COMPILE value that carries a bin directory', async () => {
  await withTemporaryDirectory(async (directory) => {
    const bin = join(directory, 'bin');
    await createFakeToolchain(bin, 'loongarch64-linux-gnu-');

    const hits = discoverLinuxToolchains({ CROSS_COMPILE: `${bin}${sep}loongarch64-linux-gnu-` });

    assert.equal(hits.length, 1);
    assert.equal(hits[0].family, 'loongson');
    assert.equal(hits[0].source, 'cross-compile');
    assert.equal(hits[0].verified, true);
    assert.equal(hits[0].binDir, bin);
  });
});

test('tolerates a CROSS_COMPILE value without the trailing dash', () => {
  const hits = discoverLinuxToolchains({ CROSS_COMPILE: 'aarch64-linux-gnu' });

  assert.equal(hits.length, 1);
  assert.equal(hits[0].family, 'arm');
  assert.equal(hits[0].compilerPrefix, 'aarch64-linux-gnu-');
});

test('takes the toolchain from CC and keeps its directory as diagnostics', async () => {
  await withTemporaryDirectory(async (directory) => {
    const compiler = join(directory, 'loongarch64-linux-gnu-gcc');
    await writeFile(compiler, '');
    await chmod(compiler, 0o755);

    const hits = discoverLinuxToolchains({ CC: compiler });

    assert.equal(hits.length, 1);
    assert.equal(hits[0].family, 'loongson');
    assert.equal(hits[0].source, 'cc-env');
    assert.equal(hits[0].verified, true);
    assert.equal(hits[0].binDir, directory);
  });
});

test('reports nothing when the environment has no supported toolchain', () => {
  assert.deepEqual(discoverLinuxToolchains({}), []);
  assert.deepEqual(discoverLinuxToolchains({ PATH: '', CROSS_COMPILE: 'mips-linux-gnu-' }), []);
});

test('offers the supported cross toolchain families in a stable order', () => {
  assert.deepEqual([...linuxToolchainFamilies], ['loongson', 'arm', 'arm32', 'riscv']);
  assert.deepEqual(
    linuxToolchainFamilies.map((family) => getLinuxToolchainDefaults(family).processor),
    ['loongarch64', 'aarch64', 'arm', 'riscv64']
  );
  assert.deepEqual(
    linuxToolchainFamilies.map((family) => getLinuxToolchainDefaults(family).compilerPrefix),
    ['loongarch64-linux-gnu-', 'aarch64-linux-gnu-', 'arm-linux-gnueabihf-', 'riscv64-linux-gnu-']
  );
});

test('discovers the 32-bit ARM toolchain from PATH', async () => {
  await withTemporaryDirectory(async (directory) => {
    const arm32 = join(directory, 'arm32');
    await createFakeToolchain(arm32, 'arm-linux-gnueabihf-');

    const hits = discoverLinuxToolchains({ PATH: arm32 });

    assert.equal(hits.length, 1);
    assert.equal(hits[0].family, 'arm32');
    assert.equal(hits[0].processor, 'arm');
    assert.equal(hits[0].compilerPrefix, 'arm-linux-gnueabihf-');
    assert.equal(hits[0].source, 'path');
    assert.equal(hits[0].verified, true);
    assert.equal(hits[0].binDir, arm32);
  });
});

test('keeps the 64-bit and 32-bit ARM toolchains apart', async () => {
  await withTemporaryDirectory(async (directory) => {
    const arm64 = join(directory, 'arm64');
    const arm32 = join(directory, 'arm32');
    await createFakeToolchain(arm64, 'aarch64-linux-gnu-');
    await createFakeToolchain(arm32, 'arm-linux-gnueabihf-');

    const hits = discoverLinuxToolchains({ PATH: `${arm32}${delimiter}${arm64}` });

    assert.deepEqual(hits.map((hit) => hit.family), ['arm', 'arm32']);
    assert.deepEqual(hits.map((hit) => hit.processor), ['aarch64', 'arm']);
    assert.deepEqual(hits.map((hit) => hit.binDir), [arm64, arm32]);
  });
});

test('discovers the RISC-V toolchain from PATH', async () => {
  await withTemporaryDirectory(async (directory) => {
    const riscv = join(directory, 'riscv');
    await createFakeToolchain(riscv, 'riscv64-linux-gnu-');

    const hits = discoverLinuxToolchains({ PATH: riscv });

    assert.equal(hits.length, 1);
    assert.equal(hits[0].family, 'riscv');
    assert.equal(hits[0].processor, 'riscv64');
    assert.equal(hits[0].compilerPrefix, 'riscv64-linux-gnu-');
    assert.equal(hits[0].source, 'path');
    assert.equal(hits[0].verified, true);
    assert.equal(hits[0].binDir, riscv);
  });
});

test('generates a machine independent loongson toolchain file', () => {
  const file = generateLinuxToolchainFile(createLinuxToolchain('loongson'));

  assert.match(file, /set\(CMAKE_SYSTEM_NAME Linux\)/);
  assert.match(file, /set\(CMAKE_SYSTEM_PROCESSOR "loongarch64"\)/);
  assert.match(file, /set\(CMAKE_C_COMPILER loongarch64-linux-gnu-gcc\)/);
  assert.match(file, /set\(CMAKE_CXX_COMPILER loongarch64-linux-gnu-g\+\+\)/);
  assert.match(file, /set\(CMAKE_ASM_COMPILER loongarch64-linux-gnu-gcc\)/);
  assert.match(file, /set\(CMAKE_ASM_FLAGS_INIT "\$\{TARGET_FLAGS\}"\)/);
  assert.match(file, /set\(CMAKE_SIZE loongarch64-linux-gnu-size CACHE FILEPATH "size executable"\)/);
  assert.match(file, /set\(TARGET_FLAGS "-march=loongarch64 -mtune=loongarch64 -fPIC"\)/);
  assert.match(file, /CMAKE_C_FLAGS_INIT "\$\{TARGET_FLAGS\}/);
  assert.match(file, /CMAKE_EXE_LINKER_FLAGS_INIT "\$\{TARGET_FLAGS\}.*-Wl,--gc-sections/);
  assert.match(file, /set\(CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY\)/);
  assert.doesNotMatch(file, /\/opt\//);
  assert.doesNotMatch(file, /[A-Za-z]:\\/);
  assert.doesNotMatch(file, /CMAKE_SYSROOT/);
});

test('generates the ARM toolchain without loongarch flags', () => {
  const file = generateLinuxToolchainFile(createLinuxToolchain('arm'));

  assert.match(file, /set\(CMAKE_SYSTEM_PROCESSOR "aarch64"\)/);
  assert.match(file, /set\(CMAKE_C_COMPILER aarch64-linux-gnu-gcc\)/);
  assert.doesNotMatch(file, /loongarch/);
  assert.doesNotMatch(file, /-march=/);
});

test('appends user supplied flags to the generated toolchain', () => {
  const file = generateLinuxToolchainFile(createLinuxToolchain('loongson', {
    cFlags: ['-Wextra'],
    cxxFlags: ['-fno-rtti'],
    linkerFlags: ['-static']
  }));

  assert.match(file, /CMAKE_C_FLAGS_INIT "\$\{TARGET_FLAGS\}.*-Wextra"\)/);
  assert.match(file, /CMAKE_CXX_FLAGS_INIT "\$\{TARGET_FLAGS\}.*-fno-rtti"\)/);
  assert.match(file, /CMAKE_EXE_LINKER_FLAGS_INIT "\$\{TARGET_FLAGS\} -static -Wl,--gc-sections/);
});

test('generates the RISC-V toolchain with the rv64gc ABI flags', () => {
  const file = generateLinuxToolchainFile(createLinuxToolchain('riscv'));

  assert.match(file, /set\(CMAKE_SYSTEM_PROCESSOR "riscv64"\)/);
  assert.match(file, /set\(CMAKE_C_COMPILER riscv64-linux-gnu-gcc\)/);
  assert.match(file, /set\(CMAKE_CXX_COMPILER riscv64-linux-gnu-g\+\+\)/);
  assert.match(file, /set\(CMAKE_SIZE riscv64-linux-gnu-size CACHE FILEPATH "size executable"\)/);
  assert.match(file, /set\(TARGET_FLAGS "-march=rv64gc -mabi=lp64d -fPIC"\)/);
  assert.doesNotMatch(file, /loongarch|aarch64/);
});

test('generates the 32-bit ARM toolchain with the armv7 hard-float flags', () => {
  const file = generateLinuxToolchainFile(createLinuxToolchain('arm32'));

  assert.match(file, /set\(CMAKE_SYSTEM_NAME Linux\)/);
  assert.match(file, /set\(CMAKE_SYSTEM_PROCESSOR "arm"\)/);
  assert.match(file, /set\(CMAKE_C_COMPILER arm-linux-gnueabihf-gcc\)/);
  assert.match(file, /set\(CMAKE_CXX_COMPILER arm-linux-gnueabihf-g\+\+\)/);
  assert.match(file, /set\(CMAKE_ASM_COMPILER arm-linux-gnueabihf-gcc\)/);
  assert.match(file, /set\(CMAKE_SIZE arm-linux-gnueabihf-size CACHE FILEPATH "size executable"\)/);
  assert.match(file, /set\(TARGET_FLAGS "-march=armv7-a -mfpu=vfpv3-d16 -mfloat-abi=hard -fPIC"\)/);
  assert.match(file, /CMAKE_EXE_LINKER_FLAGS_INIT "\$\{TARGET_FLAGS\}.*-Wl,--gc-sections/);
  assert.doesNotMatch(file, /aarch64|loongarch|riscv/);
});

test('exposes the generated Linux file names', () => {
  assert.equal(linuxToolchainFileName, 'linux-toolchain.cmake');
  assert.equal(linuxConfigFileName, '.linux-cmake.json');
});

test('offers every family and annotates the ones found in the environment', () => {
  const hits = [{
    ...createLinuxToolchain('arm'),
    label: 'ARM (aarch64)',
    source: 'path' as const,
    verified: true,
    binDir: '/opt/arm/bin'
  }];

  const choices = buildLinuxToolchainChoices(hits);
  const detailOf = (family: string): string => choices.find((choice) => choice.family === family)?.detail ?? '';

  assert.deepEqual(choices.map((choice) => choice.family), ['loongson', 'arm', 'arm32', 'riscv']);
  assert.deepEqual(choices.map((choice) => choice.remembered), [false, false, false, false]);
  assert.equal(detailOf('arm'), 'Found through PATH - /opt/arm/bin');
  assert.match(detailOf('loongson'), /^Not found in PATH/);
  assert.match(detailOf('riscv'), /^Not found in PATH/);
});

test('marks an unverified toolchain that only the environment declared', () => {
  const choices = buildLinuxToolchainChoices([{
    ...createLinuxToolchain('loongson'),
    label: 'Loongson (loongarch64)',
    source: 'cross-compile',
    verified: false
  }]);

  const loongson = choices.find((choice) => choice.family === 'loongson');
  assert.equal(loongson?.detail, 'Found through CROSS_COMPILE - not verified on disk');
});

test('lists the remembered family first and marks it', () => {
  const choices = buildLinuxToolchainChoices([], 'riscv');

  assert.deepEqual(choices.map((choice) => choice.family), ['riscv', 'loongson', 'arm', 'arm32']);
  assert.deepEqual(choices.map((choice) => choice.remembered), [true, false, false, false]);
  assert.match(choices[0].detail, /^Last used/);
});
