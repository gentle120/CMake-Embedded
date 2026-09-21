import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { generateLinuxCMakeLists } from '../linux/cmakeGenerator';
import { generateLinuxProjectConfig } from '../linux/configGenerator';
import {
  configureLinuxCppProperties,
  getLinuxWorkspaceIntegration,
  getLinuxWorkspaceSettings,
  linuxCompileCommandsPath
} from '../linux/integration';
import { readLinuxProjectConfig } from '../linux/projectConfig';
import { generateLinuxCMakePresets } from '../linux/presetsGenerator';
import { describeLinuxProject } from '../linux/projectStructure';
import { createLinuxToolchain } from '../linux/toolchainGenerator';
import type { LinuxProjectStructure, LinuxToolchainHit } from '../linux/types';

function createStructure(overrides: Partial<LinuxProjectStructure> = {}): LinuxProjectStructure {
  return {
    sources: ['main.cpp', 'code/control.cpp'],
    includeDirs: ['code'],
    defines: ['USE_CUSTOM_FEATURE'],
    targetName: 'project',
    targetType: 'executable',
    cStandard: 11,
    cxxStandard: 17,
    ...overrides
  };
}

test('derives the Linux build inputs from the workspace scan', () => {
  const structure = describeLinuxProject({
    sources: ['main.cpp', 'code/control.cpp', 'crt0.S'],
    includeDirs: ['code', 'include'],
    defines: []
  }, 'firmware');

  assert.deepEqual(structure.sources, ['main.cpp', 'code/control.cpp', 'crt0.S']);
  assert.deepEqual(structure.includeDirs, ['code', 'include']);
  assert.deepEqual(structure.defines, []);
  assert.equal(structure.targetName, 'firmware');
  assert.equal(structure.targetType, 'executable');
  assert.equal(structure.cStandard, 11);
  assert.equal(structure.cxxStandard, 17);
});

test('generates a Linux CMakeLists.txt with an explicit source list', () => {
  const cmake = generateLinuxCMakeLists(createStructure());

  assert.match(cmake, /cmake_minimum_required\(VERSION 3\.22\)/);
  assert.match(cmake, /set\(CMAKE_C_STANDARD 11\)/);
  assert.match(cmake, /set\(CMAKE_CXX_STANDARD 17\)/);
  assert.match(cmake, /project\(\$\{CMAKE_PROJECT_NAME\} C CXX\)/);
  assert.match(cmake, /set\(LINUX_PROJECT_ROOT "\$\{CMAKE_CURRENT_SOURCE_DIR\}"\)/);
  assert.match(cmake, /"\$\{LINUX_PROJECT_ROOT\}\/main\.cpp"/);
  assert.match(cmake, /"\$\{LINUX_PROJECT_ROOT\}\/code\/control\.cpp"/);
  assert.match(cmake, /"\$\{LINUX_PROJECT_ROOT\}\/code"/);
  assert.match(cmake, /add_executable\(project\)/);
  assert.match(cmake, /target_sources\(project PRIVATE \$\{LINUX_SOURCES\}\)/);
  assert.match(cmake, /target_link_libraries\(project PRIVATE\n    pthread\n    m\n\)/);
  assert.match(cmake, /USE_CUSTOM_FEATURE/);
  assert.match(cmake, /# CMAKE-EMBEDDED USER CODE BEGIN/);
  assert.match(cmake, /# CMAKE-EMBEDDED USER CODE END/);
  assert.match(cmake, /ADDITIONAL_CLEAN_FILES "\$\{CMAKE_BINARY_DIR\}\/project\.map"/);
  assert.match(cmake, /COMMAND \$\{CMAKE_SIZE\} \$<TARGET_FILE:project>/);
  assert.doesNotMatch(cmake, /objcopy/);
  assert.doesNotMatch(cmake, /\.ld/);
  assert.doesNotMatch(cmake, /MCU_PROJECT_ROOT/);
});

test('generates library targets for library project types', () => {
  assert.match(generateLinuxCMakeLists(createStructure({ targetType: 'static', targetName: 'libdemo' })), /add_library\(libdemo STATIC\)/);
  assert.match(generateLinuxCMakeLists(createStructure({ targetType: 'shared', targetName: 'libdemo' })), /add_library\(libdemo SHARED\)/);
});

test('selects the C++ and assembly languages from the source list', () => {
  assert.match(generateLinuxCMakeLists(createStructure({ sources: ['main.c'] })), /project\(\$\{CMAKE_PROJECT_NAME\} C\)/);
  assert.match(generateLinuxCMakeLists(createStructure({ sources: ['main.c', 'boot.S'] })), /project\(\$\{CMAKE_PROJECT_NAME\} C ASM\)/);
  assert.match(generateLinuxCMakeLists(createStructure({ sources: ['main.c', 'app.cpp'] })), /project\(\$\{CMAKE_PROJECT_NAME\} C CXX\)/);
});

test('keeps assembly sources in the build', () => {
  const cmake = generateLinuxCMakeLists(createStructure({ sources: ['main.c', 'crt0.S'] }));

  assert.match(cmake, /project\(\$\{CMAKE_PROJECT_NAME\} C ASM\)/);
  assert.match(cmake, /"\$\{LINUX_PROJECT_ROOT\}\/crt0\.S"/);
});

test('falls back to the project root when no include directory is known', () => {
  const cmake = generateLinuxCMakeLists(createStructure({ includeDirs: [] }));
  assert.match(cmake, /target_include_directories\(project PRIVATE\n    "\$\{LINUX_PROJECT_ROOT\}\/\."/);
});

test('preserves the user code section when regenerating', () => {
  const structure = createStructure();
  const edited = generateLinuxCMakeLists(structure).replace(
    '# Add user-defined include paths.',
    '# Add user-defined include paths.\ntarget_include_directories(${CMAKE_PROJECT_NAME} PRIVATE "/opt/deps/include")'
  );

  const regenerated = generateLinuxCMakeLists(structure, edited);

  assert.match(regenerated, /"\/opt\/deps\/include"/);
  assert.equal(regenerated.match(/# CMAKE-EMBEDDED USER CODE BEGIN/g)?.length, 1);
});

test('generates debug and release presets that use the Linux toolchain', () => {
  const presets = JSON.parse(generateLinuxCMakePresets());

  assert.equal(presets.version, 3);
  assert.deepEqual(presets.configurePresets.map((preset: { name: string }) => preset.name), ['debug', 'release']);
  assert.equal(presets.configurePresets[0].binaryDir, '${sourceDir}/build/debug');
  assert.equal(presets.configurePresets[1].binaryDir, '${sourceDir}/build/release');
  assert.equal(presets.configurePresets[1].cacheVariables.CMAKE_BUILD_TYPE, 'Release');
  assert.equal(
    presets.configurePresets[0].cacheVariables.CMAKE_TOOLCHAIN_FILE,
    '${sourceDir}/cmake/linux-toolchain.cmake'
  );
  assert.deepEqual(presets.buildPresets.map((preset: { name: string }) => preset.name), ['debug', 'release']);
});

test('records the Linux toolchain and project structure in .linux-cmake.json', () => {
  const hit: LinuxToolchainHit = {
    ...createLinuxToolchain('loongson'),
    label: 'Loongson (loongarch64)',
    source: 'path',
    verified: true,
    binDir: '/home/yjh/tools/toolchain/bin'
  };
  const config = JSON.parse(generateLinuxProjectConfig(
    'project',
    hit,
    createStructure(),
    ['CMakeLists.txt', 'CMakePresets.json', 'cmake/linux-toolchain.cmake'],
    ['CMakeLists.txt']
  ));

  assert.equal(config.projectName, 'project');
  assert.equal(config.kind, 'linux');
  assert.equal(config.toolchain.family, 'loongson');
  assert.equal(config.toolchain.compilerPrefix, 'loongarch64-linux-gnu-');
  assert.equal(config.toolchain.source, 'path');
  assert.equal(config.toolchain.verified, true);
  assert.equal(config.toolchain.binDir, '/home/yjh/tools/toolchain/bin');
  assert.equal(config.structure.sourceCount, 2);
  assert.deepEqual(config.structure.includeDirs, ['code']);
  assert.deepEqual(config.structure.defines, ['USE_CUSTOM_FEATURE']);
  assert.equal(config.structure.targetName, 'project');
  assert.equal(config.structure.targetType, 'executable');
  assert.deepEqual(config.generatedFiles, ['CMakeLists.txt', 'CMakePresets.json', 'cmake/linux-toolchain.cmake']);
  assert.deepEqual(config.overwrittenFiles, ['CMakeLists.txt']);
});

test('omits discovery metadata when only a resolved toolchain is available', () => {
  const config = JSON.parse(generateLinuxProjectConfig(
    'project',
    createLinuxToolchain('arm'),
    createStructure(),
    [],
    []
  ));

  assert.equal(config.toolchain.family, 'arm');
  assert.equal(config.toolchain.source, undefined);
  assert.equal(config.toolchain.processor, 'aarch64');
});

test('points the compile database at the generated build directory', () => {
  assert.equal(linuxCompileCommandsPath, 'build/debug/compile_commands.json');

  assert.deepEqual(getLinuxWorkspaceSettings(), {
    'cmake.sourceDirectory': '${workspaceFolder}',
    'cmake.useCMakePresets': 'always',
    'cmake.configureOnOpen': true,
    'C_Cpp.intelliSenseEngine': 'default',
    'C_Cpp.default.compileCommands': '${workspaceFolder}/build/debug/compile_commands.json',
    'C_Cpp.dimInactiveRegions': true
  });

  assert.deepEqual(getLinuxWorkspaceIntegration(), {
    cmakeTools: {
      preset: 'debug',
      configurePreset: 'debug',
      buildPreset: 'debug',
      settingsFile: '.vscode/settings.json'
    },
    cppTools: {
      configurationSource: 'CMake compile_commands.json',
      compileCommands: 'build/debug/compile_commands.json',
      dimInactiveRegions: true
    }
  });
});

test('configures C/C++ properties for the Linux cross compiler', () => {
  const properties = JSON.parse(configureLinuxCppProperties(undefined, createLinuxToolchain('loongson')));

  assert.equal(properties.version, 4);
  assert.equal(properties.configurations.length, 1);
  assert.equal(properties.configurations[0].name, 'Linux GCC (loongarch64-linux-gnu-gcc)');
  assert.equal(properties.configurations[0].compilerPath, 'loongarch64-linux-gnu-gcc');
  assert.equal(properties.configurations[0].intelliSenseMode, 'linux-gcc-x64');
  assert.equal(
    properties.configurations[0].compileCommands,
    '${workspaceFolder}/build/debug/compile_commands.json'
  );
});

test('uses the arm64 IntelliSense mode for the ARM toolchain', () => {
  const properties = JSON.parse(configureLinuxCppProperties(undefined, createLinuxToolchain('arm')));
  assert.equal(properties.configurations[0].compilerPath, 'aarch64-linux-gnu-gcc');
  assert.equal(properties.configurations[0].intelliSenseMode, 'linux-gcc-arm64');
});

test('reads back the saved toolchain family and defines', async () => {
  const root = await mkdtemp(join(tmpdir(), 'linux-project-'));
  const configPath = join(root, '.linux-cmake.json');
  writeFileSync(configPath, JSON.stringify({
    kind: 'linux',
    toolchain: { family: 'riscv' },
    structure: { defines: ['FEATURE_A=1', '', '   ', 42] }
  }));

  const saved = await readLinuxProjectConfig(configPath);

  assert.equal(saved?.toolchainFamily, 'riscv');
  assert.deepEqual(saved?.defines, ['FEATURE_A=1']);
});

test('ignores a missing, malformed, or unrelated saved config', async () => {
  const root = await mkdtemp(join(tmpdir(), 'linux-project-'));

  assert.equal(await readLinuxProjectConfig(join(root, 'missing.json')), undefined);

  const broken = join(root, 'broken.json');
  writeFileSync(broken, '{ not json');
  assert.equal(await readLinuxProjectConfig(broken), undefined);

  const unrelated = join(root, 'unrelated.json');
  writeFileSync(unrelated, '"just a string"');
  assert.equal(await readLinuxProjectConfig(unrelated), undefined);

  const unknownFamily = join(root, 'unknown.json');
  writeFileSync(unknownFamily, JSON.stringify({ toolchain: { family: 'mips' } }));
  assert.deepEqual(await readLinuxProjectConfig(unknownFamily), { toolchainFamily: undefined, defines: [] });
});

test('carries saved defines into the generated CMakeLists', () => {
  const structure = describeLinuxProject(
    { sources: ['main.cpp'], includeDirs: [], defines: [] },
    'demo',
    ['FEATURE_A=1', 'FEATURE_B']
  );

  assert.deepEqual(structure.defines, ['FEATURE_A=1', 'FEATURE_B']);
  const cmake = generateLinuxCMakeLists(structure);
  assert.match(cmake, /target_compile_definitions\(demo PRIVATE\n    FEATURE_A=1\n    FEATURE_B\n\)/);
});
