import { describe, expect, it } from 'vitest';
import { DEMO_AS_OF_UTC, FIXTURES } from '../../src/fixtures/index.js';
import { buildVideoSpec } from '../../src/spec/build.js';
import { requiredTerrainTiles } from '../../src/map/terrainPreflight.js';
import { estimatedTiles, terrainTarget, terrainTargetFromSpec } from './terrain-targets.js';

describe( 'terrain targets from a VideoSpec', () => {
  const spec = buildVideoSpec( FIXTURES.kamchatka, { asOfUtc: DEMO_AS_OF_UTC } );

  it( 'uses the event position, approach side and every frame', () => {
    const t = terrainTargetFromSpec( spec, 'x' );
    expect( t.kind ).toBe( 'spec' );
    expect( t.target ).toEqual( { latitude: spec.event.latitude, longitude: spec.event.longitude, approachFrom: spec.map.approachFrom } );
    expect( t.frames ).toHaveLength( 1050 );
  } );

  it( 'prepares a superset of what the render preflight requires', () => {
    const prepared = new Set( estimatedTiles( terrainTargetFromSpec( spec, 'x' ) ) );
    expect( requiredTerrainTiles( spec ).filter( k => !prepared.has( k ) ) ).toEqual( [] );
  } );

  it( 'matches the fixture target and rejects invalid specs and unknown names', () => {
    expect( terrainTargetFromSpec( spec, 'x' ).target ).toEqual( terrainTarget( 'kamchatka' ).target );
    expect( () => terrainTargetFromSpec( { ...spec, headline: 'x' }, 'x' ) ).toThrow();
    expect( () => terrainTarget( 'nowhere' ) ).toThrow( /unknown terrain target/ );
  } );
} );
