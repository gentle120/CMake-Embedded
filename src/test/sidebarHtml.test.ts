import assert from 'node:assert/strict';
import test from 'node:test';
import { renderSidebarHtml } from '../sidebar/html';

const webview = {
  cspSource: 'vscode-webview:',
  asWebviewUri(uri: unknown): unknown {
    const file = uri as { path: string };
    return `vscode-webview-resource:${file.path}`;
  }
};
interface TestUri {
  path: string;
  with(changed: { path: string }): TestUri;
}

const extensionUri: TestUri = {
  path: '/C:/extension',
  with(changed: { path: string }): TestUri {
    return { ...extensionUri, ...changed };
  }
};

test('renders a CSP-safe sidebar shell with local assets', () => {
  const html = renderSidebarHtml(webview, extensionUri, 'nonce123');

  assert.match(html, /default-src 'none'/);
  assert.match(html, /script-src 'nonce-nonce123'/);
  assert.match(html, /img-src vscode-webview: data:/);
  assert.match(html, /main\.css/);
  assert.match(html, /main\.js/);
  assert.match(html, /id="mode-mcu"/);
  assert.match(html, /id="mode-linux"/);
  assert.match(html, /id="generate-project"/);
  assert.match(html, /id="generation-status"/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test('renders the Chinese default titles', () => {
  const html = renderSidebarHtml(webview, extensionUri, 'nonce123');

  assert.match(html, /CMake 工程生成/);
  assert.match(html, /生成工程/);
  assert.match(html, /扫描工作区/);
});
