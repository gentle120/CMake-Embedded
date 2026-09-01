import assert from 'node:assert/strict';
import test from 'node:test';
import { getWorkspaceSettings } from '../integration/workspaceSettings';

test('configures CMake Tools and C/C++ IntelliSense for the generated debug preset', () => {
  assert.deepEqual(getWorkspaceSettings(), {
    'cmake.useCMakePresets': 'always',
    'cmake.configureOnOpen': true,
    'C_Cpp.intelliSenseEngine': 'default',
    'C_Cpp.default.compileCommands': '${workspaceFolder}/build/debug/compile_commands.json',
    'C_Cpp.dimInactiveRegions': true
  });
});
