import {
  listDeviceProfiles,
  type DeviceSeries,
  type DeviceVendor
} from '../devices/deviceProfiles';
import {
  listDeviceProfilesForSeries,
  listDeviceSeries,
  listDeviceVendors
} from '../devices/deviceSelection';
import { listFlashProbeProfiles } from '../flash/probeProfiles';
import { listFlashTargetProfiles } from '../flash/targets/targetProfiles';
import { buildLinuxToolchainChoices } from '../linux/toolchainChoices';
import {
  getLinuxToolchainDefaults,
  isLinuxToolchainFamily,
  type LinuxToolchainFamily,
  type LinuxToolchainHit
} from '../linux/types';

export type SidebarMode = 'mcu' | 'linux';

export interface SidebarFlashSelection {
  enabled: boolean;
  targetId: string;
  probeId: string;
  openocdPath: string;
}

export interface SidebarSelection {
  mode: SidebarMode;
  mcu: {
    vendor: DeviceVendor;
    series: DeviceSeries;
    part: string;
  };
  linux: {
    toolchainFamily: LinuxToolchainFamily;
  };
  debugEnabled: boolean;
  flash: SidebarFlashSelection;
}

export interface SidebarOption {
  value: string;
  label: string;
  description?: string;
  detail?: string;
}

export interface SidebarBootstrapState {
  workspaceName: string;
  vendors: SidebarOption[];
  series: SidebarOption[];
  devices: SidebarOption[];
  flashTargets: SidebarOption[];
  flashProbes: SidebarOption[];
  linuxToolchains: SidebarOption[];
  selection: SidebarSelection;
}

const defaultMode: SidebarMode = 'mcu';
const defaultVendor: DeviceVendor = 'STM';
const defaultSeries: DeviceSeries = 'F1x';
const defaultPart = 'STM32F103C8T6';
const defaultLinuxToolchain: LinuxToolchainFamily = 'loongson';
const defaultFlashTarget = 'stm32f1x';
const defaultFlashProbe = 'stlink';

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function isVendor(value: unknown): value is DeviceVendor {
  return value === 'STM' || value === 'GD';
}

function isSeries(value: unknown): value is DeviceSeries {
  return value === 'F1x' || value === 'F4x' || value === 'L4x';
}

function partFor(
  vendor: DeviceVendor,
  series: DeviceSeries,
  value: unknown
): string {
  const profiles = listDeviceProfiles();
  const selected = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return profiles.find((profile) =>
    profile.vendor === vendor
    && profile.series === series
    && profile.part.toUpperCase() === selected
  )?.part
    ?? listDeviceProfilesForSeries(profiles, vendor, series)[0]?.part
    ?? defaultPart;
}

function validTarget(value: unknown): string {
  const selected = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return listFlashTargetProfiles().find((target) => target.id === selected)?.id
    ?? defaultFlashTarget;
}

function validProbe(value: unknown): string {
  const selected = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return listFlashProbeProfiles().find((probe) => probe.id === selected)?.id
    ?? defaultFlashProbe;
}

export function defaultSidebarSelection(): SidebarSelection {
  return {
    mode: defaultMode,
    mcu: {
      vendor: defaultVendor,
      series: defaultSeries,
      part: defaultPart
    },
    linux: {
      toolchainFamily: defaultLinuxToolchain
    },
    debugEnabled: false,
    flash: {
      enabled: false,
      targetId: defaultFlashTarget,
      probeId: defaultFlashProbe,
      openocdPath: 'openocd'
    }
  };
}

export function sanitizeSidebarSelection(
  value: unknown,
  fallback: SidebarSelection = defaultSidebarSelection()
): SidebarSelection {
  const record = asRecord(value);
  const mcu = asRecord(record?.mcu);
  const linux = asRecord(record?.linux);
  const flash = asRecord(record?.flash);
  const vendor = isVendor(mcu?.vendor) ? mcu.vendor : fallback.mcu.vendor;
  const series = isSeries(mcu?.series) ? mcu.series : fallback.mcu.series;
  const family = typeof linux?.toolchainFamily === 'string'
    && isLinuxToolchainFamily(linux.toolchainFamily)
    ? linux.toolchainFamily
    : fallback.linux.toolchainFamily;

  return {
    mode: record?.mode === 'mcu' || record?.mode === 'linux'
      ? record.mode
      : fallback.mode,
    mcu: {
      vendor,
      series,
      part: partFor(vendor, series, mcu?.part)
    },
    linux: {
      toolchainFamily: family
    },
    debugEnabled: typeof record?.debugEnabled === 'boolean'
      ? record.debugEnabled
      : false,
    flash: {
      // Flash details are meaningful only while the option is enabled.
      enabled: typeof flash?.enabled === 'boolean' && validTarget(flash.targetId) === flash.targetId
        ? flash.enabled
        : false,
      targetId: validTarget(flash?.targetId),
      probeId: validProbe(flash?.probeId),
      openocdPath: typeof flash?.openocdPath === 'string' && flash.openocdPath.trim()
        ? flash.openocdPath.trim()
        : 'openocd'
    }
  };
}

function firstSeriesForVendor(vendor: DeviceVendor): DeviceSeries {
  return listDeviceSeries(listDeviceProfiles(), vendor)[0] ?? defaultSeries;
}

export function nextMcuSelection(
  selection: SidebarSelection,
  change: { vendor?: DeviceVendor; series?: DeviceSeries; part?: string }
): SidebarSelection {
  const vendor = change.vendor ?? selection.mcu.vendor;
  const vendorChanged = vendor !== selection.mcu.vendor;
  const series = change.series ?? (vendorChanged
    ? firstSeriesForVendor(vendor)
    : selection.mcu.series);
  const seriesChanged = series !== selection.mcu.series;
  const part = change.part
    ? partFor(vendor, series, change.part)
    : (vendorChanged || seriesChanged
      ? partFor(vendor, series, undefined)
      : selection.mcu.part);

  return {
    ...selection,
    mode: 'mcu',
    mcu: {
      vendor,
      series,
      part
    }
  };
}

function deviceOptions(vendor: DeviceVendor, series: DeviceSeries): SidebarOption[] {
  return listDeviceProfilesForSeries(listDeviceProfiles(), vendor, series).map((profile) => ({
    value: profile.part,
    label: profile.part,
    description: `${profile.family} / ${profile.core}`,
    detail: `${profile.flash.length / 1024} KB Flash, ${profile.ram.length / 1024} KB RAM`
  }));
}

export function buildSidebarState(
  workspaceName: string,
  selection: SidebarSelection,
  discoveredToolchains: Array<{
    family: LinuxToolchainFamily;
    verified: boolean;
    binDir?: string;
    source: string;
  }> = []
): SidebarBootstrapState {
  const profiles = listDeviceProfiles();
  const hits: LinuxToolchainHit[] = discoveredToolchains.map((hit) => ({
    ...getLinuxToolchainDefaults(hit.family),
    label: getLinuxToolchainDefaults(hit.family).label,
    source: hit.source as LinuxToolchainHit['source'],
    verified: hit.verified,
    binDir: hit.binDir
  }));
  const choices = buildLinuxToolchainChoices(hits, selection.linux.toolchainFamily);

  return {
    workspaceName,
    vendors: listDeviceVendors(profiles).map((vendor) => ({
      value: vendor,
      label: vendor === 'STM' ? 'STM32' : 'GD32'
    })),
    series: listDeviceSeries(profiles, selection.mcu.vendor).map((series) => ({
      value: series,
      label: listDeviceProfilesForSeries(profiles, selection.mcu.vendor, series)[0]?.family ?? series
    })),
    devices: deviceOptions(selection.mcu.vendor, selection.mcu.series),
    flashTargets: listFlashTargetProfiles().map((target) => ({
      value: target.id,
      label: target.label,
      description: `${target.vendor} / ${target.series}`,
      detail: target.targetConfig
    })),
    flashProbes: listFlashProbeProfiles().map((probe) => ({
      value: probe.id,
      label: probe.label,
      description: probe.interfaceConfig
    })),
    linuxToolchains: choices.map((choice) => ({
      value: choice.family,
      label: choice.label,
      description: choice.description,
      detail: choice.detail
    })),
    selection
  };
}
