/**
 * Derives the Linux build inputs from a workspace scan.
 *
 * This mirrors the MCU direction, where selecting a device and scanning the
 * workspace is enough to generate everything: there is no extra question about
 * project layout. CMakeLists.txt is written to the workspace root and every
 * source file the scanner found is listed explicitly.
 *
 * Preprocessor definitions come from the caller (a previous .linux-cmake.json),
 * because the scanner only collects MCU vendor macros.
 */

import type { ProjectDescription } from '../scanner/projectScanner';
import type { LinuxProjectStructure } from './types';

export function describeLinuxProject(
  project: ProjectDescription,
  targetName: string,
  defines: string[] = []
): LinuxProjectStructure {
  return {
    sources: [...project.sources],
    includeDirs: [...project.includeDirs],
    defines: [...defines],
    targetName,
    targetType: 'executable',
    cStandard: 11,
    cxxStandard: 17
  };
}
