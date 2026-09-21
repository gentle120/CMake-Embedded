/**
 * Reads back the .linux-cmake.json written by a previous generation.
 *
 * The structure is re-derived from the workspace scan on every run, so only the
 * two things a scan cannot know are reused: the toolchain that was chosen and
 * the preprocessor definitions, which the scanner does not collect for Linux.
 */

import { readFile } from 'node:fs/promises';
import { isLinuxToolchainFamily, type LinuxToolchainFamily } from './types';

export interface SavedLinuxProject {
  toolchainFamily?: LinuxToolchainFamily;
  defines: string[];
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

export async function readLinuxProjectConfig(filePath: string): Promise<SavedLinuxProject | undefined> {
  let content: string;
  try {
    content = await readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }

  const record = asRecord(parsed);
  if (!record) {
    return undefined;
  }

  const family = asRecord(record.toolchain)?.family;
  const defines = asRecord(record.structure)?.defines;

  return {
    toolchainFamily: typeof family === 'string' && isLinuxToolchainFamily(family) ? family : undefined,
    defines: Array.isArray(defines)
      ? defines.filter((define): define is string => typeof define === 'string' && define.trim().length > 0)
      : []
  };
}
