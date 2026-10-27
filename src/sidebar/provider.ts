import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { getDeviceProfile, listDeviceProfiles } from '../devices/deviceProfiles';
import { listDeviceProfilesForSeries, listDeviceSeries } from '../devices/deviceSelection';
import { getFlashProbeProfile } from '../flash/probeProfiles';
import { getFlashTargetProfile } from '../flash/targets/targetProfiles';
import {
  generateDebugWorkflow,
  generateFlashWorkflow,
  generateLinuxWorkflow,
  generateMcuWorkflow,
  type ProjectWorkflowHost,
  type WorkflowResult
} from '../generation/workflow';
import { discoverLinuxToolchains } from '../linux/discovery';
import { createLinuxToolchain } from '../linux/toolchainGenerator';
import { scanProject } from '../scanner/projectScanner';
import { renderSidebarHtml } from './html';
import { parseIncomingMessage, type SidebarIncomingMessage } from './messages';
import {
  buildSidebarState,
  sanitizeSidebarSelection,
  type SidebarSelection
} from './state';

const selectionKey = 'cmakeEmbedded.sidebarSelection.v1';

export interface SidebarProviderDependencies {
  workflow: ProjectWorkflowHost;
  confirmOverwrite(files: string[]): Promise<boolean>;
  discoverToolchains(): ReturnType<typeof discoverLinuxToolchains>;
}

function workspaceName(): string {
  const root = vscode.workspace.workspaceFolders?.[0];
  return root?.name ?? '未打开工作区';
}

function normalizeResult(result: WorkflowResult): {
  ok: boolean;
  message: string;
  files: string[];
} {
  return {
    ok: result.ok,
    message: result.message,
    files: result.files
  };
}

export class SidebarProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  static readonly viewType = 'cmakeEmbedded.sidebar';

  private view?: vscode.WebviewView;
  private disposed = false;
  private busy = false;
  private selectionValue: SidebarSelection;
  private readonly viewDisposables: vscode.Disposable[] = [];

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly dependencies: SidebarProviderDependencies
  ) {
    this.selectionValue = sanitizeSidebarSelection(
      context.workspaceState.get(selectionKey)
    );
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri]
    };
    const nonce = randomBytes(16).toString('base64');
    view.webview.html = renderSidebarHtml(view.webview, this.context.extensionUri, nonce);

    const messageDisposable = view.webview.onDidReceiveMessage((value) => {
      const message = parseIncomingMessage(value);
      if (!message) {
        return;
      }
      void this.handleMessage(message).catch((error) => {
        const text = error instanceof Error ? error.message : String(error);
        this.post({ type: 'notification', level: 'error', message: text });
      });
    });
    const viewDisposable = view.onDidDispose(() => {
      messageDisposable.dispose();
      viewDisposable.dispose();
      this.viewDisposables.splice(0).forEach((disposable) => {
        if (disposable !== viewDisposable) {
          disposable.dispose();
        }
      });
      this.view = undefined;
    });
    this.viewDisposables.push(messageDisposable, viewDisposable);
  }

  selection(): SidebarSelection {
    return sanitizeSidebarSelection(this.selectionValue);
  }

  refresh(): void {
    this.postState();
  }

  dispose(): void {
    this.disposed = true;
    this.viewDisposables.splice(0).forEach((disposable) => disposable.dispose());
    this.view = undefined;
  }

  private post(message: unknown): void {
    if (!this.disposed && this.view) {
      void this.view.webview.postMessage(message);
    }
  }

  private state() {
    return buildSidebarState(
      workspaceName(),
      this.selectionValue,
      this.dependencies.discoverToolchains()
    );
  }

  private postState(): void {
    this.post({ type: 'state', state: this.state() });
  }

  private async saveSelection(value: unknown): Promise<void> {
    const previous = this.selectionValue;
    this.selectionValue = sanitizeSidebarSelection(value, previous);
    const vendorChanged = this.selectionValue.mcu.vendor !== previous.mcu.vendor;
    const seriesChanged = this.selectionValue.mcu.series !== previous.mcu.series;
    if (vendorChanged || seriesChanged) {
      const profiles = listDeviceProfiles();
      const nextSeries = vendorChanged
        ? listDeviceSeries(profiles, this.selectionValue.mcu.vendor)[0]
        : this.selectionValue.mcu.series;
      const nextPart = listDeviceProfilesForSeries(
        profiles,
        this.selectionValue.mcu.vendor,
        nextSeries
      )[0]?.part;
      this.selectionValue = sanitizeSidebarSelection({
        ...this.selectionValue,
        mcu: {
          vendor: this.selectionValue.mcu.vendor,
          series: nextSeries,
          part: nextPart
        }
      }, previous);
    }
    await this.context.workspaceState.update(selectionKey, this.selectionValue);
    this.postState();
  }

  private async confirmOverwrite(files: string[]): Promise<boolean> {
    return this.dependencies.confirmOverwrite(files);
  }

  private workflowHost(): ProjectWorkflowHost {
    return {
      ...this.dependencies.workflow,
      confirmOverwrite: (files) => this.confirmOverwrite(files)
    };
  }

  private async runGeneration(operation: string, run: () => Promise<WorkflowResult>): Promise<void> {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.post({ type: 'operationStarted', operation });
    try {
      const result = await run();
      this.post({
        type: 'operationFinished',
        result: normalizeResult(result)
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.post({
        type: 'operationFinished',
        result: { ok: false, message, files: [] }
      });
    } finally {
      this.busy = false;
    }
  }

  private toolchainForSelection() {
    const family = this.selectionValue.linux.toolchainFamily;
    const hit = this.dependencies.discoverToolchains().find((candidate) => candidate.family === family);
    return hit ?? createLinuxToolchain(family);
  }

  private async handleMessage(message: SidebarIncomingMessage): Promise<void> {
    if (message.type === 'ready') {
      this.postState();
      if (this.selectionValue.debugEnabled) {
        this.post({
          type: 'notification',
          level: 'info',
          message: '下次生成工程时会同时更新 Cortex-Debug 配置。'
        });
      }
      return;
    }
    if (message.type === 'saveSelection') {
      try {
        await this.saveSelection(message.selection);
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        this.post({
          type: 'notification',
          level: 'warning',
          message: `无法保存侧栏选择：${text}`
        });
      }
      return;
    }
    if (message.type === 'scanWorkspace') {
      await this.scan();
      return;
    }
    if (message.type === 'openSettings') {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:gentle120.cmake-embedded'
      );
      return;
    }
    if (message.type === 'generateProject') {
      await this.runGeneration('正在生成工程', async () => {
        if (this.selectionValue.mode === 'linux') {
          return generateLinuxWorkflow(this.workflowHost(), this.toolchainForSelection());
        }
        const profile = getDeviceProfile(this.selectionValue.mcu.part);
        const flash = this.selectionValue.flash.enabled
          ? {
              target: getFlashTargetProfile(this.selectionValue.flash.targetId),
              probe: getFlashProbeProfile(this.selectionValue.flash.probeId),
              openocdPath: this.selectionValue.flash.openocdPath
            }
          : undefined;
        const project = await generateMcuWorkflow(this.workflowHost(), profile, { flash });
        if (!project.ok || !this.selectionValue.debugEnabled) {
          return project;
        }
        const debug = await generateDebugWorkflow(
          this.workflowHost(),
          getFlashTargetProfile(this.selectionValue.flash.targetId),
          getFlashProbeProfile(this.selectionValue.flash.probeId),
          this.selectionValue.flash.openocdPath
        );
        return {
          ...project,
          ok: debug.ok,
          files: [...project.files, ...debug.files],
          message: `${project.message} ${debug.message}`
        };
      });
      return;
    }
    if (message.type === 'generateFlashScript') {
      await this.runGeneration('正在生成 flash.py', () =>
        generateFlashWorkflow(
          this.workflowHost(),
          getFlashTargetProfile(this.selectionValue.flash.targetId),
          getFlashProbeProfile(this.selectionValue.flash.probeId),
          this.selectionValue.flash.openocdPath
        )
      );
      return;
    }
    if (message.type === 'generateDebugConfiguration') {
      await this.runGeneration('正在生成调试配置', () =>
        generateDebugWorkflow(
          this.workflowHost(),
          getFlashTargetProfile(this.selectionValue.flash.targetId),
          getFlashProbeProfile(this.selectionValue.flash.probeId),
          this.selectionValue.flash.openocdPath
        )
      );
    }
  }

  private async scan(): Promise<void> {
    const root = this.dependencies.workflow.workspaceRoot();
    if (!root) {
      this.post({
        type: 'notification',
        level: 'warning',
        message: '请先打开一个工程目录。'
      });
      return;
    }
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.post({ type: 'operationStarted', operation: '正在扫描工作区' });
    try {
      const project = await scanProject(root);
      this.post({
        type: 'workspaceScan',
        sources: project.sources.length,
        includeDirs: project.includeDirs.length,
        defines: project.defines.length
      });
      this.post({
        type: 'operationFinished',
        result: {
          ok: true,
          message: `扫描完成：${project.sources.length} 个源文件。`,
          files: []
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.post({
        type: 'operationFinished',
        result: { ok: false, message, files: [] }
      });
    } finally {
      this.busy = false;
    }
  }
}
