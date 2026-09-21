/**
 * Generates .linux-cmake.json, the record of one generated Linux project.
 *
 * The expanded source file list is intentionally not stored: `sourceRoots` is,
 * so regenerating re-scans the directories and picks up new files.
 */

import { getLinuxWorkspaceIntegration } from './integration';
import type { LinuxProjectStructure, LinuxToolchain, LinuxToolchainHit } from './types';

function isHit(toolchain: LinuxToolchain | LinuxToolchainHit): toolchain is LinuxToolchainHit {
  return 'source' in toolchain;
}

export function generateLinuxProjectConfig(
  projectName: string,
  toolchain: LinuxToolchain | LinuxToolchainHit,
  structure: LinuxProjectStructure,
  generatedFiles: string[],
  overwrittenFiles: string[]
): string {
  const toolchainConfig: Record<string, unknown> = {
    family: toolchain.family,
    processor: toolchain.processor,
    compilerPrefix: toolchain.compilerPrefix,
    targetFlags: toolchain.targetFlags
  };
  if (isHit(toolchain)) {
    toolchainConfig.source = toolchain.source;
    toolchainConfig.verified = toolchain.verified;
    if (toolchain.binDir) {
      toolchainConfig.binDir = toolchain.binDir;
    }
  }

  const config = {
    projectName,
    kind: 'linux',
    toolchain: toolchainConfig,
    structure: {
      sourceCount: structure.sources.length,
      includeDirs: [...structure.includeDirs],
      defines: [...structure.defines],
      targetName: structure.targetName,
      targetType: structure.targetType,
      cStandard: structure.cStandard,
      cxxStandard: structure.cxxStandard
    },
    integration: getLinuxWorkspaceIntegration(),
    generatedFiles,
    overwrittenFiles
  };

  return `${JSON.stringify(config, null, 2)}\n`;
}
