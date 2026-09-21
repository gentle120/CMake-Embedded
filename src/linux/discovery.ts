/**
 * Linux cross toolchain discovery.
 *
 * The toolchain is located through the environment only, mirroring how the MCU
 * direction relies on PATH for arm-none-eabi-gcc. There are no extension
 * settings for this: a user either exports the usual variables or has the
 * toolchain bin directory on PATH.
 *
 * Search order:
 *   1. CROSS_COMPILE (the embedded Linux convention, for example loongarch64-linux-gnu-)
 *   2. CC / CXX
 *   3. PATH scan for the supported compiler prefixes
 */

import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { basename, delimiter, dirname, isAbsolute, join } from 'node:path';
import {
  getLinuxToolchainDefaults,
  linuxToolchainFamilies,
  type LinuxToolchainFamily,
  type LinuxToolchainHit,
  type LinuxToolchainSource
} from './types';

const executableExtensions = process.platform === 'win32' ? ['.exe', ''] : [''];

function isExecutableFile(filePath: string): boolean {
  try {
    if (!statSync(filePath).isFile()) {
      return false;
    }
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function locatesExecutable(pathOrName: string): boolean {
  return executableExtensions.some((extension) => isExecutableFile(`${pathOrName}${extension}`));
}

function environmentPathEntries(environment: NodeJS.ProcessEnv): string[] {
  const value = environment.PATH ?? environment.Path ?? '';
  return value.split(delimiter).filter((entry) => entry.trim().length > 0);
}

function findOnPath(environment: NodeJS.ProcessEnv, command: string): string | undefined {
  for (const directory of environmentPathEntries(environment)) {
    const candidate = join(directory, command);
    const match = executableExtensions
      .map((extension) => `${candidate}${extension}`)
      .find((filePath) => isExecutableFile(filePath));
    if (match) {
      return match;
    }
  }
  return undefined;
}

function familyForPrefix(prefix: string): LinuxToolchainFamily | undefined {
  return linuxToolchainFamilies.find(
    (family) => getLinuxToolchainDefaults(family).compilerPrefix === prefix
  );
}

interface CrossCompileMatch {
  family: LinuxToolchainFamily;
  prefix: string;
  /** Directory part when CROSS_COMPILE carries a path, as the kernel convention allows. */
  binDir?: string;
}

/**
 * Matches CROSS_COMPILE against the supported prefixes.
 *
 * Both `loongarch64-linux-gnu-` and `/opt/toolchain/bin/loongarch64-linux-gnu-`
 * are accepted, and a missing trailing dash is tolerated.
 */
export function matchCrossCompile(value: string): CrossCompileMatch | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = (trimmed.endsWith('-') ? trimmed : `${trimmed}-`).replace(/\\/g, '/');
  for (const family of linuxToolchainFamilies) {
    const prefix = getLinuxToolchainDefaults(family).compilerPrefix;
    if (normalized === prefix) {
      return { family, prefix };
    }
    if (normalized.endsWith(`/${prefix}`)) {
      return { family, prefix, binDir: normalized.slice(0, normalized.length - prefix.length - 1) };
    }
  }
  return undefined;
}

/** Derives a compiler prefix from a command name such as aarch64-linux-gnu-gcc. */
export function compilerPrefixFromCommand(command: string): string | undefined {
  const match = /^(.*-)(?:gcc|g\+\+|cc|c\+\+)$/i.exec(basename(command).replace(/\.exe$/i, ''));
  return match?.[1];
}

function hitFor(
  family: LinuxToolchainFamily,
  source: LinuxToolchainSource,
  verified: boolean,
  binDir: string | undefined
): LinuxToolchainHit {
  const defaults = getLinuxToolchainDefaults(family);
  return {
    family,
    label: defaults.label,
    processor: defaults.processor,
    compilerPrefix: defaults.compilerPrefix,
    targetFlags: defaults.targetFlags,
    cxxOnlyFlags: defaults.cxxOnlyFlags,
    source,
    verified,
    binDir
  };
}

/**
 * Lists the supported cross toolchains that the environment provides.
 *
 * Results are ordered by `linuxToolchainFamilies` so the selection list is
 * stable, and each family is reported at most once.
 */
export function discoverLinuxToolchains(
  environment: NodeJS.ProcessEnv = process.env
): LinuxToolchainHit[] {
  const hits = new Map<LinuxToolchainFamily, LinuxToolchainHit>();

  const crossCompile = environment.CROSS_COMPILE?.trim();
  if (crossCompile) {
    const match = matchCrossCompile(crossCompile);
    if (match) {
      const command = `${match.prefix}gcc`;
      const absolute = match.binDir ? join(match.binDir, command) : undefined;
      const compiler = absolute
        ? (locatesExecutable(absolute) ? absolute : undefined)
        : findOnPath(environment, command);
      hits.set(
        match.family,
        hitFor(match.family, 'cross-compile', Boolean(compiler), compiler ? dirname(compiler) : match.binDir)
      );
    }
  }

  for (const variable of ['CC', 'CXX'] as const) {
    const value = environment[variable]?.trim();
    if (!value) {
      continue;
    }
    const prefix = compilerPrefixFromCommand(value);
    const family = prefix ? familyForPrefix(prefix) : undefined;
    if (!family || hits.has(family)) {
      continue;
    }
    const absolute = isAbsolute(value);
    const verified = absolute ? locatesExecutable(value) : Boolean(findOnPath(environment, value));
    hits.set(family, hitFor(family, 'cc-env', verified, absolute ? dirname(value) : undefined));
  }

  for (const family of linuxToolchainFamilies) {
    if (hits.has(family)) {
      continue;
    }
    const defaults = getLinuxToolchainDefaults(family);
    const cCompiler = findOnPath(environment, `${defaults.compilerPrefix}gcc`);
    const cxxCompiler = cCompiler
      ? findOnPath(environment, `${defaults.compilerPrefix}g++`)
      : undefined;
    if (!cCompiler || !cxxCompiler) {
      continue;
    }
    hits.set(family, hitFor(family, 'path', true, dirname(cCompiler)));
  }

  return linuxToolchainFamilies
    .map((family) => hits.get(family))
    .filter((hit): hit is LinuxToolchainHit => hit !== undefined);
}
