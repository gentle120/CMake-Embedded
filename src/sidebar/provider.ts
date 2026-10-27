import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import { getDeviceProfile } from '../devices/deviceProfiles';
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
import type { LinuxToolchainFamily } from '../linux/types';
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
  private readonly messageDisposable?: vscode.Disposable;

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

    const disposable = view.webview.onDidReceiveMessage((value) => {
      const message = parseIncomingMessage(value);
      if (!message) {
        return;
      }
      void this.handleMessage(message);
    });
    view.onDidDispose(() => {
      disposable.dispose();
      this.view = undefined;
    });
  }

  selection(): SidebarSelection {
    return sanitizeSidebarSelection(this.selectionValue);
  }

  refresh(): void {
    this.postState();
  }

  dispose(): void {
    this.disposed = true;
    this.view = undefined;
    this.messageDisposable?.dispose();
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
    this.selectionValue = sanitizeSidebarSelection(value, this.selectionValue);
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
      return;
    }
    if (message.type === 'saveSelection') {
      await this.saveSelection(message.selection);
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
        return generateMcuWorkflow(this.workflowHost(), profile, { flash });
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
