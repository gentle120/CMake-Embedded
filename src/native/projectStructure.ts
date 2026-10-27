import type { ProjectDescription } from '../scanner/projectScanner';
import type { NativeProjectStructure, NativeTargetType } from './types';

export function describeNativeProject(
  project: ProjectDescription,
  targetName: string,
  options: {
    targetType?: NativeTargetType;
    defines?: string[];
    cStandard?: number;
    cxxStandard?: number;
  } = {}
): NativeProjectStructure {
  return {
    sources: [...project.sources],
    includeDirs: [...project.includeDirs],
    defines: [...new Set([...project.defines, ...(options.defines ?? [])])].sort(),
    targetName,
    targetType: options.targetType ?? 'executable',
    cStandard: options.cStandard ?? 11,
    cxxStandard: options.cxxStandard ?? 17
  };
}
