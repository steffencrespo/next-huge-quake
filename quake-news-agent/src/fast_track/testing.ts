/** Test fixtures for the fast track: the USGS facts and PAGER detail of the published Tibet M7.0 (us6000u43g). */
import type { QuakeFacts } from '../workflows/quake_news/types.js';
import type { PagerImpact } from './impact.js';

export const TIBET_NOW = Date.parse( '2026-10-22T15:59:00.000Z' );

export const tibetFacts = ( over: Partial<QuakeFacts> = {} ): QuakeFacts => ( {
  id: 'us6000u43g',
  magnitude: 7,
  magType: 'mww',
  place: '191 km ENE of Nagqu, China',
  timeUtc: '2026-10-22T14:33:40.353Z',
  updatedUtc: '2026-10-22T15:28:59.040Z',
  status: 'reviewed',
  latitude: 32.3805,
  longitude: 93.7797,
  depthKm: 18,
  tsunamiFlag: false,
  pagerAlert: 'orange',
  feltReports: null,
  url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000u43g',
  ...over
} );

export const tibetImpact = ( over: Partial<PagerImpact> = {} ): PagerImpact =>
  ( { fatalityLevel: 'yellow', economicLevel: 'orange', exposedMmi6Plus: 45_450, maxMmi: 8, ...over } );

export const TIBET_NARRATION = 'A magnitude 7.0 earthquake struck 191 km ENE of Nagqu, China, on Thursday, October 22, 2026, at 14:33 UTC. ' +
  'The U.S. Geological Survey recorded the quake at a depth of 18 kilometers. USGS models have issued an orange PAGER alert, ' +
  'indicating a significant estimated potential impact in fatalities or economic losses. No public shaking reports have been submitted so far.';
