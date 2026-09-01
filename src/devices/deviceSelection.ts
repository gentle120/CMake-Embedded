import type { DeviceProfile, DeviceSeries, DeviceVendor } from './deviceProfiles';

export type DeviceSelectionItem =
  | { kind: 'separator'; label: DeviceVendor | `${DeviceVendor}${DeviceSeries}` }
  | { kind: 'device'; profile: DeviceProfile };

const groupOrder: Array<{ vendor: DeviceVendor; series: DeviceSeries; label: `${DeviceVendor}${DeviceSeries}` }> = [
  { vendor: 'STM', series: 'F1x', label: 'STMF1x' },
  { vendor: 'STM', series: 'F4x', label: 'STMF4x' },
  { vendor: 'STM', series: 'L4x', label: 'STML4x' },
  { vendor: 'GD', series: 'F1x', label: 'GDF1x' },
  { vendor: 'GD', series: 'F4x', label: 'GDF4x' }
];

export function buildDeviceSelectionItems(profiles: DeviceProfile[]): DeviceSelectionItem[] {
  const items: DeviceSelectionItem[] = [];
  let activeVendor: DeviceVendor | undefined;
  for (const group of groupOrder) {
    const seriesProfiles = profiles
      .filter((profile) => profile.vendor === group.vendor && profile.series === group.series)
      .sort((left, right) => left.part.localeCompare(right.part));
    if (seriesProfiles.length === 0) {
      continue;
    }
    if (activeVendor !== group.vendor) {
      items.push({ kind: 'separator', label: group.vendor });
      activeVendor = group.vendor;
    }
    items.push({ kind: 'separator', label: group.label });
    items.push(...seriesProfiles.map((profile) => ({ kind: 'device' as const, profile })));
  }
  return items;
}
