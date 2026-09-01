import assert from 'node:assert/strict';
import test from 'node:test';
import { configureCppProperties } from '../integration/cppProperties';

test('configures C/C++ properties from the generated ARM compile database', () => {
  const result = JSON.parse(configureCppProperties(JSON.stringify({
    configurations: [{
      name: 'windows-gcc-x64',
      compilerPath: 'd:/tools/mingw/bin/gcc.exe',
      compilerArgs: [''],
      intelliSenseMode: 'windows-gcc-x64',
      configurationProvider: 'ms-vscode.cmake-tools'
    }],
    version: 4
  })));

  assert.deepEqual(result.configurations[0], {
    name: 'ARM GCC (arm-none-eabi)',
    compilerPath: 'arm-none-eabi-gcc',
    compileCommands: '${workspaceFolder}/build/debug/compile_commands.json',
    intelliSenseMode: 'gcc-arm'
  });
});

test('creates a usable C/C++ properties file when none exists', () => {
  const result = JSON.parse(configureCppProperties(undefined));

  assert.equal(result.version, 4);
  assert.deepEqual(result.configurations, [{
    name: 'ARM GCC (arm-none-eabi)',
    compilerPath: 'arm-none-eabi-gcc',
    compileCommands: '${workspaceFolder}/build/debug/compile_commands.json',
    intelliSenseMode: 'gcc-arm'
  }]);
});
