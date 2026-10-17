import type { CameraTarget } from '../spike/camera.js';

/**
 * Camera targets for the terrain spike (M2.2a) where the fixtures give no coverage: inland relief, a southern
 * coast, high latitude and open ocean. They are map positions only, never events: no facts, no VideoSpec, and the
 * spike marks them "PROBE, NOT AN EVENT" on screen. Real USGS events for these categories come in M2.2d.
 */
export const TERRAIN_PROBES = {
  inlandMyanmar: { label: 'Inland relief · 22.0°N 96.0°E', latitude: 22.0, longitude: 96.0, approachFrom: 'west' },
  coastChile: { label: 'Southern coast · 31.6°S 71.7°W', latitude: -31.6, longitude: -71.7, approachFrom: 'east' },
  highLatAlaska: { label: 'High latitude · 61.0°N 150.0°W', latitude: 61.0, longitude: -150.0, approachFrom: 'west' },
  remotePacific: { label: 'Open ocean · 10.0°N 150.0°W', latitude: 10.0, longitude: -150.0, approachFrom: 'west' }
} as const satisfies Record<string, CameraTarget & { label: string }>;

export type ProbeKey = keyof typeof TERRAIN_PROBES;
