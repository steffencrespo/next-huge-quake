import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { eventSchema } from '../spec/schema.js';
import { FIXTURES } from './index.js';

/**
 * Guards against drift between these copies and the M1 USGS fixtures. The raw files are read from disk here,
 * in the test only, so the renderer has no runtime dependency on the quake-news-agent package.
 */
const M1_FIXTURES = new URL( '../../../quake-news-agent/src/workflows/quake_news/__fixtures__/', import.meta.url );

type Feature = { id?: string; properties: Record<string, unknown>; geometry: { coordinates: number[] } };

const readFeature = ( file: string ): Feature => {
  const body = JSON.parse( readFileSync( new URL( file, M1_FIXTURES ), 'utf8' ) );
  return body.type === 'FeatureCollection' ? body.features[0] : body;
};

const iso = ( ms: unknown ) => typeof ms === 'number' ? new Date( ms ).toISOString() : null;
const coord = ( value: number ) => value.toFixed( 2 );

/** The subset of M1's `normalizeFeature` mapping that the fixtures rely on. */
function expectedFacts( feature: Feature ) {
  const p = feature.properties;
  const [ longitude, latitude, depth ] = feature.geometry.coordinates;
  const id = feature.id ?? `${p.net}${p.code}`;
  return {
    id,
    magnitude: p.mag,
    magType: p.magType ?? null,
    place: p.place ?? `near ${coord( Math.abs( latitude ) )}°${latitude >= 0 ? 'N' : 'S'}, ${coord( Math.abs( longitude ) )}°${longitude >= 0 ? 'E' : 'W'}`,
    timeUtc: iso( p.time ),
    updatedUtc: iso( p.updated ),
    status: p.status ?? 'unknown',
    latitude,
    longitude,
    depthKm: depth ?? null,
    tsunamiFlag: typeof p.tsunami === 'number' ? p.tsunami === 1 : null,
    pagerAlert: p.alert ?? null,
    feltReports: typeof p.felt === 'number' ? Math.round( p.felt ) : null,
    url: p.url ?? `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`
  };
}

describe( 'fixtures', () => {
  for ( const [ key, fixture ] of Object.entries( FIXTURES ) ) {
    it( `${key} matches the M1 USGS fixture ${fixture.source}`, () => {
      expect( fixture.event ).toEqual( expectedFacts( readFeature( fixture.source ) ) );
    } );

    it( `${key} is a valid VideoSpec event`, () => {
      expect( () => eventSchema.parse( fixture.event ) ).not.toThrow();
    } );
  }

  it( 'only the altered fixture is marked as test data', () => {
    expect( FIXTURES.noto.provenance ).toBe( 'usgs-fixture' );
    expect( FIXTURES.kamchatka.provenance ).toBe( 'usgs-fixture' );
    expect( FIXTURES.preliminaryTest.provenance ).toBe( 'synthetic-test' );
  } );
} );
