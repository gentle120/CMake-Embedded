import * as vscode from 'vscode';
import { getDeviceProfile, listDeviceProfiles, type DeviceSeries, type DeviceVendor } from './devices/deviceProfiles';
import { listDeviceProfilesForSeries, listDeviceSeries, listDeviceVendors } from './devices/deviceSelection';
import { getFlashProbeProfile, listFlashProbeProfiles, type FlashProbeProfile } from './flash/probeProfiles';
import {
  getFlashTargetProfile,
  getFlashTargetProfileForDevice,
  listFlashTargetProfiles,
  listFlashTargetSeries,
  listFlashTargetVendors,
  listFlashTargetsForSeries,
  type FlashTargetProfile
} from './flash/targets/targetProfiles';
import {
  generateDebugWorkflow,
  generateFlashWorkflow,
  generateLinuxWorkflow,
  generateMcuWorkflow,
  type ProjectWorkflowHost,
  type WorkflowResult
} from './generation/workflow';
import { readLinuxProjectConfig } from './linux/projectConfig';
import { discoverLinuxToolchains } from './linux/discovery';
import { selectLinuxToolchain } from './linux/selection';
import { linuxConfigFileName } from './linux/types';
import { scanProject, ScanCancelledError, type ProjectDescription } from './scanner/projectScanner';
import { SidebarProvider } from './sidebar/provider';

async function scanWorkspace(root: string): Promise<ProjectDescription | undefined> {
  try {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '正在扫描工作区源文件...',
        cancellable: true
      },
      async (_progress, token) => {
        const controller = new AbortController();
        token.onCancellationRequested(() => controller.abort());
        return scanProject(root, { signal: controller.signal });
      }
    );
  } catch (error) {
    if (error instanceof ScanCancelledError) {
      vscode.window.showInformationMessage('已取消工作区扫描。');
      return undefined;
    }
    throw error;
  }
}

async function updateWorkspaceSettings(settings: Record<string, string | boolean>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    const separator = key.indexOf('.');
    const section = key.slice(0, separator);
    const setting = key.slice(separator + 1);
    await vscode.workspace.getConfiguration(section).update(
      setting,
      value,
      vscode.ConfigurationTarget.Workspace
    );
  }
}

function createWorkflowHost(): ProjectWorkflowHost {
  return {
    workspaceRoot: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
    scanWorkspace,
    confirmOverwrite: async (files) => {
      const action = await vscode.window.showWarningMessage(
        `已有 ${files.length} 个生成文件存在，是否覆盖？`,
        '覆盖',
        '取消'
      );
      return action === '覆盖';
    },
    updateSettings: async (settings) => {
      try {
        await updateWorkspaceSettings(settings);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        vscode.window.showWarningMessage(`CMake Tools / IntelliSense 设置未更新：${message}`);
      }
    }
  };
}

function reportWorkflowResult(result: WorkflowResult): void {
  if (result.cancelled) {
    return;
  }
  if (result.ok) {
    vscode.window.showInformationMessage(result.message);
  } else {
    vscode.window.showErrorMessage(result.message);
  }
}

async function selectDeviceProfile(): Promise<ReturnType<typeof getDeviceProfile> | undefined> {
  const profiles = listDeviceProfiles();
  const vendorSelection = await vscode.window.showQuickPick(
    listDeviceVendors(profiles).map((vendor) => ({
      label: vendor === 'STM' ? 'STM32' : 'GD32',
      description: `${profiles.filter((profile) => profile.vendor === vendor).length} 个支持的型号`,
      vendor
    })),
    { placeHolder: '选择 MCU 厂商' }
  );
  if (!vendorSelection) {
    return undefined;
  }

  const vendor = vendorSelection.vendor as DeviceVendor;
  const seriesSelection = await vscode.window.showQuickPick(
    listDeviceSeries(profiles, vendor).map((series) => {
      const seriesProfiles = listDeviceProfilesForSeries(profiles, vendor, series);
      return {
        label: seriesProfiles[0]?.family ?? series,
        description: `${seriesProfiles.length} 个支持的型号`,
        detail: `${seriesProfiles[0]?.core ?? 'ARM'} MCU 系列`,
        series
      };
    }),
    { placeHolder: `选择 MCU 系列（${vendorSelection.label}）` }
  );
  if (!seriesSelection) {
    return undefined;
  }

  const series = seriesSelection.series as DeviceSeries;
  const deviceSelection = await vscode.window.showQuickPick(
    listDeviceProfilesForSeries(profiles, vendor, series).map((profile) => ({
      label: profile.part,
      description: `${profile.family} / ${profile.core}`,
      detail: `${profile.flash.length / 1024} KB Flash，${profile.ram.length / 1024} KB RAM`
    })),
    { placeHolder: `选择 MCU 型号（${seriesSelection.label}）` }
  );
  return deviceSelection ? getDeviceProfile(deviceSelection.label) : undefined;
}

async function selectFlashProbe(): Promise<FlashProbeProfile | undefined> {
  const selection = await vscode.window.showQuickPick(
    listFlashProbeProfiles().map((profile) => ({
      label: profile.label,
      description: profile.interfaceConfig,
      id: profile.id
    })),
    { placeHolder: '选择 OpenOCD 调试器' }
  );
  return selection ? getFlashProbeProfile(selection.id) : undefined;
}

async function selectFlashTarget(): Promise<FlashTargetProfile | undefined> {
  const targets = listFlashTargetProfiles();
  const vendorSelection = await vscode.window.showQuickPick(
    listFlashTargetVendors().map((vendor) => ({
      label: vendor,
      description: `${targets.filter((target) => target.vendor === vendor).length} 个 OpenOCD target`,
      vendor
    })),
    { placeHolder: '选择 OpenOCD target 厂商' }
  );
  if (!vendorSelection) {
    return undefined;
  }

  const seriesSelection = await vscode.window.showQuickPick(
    listFlashTargetSeries(vendorSelection.vendor).map((series) => {
      const seriesTargets = listFlashTargetsForSeries(vendorSelection.vendor, series);
      return {
        label: seriesTargets[0]?.label ?? series,
        description: `${seriesTargets.length} 个 OpenOCD target`,
        series
      };
    }),
    { placeHolder: `选择 OpenOCD target 系列（${vendorSelection.label}）` }
  );
  if (!seriesSelection) {
    return undefined;
  }

  const targetSelection = await vscode.window.showQuickPick(
    listFlashTargetsForSeries(vendorSelection.vendor, seriesSelection.series).map((target) => ({
      label: target.label,
      description: `${target.vendor} / ${target.series}`,
      detail: `${target.targetConfig} / ${target.transport}`,
      id: target.id
    })),
    { placeHolder: `选择 OpenOCD target（${seriesSelection.label}）` }
  );
  return targetSelection ? getFlashTargetProfile(targetSelection.id) : undefined;
}

async function shouldGenerateFlashScript(): Promise<boolean | undefined> {
  const selection = await vscode.window.showQuickPick(
    [
      { label: '同时生成 flash.py', value: true },
      { label: '暂不生成 flash.py', value: false }
    ],
    { placeHolder: '是否生成 OpenOCD 烧录脚本？' }
  );
  return selection?.value;
}

function getOpenOcdPath(): string {
  return vscode.workspace.getConfiguration('cmakeEmbedded')
    .get<string>('openocdPath', 'openocd')?.trim() || 'openocd';
}

function getArmToolchainPath(): string | undefined {
  return vscode.workspace.getConfiguration('cmakeEmbedded')
    .get<string>('armToolchainPath', '')?.trim() || undefined;
}

async function ensureCortexDebugInstalled(): Promise<boolean> {
  if (vscode.extensions.getExtension('marus25.cortex-debug')) {
    return true;
  }
  const action = await vscode.window.showWarningMessage(
    '生成调试配置需要 Cortex-Debug。',
    '安装',
    '继续'
  );
  if (action === '安装') {
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      'marus25.cortex-debug'
    );
    return false;
  }
  return action === '继续';
}

async function generateDebugConfigurationOnly(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    vscode.window.showErrorMessage('请先打开一个 MCU 工程目录。');
    return;
  }
  if (!(await ensureCortexDebugInstalled())) {
    return;
  }
  const target = await selectFlashTarget();
  if (!target) {
    return;
  }
  const probe = await selectFlashProbe();
  if (!probe) {
    return;
  }
  reportWorkflowResult(await generateDebugWorkflow(
    createWorkflowHost(),
    target,
    probe,
    getOpenOcdPath(),
    getArmToolchainPath()
  ));
}

async function generateFlashScriptOnly(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    vscode.window.showErrorMessage('请先打开一个 MCU 工程目录。');
    return;
  }
  const target = await selectFlashTarget();
  if (!target) {
    return;
  }
  const probe = await selectFlashProbe();
  if (!probe) {
    return;
  }
  reportWorkflowResult(await generateFlashWorkflow(
    createWorkflowHost(),
    target,
    probe,
    getOpenOcdPath()
  ));
}

async function generateProject(): Promise<void> {
  const profile = await selectDeviceProfile();
  if (!profile) {
    return;
  }
  const generateFlash = await shouldGenerateFlashScript();
  if (generateFlash === undefined) {
    return;
  }
  let flash: {
    target: FlashTargetProfile;
    probe: FlashProbeProfile;
    openocdPath: string;
  } | undefined;
  if (generateFlash) {
    const probe = await selectFlashProbe();
    if (!probe) {
      return;
    }
    flash = {
      target: getFlashTargetProfileForDevice(profile),
      probe,
      openocdPath: getOpenOcdPath()
    };
  }
  reportWorkflowResult(await generateMcuWorkflow(
    createWorkflowHost(),
    profile,
    { flash }
  ));
}

async function generateLinuxProject(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    vscode.window.showErrorMessage('请先打开一个工程目录。');
    return;
  }
  const saved = await readLinuxProjectConfig(`${root}/${linuxConfigFileName}`);
  const toolchain = await selectLinuxToolchain(saved?.toolchainFamily);
  if (!toolchain) {
    return;
  }
  reportWorkflowResult(await generateLinuxWorkflow(createWorkflowHost(), toolchain));
}

export function activate(context: vscode.ExtensionContext): void {
  const host = createWorkflowHost();
  const sidebarProvider = new SidebarProvider(context, {
    workflow: host,
    confirmOverwrite: async (files) => {
      const action = await vscode.window.showWarningMessage(
        `已有 ${files.length} 个生成文件存在，是否覆盖？`,
        '覆盖',
        '取消'
      );
      return action === '覆盖';
    },
    discoverToolchains: () => discoverLinuxToolchains()
  });
  context.subscriptions.push(
    vscode.commands.registerCommand('cmakeEmbedded.generateMcu', () => generateProject()),
    vscode.commands.registerCommand('cmakeEmbedded.generateLinux', () => generateLinuxProject()),
    vscode.commands.registerCommand('cmakeEmbedded.generateFlashScript', () => generateFlashScriptOnly()),
    vscode.commands.registerCommand(
      'cmakeEmbedded.generateDebugConfiguration',
      () => generateDebugConfigurationOnly()
    ),
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    sidebarProvider,
    vscode.workspace.onDidChangeWorkspaceFolders(() => sidebarProvider.refresh()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('cmakeEmbedded')) {
        sidebarProvider.refresh();
      }
    })
  );
}

export function deactivate(): void {
  // No extension-level resources need cleanup.
}
