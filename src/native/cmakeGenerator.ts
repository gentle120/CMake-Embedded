import { preserveUserCodeSection, userCodeSection } from '../shared/userCodeSection';
import type { NativeProjectStructure } from './types';

function quotedPath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/"/g, '\\"');
  return `"\${NATIVE_PROJECT_ROOT}/${normalized}"`;
}

function indented(values: string[]): string {
  return values.map((value) => `    ${value}`).join('\n');
}

function targetDeclaration(structure: NativeProjectStructure): string {
  if (structure.targetType === 'static') {
    return `add_library(${structure.targetName} STATIC)`;
  }
  if (structure.targetType === 'shared') {
    return `add_library(${structure.targetName} SHARED)`;
  }
  return `add_executable(${structure.targetName})`;
}

export function generateNativeCMakeLists(
  structure: NativeProjectStructure,
  existingContent?: string
): string {
  const hasCxx = structure.sources.some((source) => /\.(cc|cpp|cxx)$/i.test(source));
  const hasAsm = structure.sources.some((source) => /\.s$/i.test(source));
  const languages = ['C', hasCxx ? 'CXX' : undefined, hasAsm ? 'ASM' : undefined]
    .filter((language): language is string => language !== undefined)
    .join(' ');
  const sourceBlock = indented(structure.sources.map(quotedPath));
  const includeBlock = structure.includeDirs.length === 0
    ? `    ${quotedPath('.')}`
    : indented(structure.includeDirs.map(quotedPath));
  const defineBlock = indented(structure.defines);

  const generated = `cmake_minimum_required(VERSION 3.22)

set(CMAKE_C_STANDARD ${structure.cStandard})
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_CXX_STANDARD ${structure.cxxStandard})
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "Debug")
endif()

set(CMAKE_PROJECT_NAME ${structure.targetName})
set(CMAKE_EXPORT_COMPILE_COMMANDS TRUE)

project(\${CMAKE_PROJECT_NAME} ${languages})
message("Build type: " \${CMAKE_BUILD_TYPE})

set(NATIVE_PROJECT_ROOT "\${CMAKE_CURRENT_SOURCE_DIR}")

set(NATIVE_SOURCES
${sourceBlock}
)

${targetDeclaration(structure)}
target_sources(${structure.targetName} PRIVATE \${NATIVE_SOURCES})

target_include_directories(${structure.targetName} PRIVATE
${includeBlock}
)

target_compile_definitions(${structure.targetName} PRIVATE
${defineBlock}
)

${userCodeSection()}
`;

  return preserveUserCodeSection(existingContent, generated);
}
