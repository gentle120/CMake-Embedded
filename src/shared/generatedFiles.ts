/**
 * Shared helpers for writing generated files.
 *
 * Used by both directions so the overwrite check, path normalization, and the
 * write step stay identical.
 */

import { access, writeFile } from 'node:fs/promises';
import { relative } from 'node:path';

export interface GeneratedFile {
  path: string;
  content: string;
}

/** Path of a generated file relative to the workspace root, with forward slashes. */
export function toWorkspacePath(root: string, filePath: string): string {
  return relative(root, filePath).replace(/\\/g, '/');
}

export async function findExistingFiles(paths: string[]): Promise<string[]> {
  const existing: string[] = [];
  for (const filePath of paths) {
    try {
      await access(filePath);
      existing.push(filePath);
    } catch {
      // The file does not exist yet.
    }
  }
  return existing;
}

export async function writeGeneratedFiles(files: GeneratedFile[]): Promise<void> {
  await Promise.all(files.map((file) => writeFile(file.path, file.content, 'utf8')));
}
