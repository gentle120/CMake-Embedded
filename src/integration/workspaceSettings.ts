export type WorkspaceSettingValue = string | boolean;

export interface WorkspaceIntegration {
  cmakeTools: {
    preset: string;
    configurePreset: string;
    buildPreset: string;
    settingsFile: string;
  };
  cppTools: {
    configurationSource: string;
    compileCommands: string;
    dimInactiveRegions: boolean;
  };
}

const workspaceSettings: Record<string, WorkspaceSettingValue> = {
  'cmake.useCMakePresets': 'always',
  'cmake.configureOnOpen': true,
  'C_Cpp.intelliSenseEngine': 'default',
  'C_Cpp.default.compileCommands': '${workspaceFolder}/build/debug/compile_commands.json',
  'C_Cpp.dimInactiveRegions': true
};

const workspaceIntegration: WorkspaceIntegration = {
  cmakeTools: {
    preset: 'debug',
    configurePreset: 'debug',
    buildPreset: 'debug',
    settingsFile: '.vscode/settings.json'
  },
  cppTools: {
    configurationSource: 'CMake compile_commands.json',
    compileCommands: 'build/debug/compile_commands.json',
    dimInactiveRegions: true
  }
};

export function getWorkspaceSettings(): Record<string, WorkspaceSettingValue> {
  return { ...workspaceSettings };
}

export function getWorkspaceIntegration(): WorkspaceIntegration {
  return {
    cmakeTools: { ...workspaceIntegration.cmakeTools },
    cppTools: { ...workspaceIntegration.cppTools }
  };
}
