import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

export interface ProjectDescription {
  sources: string[];
  includeDirs: string[];
  defines: string[];
}

const ignoredDirectories = new Set([
  '.git',
  '.vscode',
  '.cmsis',
  '.eide',
  '.pack',
  'build',
  'cmake-build-debug',
  'cmake-build-release',
  'cmake',
  '_cmake',
  'node_modules',
  'out',
  'objects',
  'listings'
]);

const sourceExtensions = new Set(['.c', '.cc', '.cpp', '.cxx', '.s']);
const headerExtensions = new Set(['.h', '.hh', '.hpp', '.hxx']);

function toProjectPath(root: string, filePath: string): string {
  return relative(root, filePath).split(sep).join('/');
}

function isRelevantDefine(name: string): boolean {
  return !name.endsWith('_H') && /^(GD32|STM32|USE_HAL_DRIVER|HSE_VALUE|LSE_VALUE|VECT_TAB_OFFSET)/.test(name);
}

async function walk(
  root: string,
  directory: string,
  sources: string[],
  includeDirs: Set<string>,
  defines: Set<string>
): Promise<void> {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name) && !entry.name.startsWith('cmake-build-')) {
        await walk(root, join(directory, entry.name), sources, includeDirs, defines);
      }
      continue;
    }

    const filePath = join(directory, entry.name);
    const extension = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
    if (sourceExtensions.has(extension)) {
      sources.push(toProjectPath(root, filePath));
    }
    if (!headerExtensions.has(extension) && !sourceExtensions.has(extension)) {
      continue;
    }

    const content = await readFile(filePath, 'utf8');
    const definePattern = /^\s*#\s*define\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm;
    for (const match of content.matchAll(definePattern)) {
      const name = match[1];
      if (isRelevantDefine(name)) {
        defines.add(name);
      }
    }
    if (headerExtensions.has(extension)) {
      includeDirs.add(toProjectPath(root, directory));
    }
  }
}

export async function scanProject(root: string): Promise<ProjectDescription> {
  const sources: string[] = [];
  const includeDirs = new Set<string>();
  const defines = new Set<string>();
  await walk(root, root, sources, includeDirs, defines);
  return {
    sources: sources.sort(),
    includeDirs: [...includeDirs].filter(Boolean).sort(),
    defines: [...defines].sort()
  };
}
