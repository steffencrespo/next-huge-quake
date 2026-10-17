import type { Fixture } from './types.js';

/**
 * TEST DATA. The Kamchatka feature with its optional fields removed (M1's feature_optional_fields_removed.json),
 * as M1's `normalizeFeature` maps it: unknown review status (so preliminary), no depth, place or update time.
 * It exercises the preliminary notice and missing-field handling, and renders with a TEST DATA watermark.
 */
export const preliminaryTest: Fixture = {
  provenance: 'synthetic-test',
  source: 'feature_optional_fields_removed.json',
  approachFrom: 'east',
  event: {
    id: 'us6000qw60',
    magnitude: 8.8,
    magType: null,
    place: 'near 52.49°N, 160.24°E',
    timeUtc: '2025-07-29T23:24:52.483Z',
    updatedUtc: null,
    status: 'unknown',
    latitude: 52.4948,
    longitude: 160.2395,
    depthKm: null,
    tsunamiFlag: null,
    pagerAlert: null,
    feltReports: null,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000qw60'
  }
};
