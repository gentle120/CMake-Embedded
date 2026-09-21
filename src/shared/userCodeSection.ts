/**
 * Shared helpers for the generated CMakeLists.txt user code section.
 *
 * Both the MCU and the Linux generators emit the same marker-delimited block so
 * that regenerating a project never discards the user's own CMake additions.
 */

const userCodeBeginMarker = '# CMAKE-EMBEDDED USER CODE BEGIN';
const userCodeEndMarker = '# CMAKE-EMBEDDED USER CODE END';

const previousEmptyUserCodeSection = `${userCodeBeginMarker}
# Add custom compiler definitions, include directories, source files,
# assembly files, library search paths, static library files, and libraries here.
# This section is preserved when CMakeLists.txt is generated again.

${userCodeEndMarker}`;

export function userCodeSection(): string {
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

export function preserveUserCodeSection(existingContent: string | undefined, generatedContent: string): string {
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
