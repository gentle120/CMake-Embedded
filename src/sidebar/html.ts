import { existsSync } from 'node:fs';
import { join } from 'node:path';

interface WebviewUriApi {
  cspSource: string;
  asWebviewUri(uri: unknown): unknown;
}

interface WebviewUri {
  path: string;
  with(changed: { path: string }): WebviewUri;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderSidebarHtml(
  webview: WebviewUriApi,
  extensionUri: WebviewUri,
  nonce: string
): string {
  const runtimeRoot = existsSync(join(__dirname, 'webview', 'main.js'))
    ? 'out/sidebar'
    : 'src/sidebar';
  const stylesheet = escapeAttribute(String(webview.asWebviewUri(
    extensionUri.with({
      path: `${extensionUri.path}/${runtimeRoot}/webview/main.css`
    })
  )));
  const script = escapeAttribute(String(webview.asWebviewUri(
    extensionUri.with({
      path: `${extensionUri.path}/${runtimeRoot}/webview/main.js`
    })
  )));
  const source = escapeAttribute(webview.cspSource);
  const safeNonce = escapeAttribute(nonce);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${source}; script-src 'nonce-${safeNonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${stylesheet}">
  <title>CMake 工程生成</title>
</head>
<body>
  <main id="app">
    <header class="app-header">
      <div>
        <h1>CMake 工程生成</h1>
        <p id="workspace-name" class="workspace-name">正在读取工作区</p>
      </div>
      <span id="generation-status" class="status-badge" role="status" aria-live="polite">就绪</span>
    </header>
    <section id="mode-switcher" class="mode-switcher" aria-label="工程类型">
      <button id="mode-mcu" class="mode-button" type="button" aria-pressed="true">MCU 固件</button>
      <button id="mode-linux" class="mode-button" type="button" aria-pressed="false">Linux / SoC</button>
    </section>
    <section id="configuration" class="configuration" aria-label="生成配置"></section>
    <p id="workspace-summary" class="workspace-summary" aria-live="polite">
      尚未扫描工作区
    </p>
    <section id="result-region" class="result-region" hidden>
      <h2>已生成文件</h2>
      <ul id="generated-files"></ul>
    </section>
    <footer id="actions" class="actions">
      <button id="scan-workspace" class="secondary-action" type="button">扫描工作区</button>
      <button id="generate-project" class="primary-action" type="button">生成工程</button>
    </footer>
  </main>
  <script nonce="${safeNonce}" src="${script}"></script>
</body>
</html>`;
}
