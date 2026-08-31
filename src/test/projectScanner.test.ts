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
