# CMake-Embedded Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Chinese-first Activity Bar sidebar that generates MCU and Linux CMake projects while preserving the existing command-palette flows and generator output.

**Architecture:** A Webview view renders registry options and sends validated selection messages to a provider. One shared workflow module executes the existing scanners, generators, overwrite checks, and workspace writes for both the sidebar and command palette.

**Tech Stack:** TypeScript, VS Code Webview API, HTML, CSS, browser JavaScript, Node.js test runner, CMake/Ninja when available.

**Spec:** `docs/superpowers/specs/2026-10-27-sidebar-generation-design.md`

## Global Constraints

- Keep all work inside `D:\Desktop\tools\CMake插件\CMake-Embedded`.
- Keep `README.md` as the primary Chinese document and make it the default display.
- Preserve every existing command ID and generated output format.
- Do not add hardware access, flashing, debugging, probe discovery, or vendor SDK management.
- Keep one generated startup assembly and one generated linker script per MCU project.
- Preserve `CMAKE-EMBEDDED USER CODE BEGIN/END` content on regeneration.
- Persist only the current mode, device/toolchain selection, and generation options.
- Use local Webview assets, a nonce CSP, VS Code theme variables, and no remote resources.
- Keep TypeScript source comments in English; sidebar copy is Chinese.
- Do not introduce a runtime dependency for the UI.

---

### Task 1: Add pure sidebar state helpers

**Files:**
- Create: `src/sidebar/state.ts`
- Create: `src/test/sidebarState.test.ts`

**Interfaces:**
- Consumes: device, flash, and Linux registries already in `src/`.
- Produces: `SidebarMode`, `SidebarSelection`, `SidebarBootstrapState`, `defaultSidebarSelection()`, `sanitizeSidebarSelection()`, `nextMcuSelection()`, and `buildSidebarState()`.

- [ ] **Step 1: Write the failing tests**

Create `src/test/sidebarState.test.ts` with tests for:

```typescript
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSidebarState,
  defaultSidebarSelection,
  nextMcuSelection,
  sanitizeSidebarSelection
} from '../sidebar/state';

test('defaults to the first STM32 F1 device', () => {
  const selection = defaultSidebarSelection();
  assert.equal(selection.mode, 'mcu');
  assert.equal(selection.mcu.vendor, 'STM');
  assert.equal(selection.mcu.series, 'F1x');
  assert.equal(selection.mcu.part, 'STM32F103C8T6');
  assert.equal(selection.flash.enabled, false);
});

test('replaces stale values with current registry defaults', () => {
  const selection = sanitizeSidebarSelection({
    mode: 'linux',
    mcu: { vendor: 'bad', series: 'bad', part: 'bad' },
    linux: { toolchainFamily: 'bad' },
    debugEnabled: 'yes',
    flash: { enabled: true, targetId: 'bad', probeId: 'bad', openocdPath: '  ' }
  });
  assert.equal(selection.mode, 'linux');
  assert.equal(selection.mcu.part, 'STM32F103C8T6');
  assert.equal(selection.linux.toolchainFamily, 'loongson');
  assert.equal(selection.debugEnabled, false);
  assert.equal(selection.flash.enabled, false);
  assert.equal(selection.flash.probeId, 'stlink');
  assert.equal(selection.flash.openocdPath, 'openocd');
});

test('changing vendor selects its first series and part', () => {
  const updated = nextMcuSelection(defaultSidebarSelection(), { vendor: 'GD' });
  assert.equal(updated.mode, 'mcu');
  assert.equal(updated.mcu.vendor, 'GD');
  assert.equal(updated.mcu.series, 'F1x');
  assert.equal(updated.mcu.part, 'GD32F103C8T6');
});

test('changing series selects its first part', () => {
  const updated = nextMcuSelection(defaultSidebarSelection(), { series: 'F4x' });
  assert.equal(updated.mcu.series, 'F4x');
  assert.match(updated.mcu.part, /^STM32F4/);
});

test('bootstrap filters parts and annotates detected toolchains', () => {
  const state = buildSidebarState(
    'firmware',
    defaultSidebarSelection(),
    [{ family: 'arm', verified: true, binDir: 'C:\\Tools\\arm\\bin', source: 'path' }]
  );
  assert.ok(state.devices.every((device) => device.value.startsWith('STM32F1')));
  assert.ok(state.linuxToolchains.some((toolchain) => toolchain.value === 'arm'));
  assert.match(state.linuxToolchains.find((toolchain) => toolchain.value === 'arm')?.detail ?? '', /PATH/);
});
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npm run compile
node --test out/test/sidebarState.test.js
```

Expected: compile fails because `src/sidebar/state.ts` does not exist.

- [ ] **Step 3: Implement the state module**

Define:

```typescript
export type SidebarMode = 'mcu' | 'linux';

export interface SidebarFlashSelection {
  enabled: boolean;
  targetId: string;
  probeId: string;
  openocdPath: string;
}

export interface SidebarSelection {
  mode: SidebarMode;
  mcu: {
    vendor: DeviceVendor;
    series: DeviceSeries;
    part: string;
  };
  linux: {
    toolchainFamily: LinuxToolchainFamily;
  };
  debugEnabled: boolean;
  flash: SidebarFlashSelection;
}

export interface SidebarOption {
  value: string;
  label: string;
  description?: string;
  detail?: string;
}

export interface SidebarBootstrapState {
  workspaceName: string;
  vendors: SidebarOption[];
  series: SidebarOption[];
  devices: SidebarOption[];
  flashTargets: SidebarOption[];
  flashProbes: SidebarOption[];
  linuxToolchains: SidebarOption[];
  selection: SidebarSelection;
}
```

Implement strict record checks. For MCU changes, require a part that belongs to the selected vendor and series. For bootstrap options, use `listDeviceProfiles()`, `listDeviceSeries()`, `listDeviceProfilesForSeries()`, `listFlashTargetProfiles()`, `listFlashProbeProfiles()`, and `buildLinuxToolchainChoices()`.

Do not import `vscode` in this module.

- [ ] **Step 4: Verify green**

Run:

```powershell
npm run compile
node --test out/test/sidebarState.test.js
```

Expected: five tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/sidebar/state.ts src/test/sidebarState.test.ts
git commit -m "feat: add sidebar selection state"
```

### Task 2: Extract the shared generation workflow

**Files:**
- Create: `src/generation/workflow.ts`
- Create: `src/test/workflow.test.ts`
- Modify: `src/extension.ts`

**Interfaces:**
- Consumes: existing scanner and generators.
- Produces: `ProjectWorkflowHost`, `WorkflowResult`, `generateMcuWorkflow()`, `generateLinuxWorkflow()`, `generateFlashWorkflow()`, `generateDebugWorkflow()`, and `createMcuFiles()`.

```typescript
export interface WorkflowResult {
  kind: 'mcu' | 'linux' | 'flash' | 'debug';
  ok: boolean;
  cancelled?: boolean;
  files: string[];
  message: string;
}

export interface ProjectWorkflowHost {
  workspaceRoot(): string | undefined;
  scanWorkspace(root: string): Promise<ProjectDescription | undefined>;
  confirmOverwrite(existingFiles: string[]): Promise<boolean>;
  updateSettings(settings: Record<string, string | boolean>): Promise<void>;
}
```

- [ ] **Step 1: Write the failing workflow tests**

Create temporary workspaces containing `main.c`. Assert that:

```typescript
const result = await generateMcuWorkflow(host, getDeviceProfile('STM32F103C8T6'), {});
assert.equal(result.ok, true);
assert.ok(result.files.includes('startup_stm32f103xb.S'));
assert.ok(result.files.filter((file) => file.endsWith('.S')).length === 1);
assert.ok(result.files.filter((file) => file.endsWith('.ld')).length === 1);
```

Add a Linux test asserting `.linux-cmake.json`, `CMakeLists.txt`, and `cmake/linux-toolchain.cmake` are returned. Add a cancelled overwrite test asserting no files are written.

- [ ] **Step 2: Verify red**

Run:

```powershell
npm run compile
node --test out/test/workflow.test.js
```

Expected: compile fails because `src/generation/workflow.ts` does not exist.

- [ ] **Step 3: Move the generation bodies**

Move `createGeneratedFiles`, `projectNameFromRoot`, and the reusable parts of `generateProject`, `generateLinuxProject`, `generateFlashScriptOnly`, and `generateDebugConfigurationOnly` from `src/extension.ts` into `src/generation/workflow.ts`.

The workflow must return relative paths via `toWorkspacePath()`, call `findExistingFiles()` before writes, call `confirmOverwrite()` only when collisions exist, and keep all existing file contents unchanged.

The command-palette functions in `extension.ts` remain responsible for Quick Pick selection and for constructing a host with:

```typescript
{
  workspaceRoot: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
  scanWorkspace,
  confirmOverwrite: async (files) => {
    const action = await vscode.window.showWarningMessage(
      `${files.length} generated file(s) already exist. Overwrite them?`,
      'Overwrite',
      'Cancel'
    );
    return action === 'Overwrite';
  },
  updateSettings: updateWorkspaceSettings
}
```

- [ ] **Step 4: Wire the four commands to the workflow**

Keep command IDs and titles unchanged. For MCU generation, preserve the current unexpected-macro filtering in `generateCMakeLists()` and preserve the current selection of flash target and probe.

- [ ] **Step 5: Verify green**

Run:

```powershell
npm run compile
node --test out/test/workflow.test.js out/test/cmakeBuild.test.js out/test/linuxGenerator.test.js
```

Expected: workflow tests pass and existing generation tests still pass.

- [ ] **Step 6: Commit**

```powershell
git add src/generation/workflow.ts src/test/workflow.test.ts src/extension.ts
git commit -m "refactor: share project generation workflow"
```

### Task 3: Add the Webview protocol and HTML shell

**Files:**
- Create: `src/sidebar/messages.ts`
- Create: `src/sidebar/html.ts`
- Create: `src/test/sidebarMessages.test.ts`
- Create: `src/test/sidebarHtml.test.ts`

**Interfaces:**
- Consumes: `SidebarBootstrapState`.
- Produces: `SidebarIncomingMessage`, `SidebarOutgoingMessage`, `parseIncomingMessage()`, and `renderSidebarHtml()`.

```typescript
export type SidebarIncomingMessage =
  | { type: 'ready' }
  | { type: 'saveSelection'; selection: unknown }
  | { type: 'scanWorkspace' }
  | { type: 'generateProject' }
  | { type: 'generateFlashScript' }
  | { type: 'generateDebugConfiguration' }
  | { type: 'openSettings' };
```

- [ ] **Step 1: Write failing tests**

Assert valid messages are accepted, arbitrary strings and objects without a known type are rejected, and `saveSelection` keeps its unknown payload for provider-side sanitization. Assert the HTML includes the nonce, CSS and JS URIs, and IDs `mode-mcu`, `mode-linux`, `generate-project`, and `generation-status`.

- [ ] **Step 2: Verify red**

Run:

```powershell
npm run compile
node --test out/test/sidebarMessages.test.js out/test/sidebarHtml.test.js
```

Expected: compile fails because the modules do not exist.

- [ ] **Step 3: Implement message parsing and CSP HTML**

Use a fixed set of message type literals. Reject arrays and `null`. Escape HTML attributes. Set:

```text
default-src 'none';
style-src <cspSource>;
script-src 'nonce-<nonce>';
```

The HTML loads `src/sidebar/webview/main.css` and `main.js` through `webview.asWebviewUri()`.

- [ ] **Step 4: Verify green**

Run:

```powershell
npm run compile
node --test out/test/sidebarMessages.test.js out/test/sidebarHtml.test.js
```

Expected: both test files pass.

- [ ] **Step 5: Commit**

```powershell
git add src/sidebar/messages.ts src/sidebar/html.ts src/test/sidebarMessages.test.ts src/test/sidebarHtml.test.ts
git commit -m "feat: add sidebar webview protocol"
```

### Task 4: Implement the provider and manifest registration

**Files:**
- Create: `src/sidebar/provider.ts`
- Create: `src/test/sidebarManifest.test.ts`
- Modify: `src/extension.ts`
- Modify: `package.json`
- Create: `images/activity-icon.svg`

**Interfaces:**
- Consumes: `buildSidebarState()`, workflow functions, `discoverLinuxToolchains()`.
- Produces: `SidebarProvider`, `SidebarProvider.viewType`, `refresh()`, and scratch persistence key `cmakeEmbedded.sidebarSelection.v1`.

- [ ] **Step 1: Write failing manifest tests**

Assert:

```typescript
assert.equal(manifest.contributes.viewsContainers.activitybar[0].id, 'cmakeEmbedded');
assert.equal(manifest.contributes.views.cmakeEmbedded[0].id, 'cmakeEmbedded.sidebar');
assert.equal(manifest.contributes.views.cmakeEmbedded[0].type, 'webview');
assert.ok(manifest.activationEvents.includes('onView:cmakeEmbedded.sidebar'));
assert.equal(manifest.readme, 'README.md');
```

- [ ] **Step 2: Verify red**

Run:

```powershell
npm run compile
node --test out/test/sidebarManifest.test.js
```

Expected: manifest assertions fail.

- [ ] **Step 3: Implement the provider**

The provider must:

- load `context.workspaceState.get(KEY)` and sanitize it
- save sanitized selections with `workspaceState.update(KEY, selection)`
- post `state` after restore and every save
- hold `private busy = false`
- ignore duplicate operations while busy
- post `operationStarted` and `operationFinished`
- handle `scanWorkspace`
- handle project, flash-only, and debug-only generation
- execute `workbench.action.openSettings` for settings
- stop posting after the view disposes
- call `refresh()` on workspace-folder or relevant setting changes

Use `vscode.window.registerWebviewViewProvider(..., { webviewOptions: { retainContextWhenHidden: true } })`.

- [ ] **Step 4: Add the manifest and icon**

Add:

```json
"viewsContainers": {
  "activitybar": [
    {
      "id": "cmakeEmbedded",
      "title": "CMake-Embedded",
      "icon": "images/activity-icon.svg"
    }
  ]
},
"views": {
  "cmakeEmbedded": [
    {
      "type": "webview",
      "id": "cmakeEmbedded.sidebar",
      "name": "生成配置"
    }
  ]
}
```

Add `onView:cmakeEmbedded.sidebar` to `activationEvents`. Create a monochrome simple chip-and-sliders SVG at `images/activity-icon.svg` without background color.

- [ ] **Step 5: Register from `activate()`**

Create one provider after command registration. Add it to subscriptions and wire `workspace.onDidChangeWorkspaceFolders`, `workspace.onDidChangeConfiguration`, and `extensions.onDidChange` to refresh relevant state. Do not remove existing command handlers.

- [ ] **Step 6: Verify green**

Run:

```powershell
npm run compile
node --test out/test/sidebarManifest.test.js out/test/packageManifest.test.js
```

Expected: both files pass.

- [ ] **Step 7: Commit**

```powershell
git add package.json src/extension.ts src/sidebar/provider.ts src/test/sidebarManifest.test.ts images/activity-icon.svg
git commit -m "feat: register sidebar generation view"
```

### Task 5: Build the Chinese sidebar renderer

**Files:**
- Create: `src/sidebar/webview/main.js`
- Create: `src/sidebar/webview/main.css`
- Create: `src/test/sidebarAssets.test.ts`
- Modify: `src/sidebar/html.ts`

**Interfaces:**
- Consumes: the five outgoing messages from Task 3.
- Produces: interactive MCU/Linux form with no framework and no remote assets.

- [ ] **Step 1: Write failing asset tests**

Read the JS and CSS assets and assert the JS references `ready`, `saveSelection`, `generateProject`, `generateFlashScript`, and `generateDebugConfiguration`; assert the CSS contains `.app-header`, `.mode-switcher`, `.configuration-panel`, `.option-card`, `.primary-action`, and `@media (max-width: 240px)`; assert neither asset contains `http://` or `https://`.

- [ ] **Step 2: Verify red**

Run:

```powershell
npm run compile
node --test out/test/sidebarAssets.test.js
```

Expected: test fails because the assets do not exist.

- [ ] **Step 3: Implement the renderer**

Build DOM with `document.createElement()` and `textContent`. Render:

- compact header with workspace name and status
- `MCU 固件` / `Linux / SoC` segmented modes
- MCU selects for vendor, series, and part
- Linux select with detection detail
- `生成 flash.py` and `生成 Cortex-Debug 配置` checkboxes
- advanced OpenOCD target, probe, and path controls
- `扫描工作区` and the primary `生成工程` button
- status text and generated relative-path list

Whenever a control changes, send `saveSelection` with the complete selection. On operation start, disable controls. On finish, re-enable controls and show success or error.

- [ ] **Step 4: Implement the compact stylesheet**

Use VS Code theme tokens, 6px or smaller radii, stable button/control heights, wrapping for long descriptions, focus outlines, and a narrow-width media query that stacks all controls vertically.

- [ ] **Step 5: Verify green**

Run:

```powershell
npm run compile
node --test out/test/sidebarAssets.test.js
node --check src/sidebar/webview/main.js
```

Expected: assets test passes and JavaScript syntax check exits 0.

- [ ] **Step 6: Commit**

```powershell
git add src/sidebar/webview/main.js src/sidebar/webview/main.css src/test/sidebarAssets.test.ts src/sidebar/html.ts
git commit -m "feat: add Chinese sidebar renderer"
```

### Task 6: Make Chinese README the default and verify the extension

**Files:**
- Modify: `README.md`
- Keep: `README.zh-CN.md`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: the completed sidebar and generator workflow.
- Produces: Chinese Marketplace documentation and final validation evidence.

- [ ] **Step 1: Replace `README.md` with the Chinese document**

Make `README.md` the same primary structure as `README.zh-CN.md`, updated with:

- the new `CMake-Embedded` Activity Bar entry
- one-form MCU and Linux generation steps
- persisted workspace selections
- a screenshot of the new sidebar after visual QA
- existing command-palette instructions retained
- existing MCU and Linux generation details retained
- a top link `[English documentation](README.md)` removed from the Chinese copy

Keep `README.zh-CN.md` as a Chinese mirror or a short pointer to `README.md`. Set `manifest.readme` to `README.md` only if needed; the file is already the default Marketplace readme.

- [ ] **Step 2: Run complete validation**

Run:

```powershell
npm test
npm run compile
node --check src/sidebar/webview/main.js
git diff --check
```

Expected: zero test failures, compile exits 0, JS syntax check exits 0, and diff check exits 0.

- [ ] **Step 3: Run visual QA**

Render the Webview HTML with representative MCU and Linux state, capture screenshots at normal and narrow widths, and inspect for clipped text, overlapping controls, missing icons, or empty regions. If VS Code Extension Host is available, open the Activity Bar view and confirm its DOM is non-empty.

- [ ] **Step 4: Package without publishing**

Run:

```powershell
npx @vscode/vsce package --no-dependencies
```

Expected: a VSIX is created. Do not remove existing artifacts unless requested.

- [ ] **Step 5: Commit**

```powershell
git add README.md README.zh-CN.md package.json package-lock.json
git commit -m "docs: present Chinese readme and sidebar usage"
```

## Self-review

- Spec coverage: Activity Bar, MCU and Linux forms, persisted selections, flash/debug actions, shared generation, CSP, tests, and Chinese README all map to Tasks 1 through 6.
- Type consistency: `SidebarSelection`, `SidebarBootstrapState`, `WorkflowResult`, and message names are defined before their consumers.
- No production behavior is added before its focused failing test.
- Visual QA and packaging are included after functional validation.
