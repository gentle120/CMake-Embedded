/**
 * Generates CMakeLists.txt for a Linux cross compilation project.
 *
 * The structure mirrors the MCU generator: an explicit source list, target
 * scoped include directories and definitions, and the shared user code section
 * so regenerating never discards manual edits. Unlike the MCU version there is
 * no linker script, no startup file and no objcopy step.
 */

import { preserveUserCodeSection, userCodeSection } from '../shared/userCodeSection';
import type { LinuxProjectStructure } from './types';

function quotedPath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/"/g, '\\"');
  return `"\${LINUX_PROJECT_ROOT}/${normalized}"`;
}

function targetDeclaration(structure: LinuxProjectStructure): string {
  if (structure.targetType === 'static') {
    return `add_library(${structure.targetName} STATIC)`;
  }
  if (structure.targetType === 'shared') {
    return `add_library(${structure.targetName} SHARED)`;
  }
  return `add_executable(${structure.targetName})`;
}

function indented(values: string[]): string {
  return values.map((value) => `    ${value}`).join('\n');
}

export function generateLinuxCMakeLists(
  structure: LinuxProjectStructure,
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
  const defineBlock = indented([...new Set(structure.defines)].sort());

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

set(LINUX_PROJECT_ROOT "\${CMAKE_CURRENT_SOURCE_DIR}")

set(LINUX_SOURCES
${sourceBlock}
)

${targetDeclaration(structure)}
target_sources(${structure.targetName} PRIVATE \${LINUX_SOURCES})

target_include_directories(${structure.targetName} PRIVATE
${includeBlock}
)

target_compile_definitions(${structure.targetName} PRIVATE
${defineBlock}
)

# Threads and the math library are needed by most Linux targets.
target_link_libraries(${structure.targetName} PRIVATE
    pthread
    m
)

${userCodeSection()}

set_target_properties(${structure.targetName} PROPERTIES
    ADDITIONAL_CLEAN_FILES "\${CMAKE_BINARY_DIR}/${structure.targetName}.map"
)

if(CMAKE_SIZE)
    add_custom_command(TARGET ${structure.targetName} POST_BUILD
        COMMAND \${CMAKE_SIZE} \$<TARGET_FILE:${structure.targetName}>
    )
endif()
`;

  return preserveUserCodeSection(existingContent, generated);
}
