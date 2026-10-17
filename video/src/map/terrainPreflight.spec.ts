import { describe, expect, it } from 'vitest';
import { DEMO_AS_OF_UTC, FIXTURES } from '../fixtures/index.js';
import { buildVideoSpec } from '../spec/build.js';
import { assertTerrainAvailable, missingTerrainTiles, needsTerrain, requiredTerrainTiles } from './terrainPreflight.js';

const spec = buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } );
const manifestOf = ( keys: string[] ) => ( { tiles: Object.fromEntries( keys.map( k => [ k, {} ] ) ) } );

describe( 'terrain preflight', () => {
  const required = requiredTerrainTiles( spec );

  it( 'derives a non-empty tile set from the camera path', () => {
    expect( required.length ).toBeGreaterThan( 50 );
  } );

  it( 'passes when the manifest holds every required tile', () => {
    expect( () => assertTerrainAvailable( spec, manifestOf( required ) ) ).not.toThrow();
  } );

  it( 'reports exactly the missing tiles and names the event and the fix', () => {
    const manifest = manifestOf( required.slice( 2 ) );
    expect( missingTerrainTiles( required, manifest ) ).toEqual( required.slice( 0, 2 ) );
    expect( () => assertTerrainAvailable( spec, manifest ) ).toThrow( new RegExp( `terrain tiles missing for ${spec.event.id}: 2.*prepare:terrain` ) );
    expect( () => assertTerrainAvailable( spec, {} ) ).toThrow( /missing/ );
  } );

  it( 'only live maps need terrain', () => {
    expect( needsTerrain( spec ) ).toBe( true );
    expect( needsTerrain( { ...spec, map: { ...spec.map, mode: 'static' } } ) ).toBe( false );
  } );
} );
