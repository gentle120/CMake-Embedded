import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanProject } from '../scanner/projectScanner';

test('scans source files, headers, include directories, and defines', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mcu-cmake-'));
  await mkdir(join(root, 'Core', 'Src'), { recursive: true });
  await mkdir(join(root, 'Core', 'Inc'), { recursive: true });
  await mkdir(join(root, 'Drivers'), { recursive: true });
  await mkdir(join(root, 'build'), { recursive: true });
  await mkdir(join(root, '_cmake'), { recursive: true });
  await writeFile(join(root, 'Core', 'Src', 'main.c'), 'int main(void) { return 0; }');
  await writeFile(join(root, 'Core', 'Src', 'startup_gd32f103.s'), 'AREA RESET, DATA, READONLY\nEXPORT Reset_Handler\n');
  await writeFile(join(root, 'Core', 'Inc', 'main.h'), '#define GD32F10X_MD');
  await writeFile(join(root, 'project.uvprojx'), `<Project><Targets><Target><Groups><Group><Files><File><FileType>1</FileType><FilePath>ghost.c</FilePath></File></Files></Group></Groups></Target></Targets></Project>`);
  await writeFile(join(root, 'Drivers', 'ignored.c'), '');
  await writeFile(join(root, 'build', 'generated.c'), '');
  await writeFile(join(root, '_cmake', 'generated.c'), '');

  const project = await scanProject(root);

  assert.deepEqual(project.sources, [
    'Core/Src/main.c',
    'Core/Src/startup_gd32f103.s',
    'Drivers/ignored.c'
  ]);
  assert.deepEqual(project.includeDirs, ['Core/Inc']);
  assert.deepEqual(project.defines, ['GD32F10X_MD']);
});

test('does not scan STM32 or GD32 include guards as compiler definitions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mcu-cmake-'));
  await mkdir(join(root, 'Core'), { recursive: true });
  await mkdir(join(root, 'Drivers', 'STM32F4xx_HAL_Driver', 'Inc', 'Legacy'), { recursive: true });
  await mkdir(join(root, 'Drivers', 'GD32F4xx', 'Inc'), { recursive: true });
  await writeFile(
    join(root, 'Drivers', 'STM32F4xx_HAL_Driver', 'Inc', 'Legacy', 'stm32f4xx_hal_legacy.h'),
    '#ifndef STM32_HAL_LEGACY\n#define STM32_HAL_LEGACY\n#endif\n'
  );
  await writeFile(
    join(root, 'Drivers', 'GD32F4xx', 'Inc', 'gd32_driver_legacy.h'),
    '#ifndef GD32_DRIVER_LEGACY\n#define GD32_DRIVER_LEGACY\n#endif\n'
  );
  await writeFile(
    join(root, 'Core', 'main.c'),
    '#define USE_HAL_DRIVER\nint main(void) { return 0; }\n'
  );
  await writeFile(
    join(root, 'Core', 'hal_config.h'),
    '#ifndef USE_HAL_DRIVER\n#define USE_HAL_DRIVER\n#endif\n'
  );

  const project = await scanProject(root);

  assert.deepEqual(project.defines, ['USE_HAL_DRIVER']);
});

test('does not scan HSE and LSE clock configuration macros', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mcu-cmake-'));
  await mkdir(join(root, 'Core'), { recursive: true });
  await writeFile(
    join(root, 'Core', 'clock.h'),
    '#define HSE_VALUE 8000000U\n#define LSE_VALUE ((uint32_t)32768U)\n'
  );

  const project = await scanProject(root);

  assert.deepEqual(project.defines, []);
});
