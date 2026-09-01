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

test('uses the selected STM32 startup, linker, and definitions in CMake', () => {
  const project: ProjectDescription = {
    sources: ['Core/Src/main.c', 'startup_stm32f407xx.s'],
    includeDirs: ['Core/Inc'],
    defines: []
  };

  const cmake = generateCMakeLists('firmware', project, getDeviceProfile('STM32F407VGT6'));

  assert.match(cmake, /startup_stm32f407xx\.S/);
  assert.doesNotMatch(cmake, /startup_stm32f407xx\.s/);
  assert.match(cmake, /STM32F407xx/);
  assert.doesNotMatch(cmake, /GD32F10X_MD|gd32-gcc-compat|VECT_TAB_OFFSET/);
});

test('does not generate the STM32 HAL legacy or clock macros', () => {
  const project: ProjectDescription = {
    sources: ['Core/Src/main.c'],
    includeDirs: ['Drivers/STM32F4xx_HAL_Driver/Inc/Legacy'],
    defines: [
      'STM32_HAL_LEGACY',
      'HSE_VALUE=((uint32_t)25000000)',
      'LSE_VALUE=32768U',
      'USE_HAL_DRIVER'
    ]
  };

  const cmake = generateCMakeLists('firmware', project, getDeviceProfile('STM32F407VGT6'));

  assert.match(cmake, /^\s+USE_HAL_DRIVER\s*$/m);
  assert.doesNotMatch(cmake, /^\s+STM32_HAL_LEGACY\s*$/m);
  assert.doesNotMatch(cmake, /^\s+HSE_VALUE=.*$/m);
  assert.doesNotMatch(cmake, /^\s+LSE_VALUE=.*$/m);
});
