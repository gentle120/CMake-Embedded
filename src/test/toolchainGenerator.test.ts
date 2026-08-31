import assert from 'node:assert/strict';
import test from 'node:test';
import { getDeviceProfile } from '../devices/deviceProfiles';
import { generateToolchainFile } from '../generator/toolchainGenerator';

test('generates an arm-none-eabi toolchain file', () => {
  const toolchain = generateToolchainFile(getDeviceProfile('GD32F103C8T6'));

  assert.match(toolchain, /CMAKE_SYSTEM_PROCESSOR arm/);
  assert.match(toolchain, /arm-none-eabi-gcc/);
  assert.match(toolchain, /arm-none-eabi-g\+\+/);
  assert.match(toolchain, /CMAKE_TRY_COMPILE_TARGET_TYPE STATIC_LIBRARY/);
  assert.match(toolchain, /set\(TARGET_FLAGS "-mcpu=cortex-m3 -mthumb"\)/);
  assert.match(toolchain, /CMAKE_C_FLAGS_INIT.*TARGET_FLAGS/);
  assert.match(toolchain, /CMAKE_ASM_FLAGS_INIT.*assembler-with-cpp.*MMD.*MP/);
  assert.match(toolchain, /-Wall.*-fdata-sections.*-ffunction-sections.*-fstack-usage/);
  assert.match(toolchain, /CMAKE_C_FLAGS_DEBUG "-Og -g3"/);
  assert.match(toolchain, /CMAKE_C_FLAGS_RELEASE "-Os -g0"/);
  assert.match(toolchain, /CMAKE_CXX_FLAGS_INIT.*fno-rtti.*fno-exceptions.*fno-threadsafe-statics/);
  assert.match(toolchain, /CMAKE_EXE_LINKER_FLAGS_INIT.*TARGET_FLAGS/);
  assert.match(toolchain, /--specs=nano\.specs/);
  assert.doesNotMatch(toolchain, /--specs=nosys\.specs/);
  assert.match(toolchain, /GD32F103C8T6\.ld/);
  assert.match(toolchain, /-Wl,-Map=.*CMAKE_PROJECT_NAME.*-Wl,--gc-sections/);
});

test('generates hard-float Cortex-M4 compiler and linker flags', () => {
  const toolchain = generateToolchainFile(getDeviceProfile('STM32F407VGT6'));

  assert.match(toolchain, /set\(TARGET_FLAGS "-mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=hard"\)/);
  assert.match(toolchain, /CMAKE_C_FLAGS_INIT.*TARGET_FLAGS/);
  assert.match(toolchain, /CMAKE_ASM_FLAGS_INIT.*TARGET_FLAGS/);
  assert.match(toolchain, /CMAKE_EXE_LINKER_FLAGS_INIT.*TARGET_FLAGS/);
  assert.doesNotMatch(toolchain, /-mcpu=cortex-m3/);
});

test('keeps Cortex-M3 profiles free of floating-point ABI flags', () => {
  const toolchain = generateToolchainFile(getDeviceProfile('GD32F103C8T6'));

  assert.doesNotMatch(toolchain, /-mfpu=|-mfloat-abi=/);
});
