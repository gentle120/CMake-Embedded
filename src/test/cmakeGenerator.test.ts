import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeviceProfile } from '../devices/deviceProfiles';
import { generateCMakeLists } from '../generator/cmakeGenerator';
import type { ProjectDescription } from '../scanner/projectScanner';

test('generates a CMake project for GD32F103C8T6', () => {
  const project: ProjectDescription = {
    sources: ['Core/Src/main.c', 'Core/Src/startup_gd32f103.s'],
    includeDirs: ['Core/Inc'],
    defines: ['GD32F10X_MD', 'VECT_TAB_OFFSET']
  };

  const cmake = generateCMakeLists('firmware', project, getDeviceProfile('GD32F103C8T6'));

  assert.match(cmake, /project\(\$\{CMAKE_PROJECT_NAME\} C ASM\)/);
  assert.match(cmake, /set\(CMAKE_C_STANDARD 11\)[\s\S]*project\(\$\{CMAKE_PROJECT_NAME\} C ASM\)/);
  assert.match(cmake, /set\(MCU_SOURCES[\s\S]*Core\/Src\/main\.c[\s\S]*\)/);
  assert.doesNotMatch(cmake, /startup_gd32f103\.s/);
  assert.match(cmake, /MCU_PROJECT_ROOT.*startup_gd32f10x_md\.S/s);
  assert.match(cmake, /MCU_SOURCES[\s\S]*system\/syscalls\.c[\s\S]*system\/sysmem\.c/);
  assert.match(cmake, /target_sources\(firmware PRIVATE \$\{MCU_SOURCES\}\)/);
  assert.match(cmake, /GD32F10X_MD/);
  assert.doesNotMatch(cmake, /^\s+VECT_TAB_OFFSET\s*$/m);
  assert.match(cmake, /MCU_PROJECT_ROOT/);
  assert.doesNotMatch(cmake, /target_compile_options/);
  assert.doesNotMatch(cmake, /target_link_options/);
  assert.doesNotMatch(cmake, /gd32-gcc-compat|COMPILE_LANGUAGE:C,CXX.*-include/);
  assert.match(cmake, /CMAKE_OBJCOPY.*-O ihex/s);
});

test('enables CXX when the project contains C++ sources', () => {
  const project: ProjectDescription = {
    sources: ['Core/Src/main.cpp'],
    includeDirs: [],
    defines: []
  };

  const cmake = generateCMakeLists('firmware', project, getDeviceProfile('GD32F103C8T6'));

  assert.match(cmake, /project\(\$\{CMAKE_PROJECT_NAME\} C CXX ASM\)/);
});

test('replaces legacy startup sources with the generated GNU startup file', () => {
  const project: ProjectDescription = {
    sources: ['main.c', 'startup_gd32f10x_md.s'],
    includeDirs: [],
    defines: []
  };

  const cmake = generateCMakeLists('firmware', project, getDeviceProfile('GD32F103C8T6'));

  assert.doesNotMatch(cmake, /startup_gd32f10x_md\.s/);
  assert.match(cmake, /MCU_PROJECT_ROOT.*startup_gd32f10x_md\.S/s);
});
