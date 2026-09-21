/**
 * Builds the cross toolchain choices shown to the user.
 *
 * Deliberately free of any VS Code import so the selection logic stays unit
 * testable: the QuickPick layer only maps these entries to items.
 */

import {
  getLinuxToolchainDefaults,
  linuxToolchainFamilies,
  type LinuxToolchainFamily,
  type LinuxToolchainHit
} from './types';

const toolchainSourceLabels: Record<LinuxToolchainHit['source'], string> = {
  'cross-compile': 'CROSS_COMPILE',
  'cc-env': 'CC/CXX',
  path: 'PATH'
};

function describeSource(source: LinuxToolchainHit['source']): string {
  return toolchainSourceLabels[source];
}

function describeHit(hit: LinuxToolchainHit): string {
  const verified = hit.verified ? '' : ' - not verified on disk';
  const directory = hit.binDir ? ` - ${hit.binDir}` : '';
  return `Found through ${describeSource(hit.source)}${verified}${directory}`;
}

export interface LinuxToolchainChoice {
  family: LinuxToolchainFamily;
  label: string;
  description: string;
  detail: string;
  /** True when this family was used the last time the project was generated. */
  remembered: boolean;
}

/**
 * Lists every supported family, always in full.
 *
 * A family that was found in the environment is annotated with where it came
 * from; a family that was not found is still offered, because the generated
 * toolchain file only needs the compiler on PATH at build time.
 */
export function buildLinuxToolchainChoices(
  hits: LinuxToolchainHit[],
  remembered?: LinuxToolchainFamily
): LinuxToolchainChoice[] {
  const byFamily = new Map(hits.map((hit) => [hit.family, hit]));
  const ordered = remembered
    ? [remembered, ...linuxToolchainFamilies.filter((family) => family !== remembered)]
    : [...linuxToolchainFamilies];

  return ordered.map((family) => {
    const defaults = getLinuxToolchainDefaults(family);
    const hit = byFamily.get(family);
    const isRemembered = family === remembered;
    const found = hit
      ? describeHit(hit)
      : 'Not found in PATH - the generated toolchain file works once the compiler is on PATH';
    return {
      family,
      label: defaults.label,
      description: `${defaults.compilerPrefix}gcc`,
      detail: isRemembered ? `Last used - ${found}` : found,
      remembered: isRemembered
    };
  });
}
