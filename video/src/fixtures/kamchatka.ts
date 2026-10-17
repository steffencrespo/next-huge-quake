import type { Fixture } from './types.js';

/** Values as M1's `normalizeFeature` produces them from the USGS fixture; fixtures.spec.ts checks they match. */
export const kamchatka: Fixture = {
  provenance: 'usgs-fixture',
  source: 'query_strongest.json',
  // Approaching from the east makes the globe move cross the antimeridian, as in the M2.0 spike.
  approachFrom: 'east',
  event: {
    id: 'us6000qw60',
    magnitude: 8.8,
    magType: 'mww',
    place: '2025 Kamchatka Peninsula, Russia Earthquake',
    timeUtc: '2025-07-29T23:24:52.483Z',
    updatedUtc: '2026-10-12T15:59:55.086Z',
    status: 'reviewed',
    latitude: 52.4948,
    longitude: 160.2395,
    depthKm: 35,
    tsunamiFlag: true,
    pagerAlert: 'red',
    feltReports: 125,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000qw60'
  }
};
