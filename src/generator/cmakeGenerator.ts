import type { DeviceProfile } from '../devices/deviceProfiles';
import { runtimeSourceNames } from './runtimeGenerator';
import type { ProjectDescription } from '../scanner/projectScanner';

function cmakePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/"/g, '\\"');
}

function projectPath(value: string): string {
  return `"\${MCU_PROJECT_ROOT}/${cmakePath(value)}"`;
}

export function generateCMakeLists(
  projectName: string,
  project: ProjectDescription,
  profile: DeviceProfile
): string {
  const sources = project.sources.filter((source) => !/\.s$/i.test(source));
  sources.push(profile.gnuStartupFileName);
  for (const runtimeSourceName of runtimeSourceNames) {
    const runtimeBasename = runtimeSourceName.split('/').pop()?.toLowerCase();
    if (!sources.some((source) => source.split('/').pop()?.toLowerCase() === runtimeBasename)) {
      sources.push(runtimeSourceName);
    }
  }
  const hasCxx = sources.some((source) => /\.(cc|cpp|cxx)$/i.test(source));
  const languages = hasCxx ? 'C CXX ASM' : 'C ASM';
  const defines = [...new Set([...profile.defines, ...project.defines])]
    .filter((define) => define !== 'VECT_TAB_OFFSET')
    .sort();
  const defineBlock = defines.map((define) => `    ${define}`).join('\n');
  const sourceBlock = sources
    .map((source) => `    ${projectPath(source)}`)
    .join('\n');
  const includeBlock = project.includeDirs.length === 0
    ? `    ${projectPath('.')}`
    : project.includeDirs.map((directory) => `    ${projectPath(directory)}`).join('\n');

  return `cmake_minimum_required(VERSION 3.22)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS ON)
${hasCxx ? `set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS ON)
` : ''}if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "Debug")
endif()

set(CMAKE_PROJECT_NAME ${projectName})
set(CMAKE_EXPORT_COMPILE_COMMANDS TRUE)

project(\${CMAKE_PROJECT_NAME} ${languages})
message("Build type: " \${CMAKE_BUILD_TYPE})

set(MCU_PROJECT_ROOT "\${CMAKE_CURRENT_SOURCE_DIR}")
set(CMAKE_EXECUTABLE_SUFFIX ".elf")

set(MCU_SOURCES
${sourceBlock}
)

add_executable(${projectName})
target_sources(${projectName} PRIVATE \${MCU_SOURCES})

target_include_directories(${projectName} PRIVATE
${includeBlock}
)

target_compile_definitions(${projectName} PRIVATE
${defineBlock}
)

set_target_properties(${projectName} PROPERTIES
    ADDITIONAL_CLEAN_FILES "\${CMAKE_BINARY_DIR}/${projectName}.map"
)

add_custom_command(TARGET ${projectName} POST_BUILD
    COMMAND \${CMAKE_OBJCOPY} -O ihex \$<TARGET_FILE:${projectName}> \${CMAKE_BINARY_DIR}/${projectName}.hex
    COMMAND \${CMAKE_OBJCOPY} -O binary \$<TARGET_FILE:${projectName}> \${CMAKE_BINARY_DIR}/${projectName}.bin
    COMMAND \${CMAKE_SIZE} \$<TARGET_FILE:${projectName}>
)
`;
}
