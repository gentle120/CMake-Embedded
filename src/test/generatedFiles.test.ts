import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { findExistingFiles, toWorkspacePath, writeGeneratedFiles } from '../shared/generatedFiles';

test('normalizes a generated file path against the workspace root', () => {
  const root = join('work', 'demo');

  assert.equal(toWorkspacePath(root, join(root, 'CMakeLists.txt')), 'CMakeLists.txt');
  assert.equal(
    toWorkspacePath(root, join(root, 'cmake', 'demo-toolchain.cmake')),
    'cmake/demo-toolchain.cmake'
  );
  assert.equal(toWorkspacePath(root, join(root, '.vscode', 'settings.json')), '.vscode/settings.json');
});

test('reports only the generated files that already exist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'generated-files-'));
  await writeFile(join(root, 'existing.txt'), 'x');

  const existing = await findExistingFiles([join(root, 'existing.txt'), join(root, 'missing.txt')]);

  assert.deepEqual(existing, [join(root, 'existing.txt')]);
});

test('writes every generated file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'generated-files-'));

  await writeGeneratedFiles([
    { path: join(root, 'a.txt'), content: 'a' },
    { path: join(root, 'b.txt'), content: 'b' }
  ]);

  assert.deepEqual(await findExistingFiles([join(root, 'a.txt'), join(root, 'b.txt')]), [
    join(root, 'a.txt'),
    join(root, 'b.txt')
  ]);
});
