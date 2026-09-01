import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('uses the extension name in command and settings display titles', () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
  assert.deepEqual(
    manifest.contributes.commands.map((command: { title: string }) => command.title),
    [
      'CMake-Embedded: Generate Project',
      'CMake-Embedded: Generate OpenOCD Flash Script',
      'CMake-Embedded: Generate Cortex-Debug Configuration'
    ]
  );
  assert.equal(manifest.contributes.configuration.title, 'CMake-Embedded');
  assert.ok(manifest.extensionDependencies.includes('marus25.cortex-debug'));
});
