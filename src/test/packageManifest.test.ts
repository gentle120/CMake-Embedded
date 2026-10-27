import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('uses the extension name in command and settings display titles', () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
  assert.deepEqual(
    manifest.contributes.commands.map((command: { title: string }) => command.title),
    [
      'CMake-Embedded: Generate MCU Project',
      'CMake-Embedded: Generate Linux Project',
      'CMake-Embedded: Generate C/C++ Project',
      'CMake-Embedded: Generate OpenOCD Flash Script',
      'CMake-Embedded: Generate Cortex-Debug Configuration'
    ]
  );
  assert.equal(manifest.contributes.configuration.title, 'CMake-Embedded');
  assert.ok(manifest.extensionDependencies.includes('ms-vscode.cmake-tools'));
  assert.ok(!manifest.extensionDependencies.includes('marus25.cortex-debug'));
});

test('keeps the Marketplace icon square and below the upload size limit', () => {
  const manifest = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8'));
  const iconPath = join(__dirname, '..', '..', manifest.icon);
  const icon = readFileSync(iconPath);
  const width = icon.readUInt32BE(16);
  const height = icon.readUInt32BE(20);

  assert.equal(width, 256);
  assert.equal(height, 256);
  assert.ok(icon.byteLength < 1024 * 1024, `icon is ${icon.byteLength} bytes`);
});
