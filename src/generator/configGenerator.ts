import type { DeviceProfile, MemoryRegion } from '../devices/deviceProfiles';
import { getWorkspaceIntegration } from '../integration/workspaceSettings';

function hexadecimal(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
}

function memorySummary(region: MemoryRegion): { origin: string; sizeBytes: number; sizeKB: number } {
  return {
    origin: hexadecimal(region.origin),
    sizeBytes: region.length,
    sizeKB: region.length / 1024
  };
}

export function generateProjectConfig(
  projectName: string,
  profile: DeviceProfile,
  generatedFiles: string[],
  overwrittenFiles: string[]
): string {
  const config = {
    projectName,
    device: profile.part,
    memory: {
      flash: memorySummary(profile.flash),
      ram: memorySummary(profile.ram),
      additional: (profile.additionalMemory ?? []).map((region) => ({
        name: region.name,
        attributes: region.attributes,
        origin: hexadecimal(region.origin),
        sizeBytes: region.length,
        sizeKB: region.length / 1024
      }))
    },
    integration: getWorkspaceIntegration(),
    generatedFiles,
    overwrittenFiles
  };

  return `${JSON.stringify(config, null, 2)}\n`;
}
