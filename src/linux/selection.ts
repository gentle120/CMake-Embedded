/**
 * Interactive selection for the Linux direction.
 *
 * The flow matches the MCU direction: one question, then generate. The chosen
 * toolchain is the only input; the environment only annotates the entries and a
 * previous .linux-cmake.json only decides which entry is listed first.
 */

import * as vscode from 'vscode';
import { discoverLinuxToolchains } from './discovery';
import { createLinuxToolchain } from './toolchainGenerator';
import { buildLinuxToolchainChoices } from './toolchainChoices';
import { getLinuxToolchainDefaults, type LinuxToolchain, type LinuxToolchainFamily } from './types';

export async function selectLinuxToolchain(
  remembered?: LinuxToolchainFamily
): Promise<LinuxToolchain | undefined> {
  const hits = discoverLinuxToolchains();
  const choices = buildLinuxToolchainChoices(hits, remembered);

  const selection = await vscode.window.showQuickPick(
    choices.map((choice) => ({
      label: choice.label,
      description: choice.description,
      detail: choice.detail,
      family: choice.family
    })),
    { placeHolder: 'Select the Linux cross toolchain to generate for' }
  );
  if (!selection) {
    return undefined;
  }

  // Prefer the discovery hit so .linux-cmake.json records where it came from.
  const hit = hits.find((candidate) => candidate.family === selection.family);
  if (hit) {
    return hit;
  }

  const defaults = getLinuxToolchainDefaults(selection.family);
  await vscode.window.showWarningMessage(
    `${defaults.compilerPrefix}gcc was not found in PATH. Add the toolchain bin directory to PATH before `
    + 'configuring the generated project.'
  );
  return createLinuxToolchain(selection.family);
}
