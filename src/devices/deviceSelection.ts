import type { DeviceProfile, DeviceSeries, DeviceVendor } from './deviceProfiles';

const vendorOrder: Record<DeviceVendor, number> = { STM: 0, GD: 1 };
const seriesOrder: Record<DeviceSeries, number> = { F1x: 0, F4x: 1, L4x: 2 };

export function listDeviceVendors(profiles: DeviceProfile[]): DeviceVendor[] {
  return [...new Set(profiles.map((profile) => profile.vendor))]
    .sort((left, right) =>
      vendorOrder[left] - vendorOrder[right]
    );
}

export function listDeviceSeries(profiles: DeviceProfile[], vendor: DeviceVendor): DeviceSeries[] {
  return [...new Set(
    profiles
      .filter((profile) => profile.vendor === vendor)
      .map((profile) => profile.series)
  )].sort((left, right) => seriesOrder[left] - seriesOrder[right]);
}

export function listDeviceProfilesForSeries(
  profiles: DeviceProfile[],
  vendor: DeviceVendor,
  series: DeviceSeries
): DeviceProfile[] {
  return profiles
    .filter((profile) => profile.vendor === vendor && profile.series === series)
    .sort((left, right) => left.part.localeCompare(right.part));
}
