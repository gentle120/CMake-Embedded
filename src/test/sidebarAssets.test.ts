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
    '.brand-mark',
    '.workspace-card',
    '.control-section',
    '.mode-switcher',
    '.configuration-panel',
    '.toggle-row',
    '.switch-track',
    '.status-dot',
    '.actions.busy',
    '.primary-action',
    '@media (max-width: 258px)'
  ]) {
    assert.ok(stylesheet.includes(selector), `missing ${selector}`);
  }
  assert.doesNotMatch(stylesheet, /url\((?:["']?https?:)/i);
});

test('compiles sidebar assets into the packaged extension output', () => {
  const compiledRoot = join(__dirname, '..', 'sidebar', 'webview');

  assert.ok(readFileSync(join(compiledRoot, 'main.js'), 'utf8').includes('acquireVsCodeApi'));
  assert.ok(readFileSync(join(compiledRoot, 'main.css'), 'utf8').includes('.configuration-panel'));
});

test('sidebar uses local inline mask icons for actions and status', () => {
  const stylesheet = readFileSync(join(root, 'main.css'), 'utf8');

  for (const icon of [
    'folder',
    'chip',
    'device-desktop',
    'refresh',
    'play',
    'zap',
    'debug-alt',
    'extensions',
    'settings-gear',
    'pass',
    'warning',
    'check'
  ]) {
    assert.match(stylesheet, new RegExp(`data-icon="${icon}"`));
  }
  assert.match(stylesheet, /\.ui-icon/);
  assert.match(stylesheet, /data:image\/svg\+xml/);
});
