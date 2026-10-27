# Sidebar Project Generation

## Goal

Add a dedicated CMake-Embedded Activity Bar view that makes MCU and Linux
project generation available from one compact sidebar. The sidebar replaces
the current chain of context-free Quick Pick dialogs with a visible form that
keeps the workspace, target selection, optional flash/debug choices, and
generation result in one place.

The existing command-palette commands remain supported.

## Non-goals

- Do not change CMake, linker, startup, runtime, toolchain, flash, or debug
  output formats.
- Do not add probe discovery, flashing, debugging, or board communication.
- Do not add vendor SDK management or chip auto-detection.
- Do not copy EmberProbe hardware services or its monolithic webview provider.
- Do not remove the existing command-palette generation flows.

## User Experience

### Activity Bar

The extension contributes an Activity Bar container and one Webview view named
`CMake-Embedded`. The icon reuses the extension's existing branding.

The view has four regions:

1. Header: extension name, current workspace name, and an idle, scanning,
   generating, success, or error status.
2. Mode selector: `MCU` and `Linux` segmented controls.
3. Configuration form for the selected mode.
4. Sticky action area with the primary `Generate Project` action and compact
   secondary actions.

The layout uses VS Code theme variables and remains usable at the default
Activity Bar sidebar width. Long names truncate or wrap without overlapping
controls. Controls expose native labels and keyboard focus states.

### MCU Mode

The form exposes:

- vendor
- series
- exact MCU part
- workspace scan summary
- optional `Generate flash.py`
- optional `Generate debug configuration`
- advanced OpenOCD target, probe, and path values when flash is enabled

Changing vendor updates the available series. Changing series updates the
available parts. The selected part shows memory, core, and family details.

The generated files remain the current MCU set. The sidebar must not omit the
single generated startup source or the single generated linker script.

### Linux Mode

The form exposes:

- workspace scan summary
- supported cross-toolchain family
- detection source and compiler path when available
- unverified status when the selected toolchain is not installed

The generated files remain the current Linux set. The previous
`.linux-cmake.json` toolchain family and defines continue to be read by the
existing workflow.

### Actions and Feedback

`Generate Project` runs the same overwrite checks and file writes as the
command-palette flow.

While scanning or generating:

- repeat actions are disabled
- the header reports the active operation
- success lists the generated files by workspace-relative path
- failures show a concise message and keep the current selections intact
- overwrite confirmation remains a native VS Code modal dialog

Secondary actions generate only the OpenOCD flash script or Cortex-Debug
configuration. Actions appear in the mode where they are valid.

## Architecture

### Manifest

`package.json` adds:

- one Activity Bar `viewsContainers` entry
- one Webview `views` entry
- an activation event for the view
- no new setting for sidebar state

The view is registered from `activate()` with
`vscode.window.registerWebviewViewProvider`.

### Host Components

Create focused modules under `src/sidebar/`:

- `sidebarProvider.ts`: Webview setup, message routing, operation lock, and
  posting view state
- `sidebarState.ts`: serializable view model, defaults, option lookup, and
  workspace-state restore/save helpers
- `generationService.ts`: shared MCU, Linux, flash, and debug generation
  operations used by both sidebar and command-palette entry points
- `webviewHtml.ts`: CSP-safe HTML shell and asset URI generation
- `webview/main.js`: browser-side rendering and event dispatch
- `webview/main.css`: Activity Bar layout using VS Code theme variables

The provider must not contain generator templates or hardware operations.
Generation calls existing generator modules through the shared service.

### Shared Generation Service

Move the command handlers' reusable workflow logic out of `extension.ts` into
`src/sidebar/generationService.ts`, or a neutral shared workflow module if the
service outgrows the sidebar namespace. The service owns:

- scanning the workspace
- resolving MCU and Linux selections
- collecting generated files
- overwrite checks
- writes and workspace integration updates
- flash-only and debug-only generation

Command registration and Quick Pick collection remain in `extension.ts`.
Sidebar selections are converted into the same request objects passed to the
service, so the two entry points cannot drift.

Only one generation operation may run in a workspace at a time. The service
returns a result object containing operation kind, success, relative generated
paths, and a user-facing message. Expected cancellation is not reported as an
error.

### Webview Messages

Browser-to-host messages:

- `ready`
- `scanWorkspace`
- `saveSelection`
- `generateProject`
- `generateFlashScript`
- `generateDebugConfiguration`
- `openSettings`

Host-to-browser messages:

- `state`
- `operationStarted`
- `operationFinished`
- `workspaceScan`
- `notification`

Every message is validated before use. The webview uses a nonce-based Content
Security Policy and loads only extension-local assets through `asWebviewUri`.

### Persistence

Selections are saved in `context.workspaceState` under one versioned key.
Persisted data includes:

- active mode
- MCU vendor, series, and part
- Linux toolchain family
- flash and debug option flags
- selected flash target, probe, and OpenOCD path override

File lists, transient progress, errors, and scan results are not persisted.
Invalid or stale IDs are discarded and replaced with current defaults.

## Interaction Flow

### Initial Render

1. The provider loads and sanitizes the saved selection.
2. It posts the current registry options and restored selection.
3. The webview renders the form immediately.
4. The user may scan explicitly; generation always performs a fresh scan.

### Project Generation

1. The webview sends the complete current selection.
2. The host validates it against current registries.
3. The shared service scans the workspace.
4. Missing source files stop the operation with an actionable message.
5. The service computes all generated files and checks overwrite collisions.
6. A native warning requests overwrite confirmation.
7. The service writes files and updates CMake Tools and IntelliSense settings.
8. The host posts success and the relative generated paths.

### Flash or Debug Generation

The host validates the selected target and probe, uses the existing generators,
and reports only the file it changed. Flash generation retains its current
overwrite confirmation.

## Error Handling

- No workspace: disable generation and tell the user to open a folder.
- No C/C++ or assembly sources: stop before overwrite or write steps.
- Unknown profile, target, probe, or toolchain: reject the stale selection and
  return a state refresh.
- Malformed existing JSON: report the file and parse failure without replacing
  it.
- Busy operation: ignore duplicate requests and keep the active operation
  status visible.
- Webview disposal: the host may finish an already confirmed filesystem write;
  it must not post to a disposed view.
- Settings update failure: report a warning after generated files have been
  written, as the current command flow does.

## Testing

Add focused tests for:

- manifest Activity Bar, view, icon, and activation registration
- state defaults, sanitization, workspace persistence, and stale selection
- option filtering by vendor and series
- typed message validation
- shared service calls for MCU, Linux, flash, and debug generation
- operation-lock behavior
- CSP nonce and local webview asset paths
- presence of mode controls, selection controls, action buttons, and status
  regions in the built HTML or assets

Run the existing full suite to protect generator behavior. Add a real Extension
Host smoke check that opens the view and verifies the root webview DOM is
non-empty. Capture desktop and narrow-sidebar screenshots for visual review.
Record any unavailable Extension Host or ARM GNU build dependency separately.

## Acceptance Criteria

- A CMake-Embedded icon appears in the Activity Bar and opens the sidebar.
- MCU users can pick vendor, series, and part without a Quick Pick chain, then
  generate the same project files as the command-palette flow.
- Linux users can select a detected or unverified cross toolchain and generate
  the same project files as the command-palette flow.
- Flash and debug options remain independently selectable.
- Selections survive a window reload per workspace.
- Existing commands, generated templates, and tests continue to work.
- The sidebar remains readable and operable at narrow and normal widths.
