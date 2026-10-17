import type { Fixture } from './types.js';

/** Values as M1's `normalizeFeature` produces them from the USGS fixture; fixtures.spec.ts checks they match. */
export const noto: Fixture = {
  provenance: 'usgs-fixture',
  source: 'event_us6000m0xl.json',
  approachFrom: 'west',
  event: {
    id: 'us6000m0xl',
    magnitude: 7.5,
    magType: 'mww',
    place: '2024 Noto Peninsula, Japan Earthquake',
    timeUtc: '2024-01-01T07:10:09.476Z',
    updatedUtc: '2026-10-10T06:13:09.213Z',
    status: 'reviewed',
    latitude: 37.4874,
    longitude: 137.271,
    depthKm: 10,
    tsunamiFlag: true,
    pagerAlert: 'red',
    feltReports: 422,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000m0xl'
  }
};
