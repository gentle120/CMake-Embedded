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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${source}; img-src ${source} data:; font-src ${source}; script-src 'nonce-${safeNonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${stylesheet}">
  <title>CMake 工程生成</title>
</head>
<body>
  <main id="app">
    <header class="app-header">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">
          <span class="ui-icon" data-icon="chip"></span>
        </div>
        <div class="brand-copy">
          <span class="brand-kicker">CMake-Embedded</span>
          <h1>工程生成台</h1>
        </div>
      </div>
      <span id="generation-status" class="status-badge" role="status" aria-live="polite">
        <span class="status-dot"></span><span class="status-text">就绪</span>
      </span>
    </header>
    <section id="mode-switcher" class="mode-switcher" aria-label="工程类型">
      <button id="mode-mcu" class="mode-button" type="button" aria-pressed="true">
        <span class="ui-icon" data-icon="chip" aria-hidden="true"></span><span>MCU 固件</span>
      </button>
      <button id="mode-linux" class="mode-button" type="button" aria-pressed="false">
        <span class="ui-icon" data-icon="device-desktop" aria-hidden="true"></span><span>Linux / SoC</span>
      </button>
    </section>
    <section class="workspace-card" aria-label="当前工作区">
      <span class="ui-icon" data-icon="folder" aria-hidden="true"></span>
      <span id="workspace-name" class="workspace-name">正在读取工作区</span>
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
      <button id="scan-workspace" class="secondary-action" type="button">
        <span class="ui-icon" data-icon="refresh" aria-hidden="true"></span><span>扫描工作区</span>
      </button>
      <button id="generate-project" class="primary-action" type="button">
        <span class="ui-icon" data-icon="play" aria-hidden="true"></span><span>生成工程</span>
      </button>
    </footer>
  </main>
  <script nonce="${safeNonce}" src="${script}"></script>
</body>
</html>`;
}
