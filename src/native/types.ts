export type NativeTargetType = 'executable' | 'static' | 'shared';

export interface NativeProjectStructure {
  sources: string[];
  includeDirs: string[];
  defines: string[];
  targetName: string;
  targetType: NativeTargetType;
  cStandard: number;
  cxxStandard: number;
}

export const nativeConfigFileName = '.native-cmake.json';
