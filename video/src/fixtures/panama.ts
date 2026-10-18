import type { Fixture } from './types.js';

/** Values as M1's `normalizeFeature` produces them from the USGS fixture; fixtures.spec.ts checks they match. */
export const panama: Fixture = {
  provenance: 'usgs-fixture',
  source: 'event_us6000u18k.json',
  approachFrom: 'west',
  event: {
    id: 'us6000u18k',
    magnitude: 7.7,
    magType: 'mww',
    place: '12 km WSW of Pitaloza Arriba, Panama',
    timeUtc: '2026-10-09T17:56:06.036Z',
    updatedUtc: '2026-10-17T21:21:36.558Z',
    status: 'reviewed',
    latitude: 7.5868,
    longitude: -80.769,
    depthKm: 12.647,
    tsunamiFlag: false,
    pagerAlert: 'orange',
    feltReports: 1954,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000u18k'
  }
};
