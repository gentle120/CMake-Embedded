import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = join(__dirname, '..', '..', 'src', 'sidebar', 'webview');

test('sidebar renderer wires every supported command', () => {
  const script = readFileSync(join(root, 'main.js'), 'utf8');

  for (const command of [
    'ready',
    'saveSelection',
    'generateProject',
    'generateFlashScript',
    'generateDebugConfiguration'
  ]) {
    assert.match(script, new RegExp(command));
  }
  assert.doesNotMatch(script, /https?:\/\//);
});

test('sidebar stylesheet covers the required responsive layout', () => {
  const stylesheet = readFileSync(join(root, 'main.css'), 'utf8');

  for (const selector of [
    '.app-header',
    '.mode-switcher',
    '.configuration-panel',
    '.option-card',
    '.primary-action',
    '@media (max-width: 240px)'
  ]) {
    assert.ok(stylesheet.includes(selector), `missing ${selector}`);
  }
  assert.doesNotMatch(stylesheet, /https?:\/\//);
});
