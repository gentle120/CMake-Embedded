import type { DeviceProfile } from '../devices/deviceProfiles';
import { runtimeSourceNames } from './runtimeGenerator';
import type { ProjectDescription } from '../scanner/projectScanner';

function cmakePath(value: string): string {
  return value.replace(/\\/g, '/').replace(/"/g, '\\"');
}

function projectPath(value: string): string {
  return `"\${MCU_PROJECT_ROOT}/${cmakePath(value)}"`;
}

const userCodeBeginMarker = '# CMAKE-EMBEDDED USER CODE BEGIN';
const userCodeEndMarker = '# CMAKE-EMBEDDED USER CODE END';
const previousEmptyUserCodeSection = `${userCodeBeginMarker}
# Add custom compiler definitions, include directories, source files,
# assembly files, library search paths, static library files, and libraries here.
# This section is preserved when CMakeLists.txt is generated again.

${userCodeEndMarker}`;

function userCodeSection(projectName: string): string {
  return `${userCodeBeginMarker}
# Add user-defined library search paths.
target_link_directories(\${CMAKE_PROJECT_NAME} PRIVATE
)

# Add user source and assembly files.
target_sources(\${CMAKE_PROJECT_NAME} PRIVATE
)

# Add user-defined include paths.
target_include_directories(\${CMAKE_PROJECT_NAME} PRIVATE
)

# Add user-defined compiler definitions.
target_compile_definitions(\${CMAKE_PROJECT_NAME} PRIVATE
)

# Add user-defined libraries or library files.
target_link_libraries(\${CMAKE_PROJECT_NAME} PRIVATE
)

# This section is preserved when CMakeLists.txt is generated again.

${userCodeEndMarker}`;
}

function preserveUserCodeSection(existingContent: string | undefined, generatedContent: string): string {
  if (!existingContent) {
    return generatedContent;
  }

  const existingBegin = existingContent.indexOf(userCodeBeginMarker);
  const existingEnd = existingContent.indexOf(userCodeEndMarker);
  if (existingBegin < 0 || existingEnd < existingBegin) {
    return generatedContent;
  }

  const generatedBegin = generatedContent.indexOf(userCodeBeginMarker);
  const generatedEnd = generatedContent.indexOf(userCodeEndMarker);
  if (generatedBegin < 0 || generatedEnd < generatedBegin) {
    throw new Error('Generated CMakeLists.txt is missing the user code section markers.');
  }

  const existingSection = existingContent.slice(existingBegin, existingEnd + userCodeEndMarker.length);
  const generatedSection = generatedContent.slice(generatedBegin, generatedEnd + userCodeEndMarker.length);
  if (existingSection.replace(/\r\n/g, '\n') === previousEmptyUserCodeSection) {
    return `${generatedContent.slice(0, generatedBegin)}${generatedSection}${generatedContent.slice(generatedEnd + userCodeEndMarker.length)}`;
  }
  return `${generatedContent.slice(0, generatedBegin)}${existingSection}${generatedContent.slice(generatedEnd + userCodeEndMarker.length)}`;
}

export function generateCMakeLists(
  projectName: string,
  project: ProjectDescription,
  profile: DeviceProfile,
  existingContent?: string
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
    .filter((define) => !['VECT_TAB_OFFSET', 'STM32_HAL_LEGACY', 'HSE_VALUE', 'LSE_VALUE'].includes(define.split('=', 1)[0]))
    .sort();
  const defineBlock = defines.map((define) => `    ${define}`).join('\n');
  const sourceBlock = sources
    .map((source) => `    ${projectPath(source)}`)
    .join('\n');
  const includeBlock = project.includeDirs.length === 0
    ? `    ${projectPath('.')}`
    : project.includeDirs.map((directory) => `    ${projectPath(directory)}`).join('\n');

  const generated = `cmake_minimum_required(VERSION 3.22)

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

${userCodeSection(projectName)}

set_target_properties(${projectName} PROPERTIES
    ADDITIONAL_CLEAN_FILES "\${CMAKE_BINARY_DIR}/${projectName}.map"
)

add_custom_command(TARGET ${projectName} POST_BUILD
    COMMAND \${CMAKE_OBJCOPY} -O ihex \$<TARGET_FILE:${projectName}> \${CMAKE_BINARY_DIR}/${projectName}.hex
    COMMAND \${CMAKE_OBJCOPY} -O binary \$<TARGET_FILE:${projectName}> \${CMAKE_BINARY_DIR}/${projectName}.bin
    COMMAND \${CMAKE_SIZE} \$<TARGET_FILE:${projectName}>
)
`;

  return preserveUserCodeSection(existingContent, generated);
}
