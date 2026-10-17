import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../fixtures/index.js';
import { DEM_MAX_ZOOM, idealDemZoom, lonLatToTile, parseTileKey, tilesForCamera, tilesForTrajectory, viewFootprint } from './demTiles.js';
import { newsCameraAt } from './newsCamera.js';

const noto = { latitude: FIXTURES.noto.event.latitude, longitude: FIXTURES.noto.event.longitude, approachFrom: FIXTURES.noto.approachFrom };
const kamchatka = { latitude: FIXTURES.kamchatka.event.latitude, longitude: FIXTURES.kamchatka.event.longitude, approachFrom: FIXTURES.kamchatka.approachFrom };

describe( 'DEM tile math', () => {
  it( 'maps coordinates to slippy-map tiles', () => {
    expect( lonLatToTile( 137.271, 37.4874, 7 ) ).toEqual( { z: 7, x: 112, y: 49 } );
    expect( lonLatToTile( 0, 0, 1 ) ).toEqual( { z: 1, x: 1, y: 1 } );
    expect( lonLatToTile( -180, 85.0511, 3 ) ).toEqual( { z: 3, x: 0, y: 0 } );
    expect( lonLatToTile( 179.9999, -85.0511, 3 ) ).toEqual( { z: 3, x: 7, y: 7 } );
  } );

  it( 'picks the DEM zoom for 256 px tiles on a 512 px world, capped at the prepared maximum', () => {
    expect( idealDemZoom( 2.2 ) ).toBe( 3 );
    expect( idealDemZoom( 6.2 ) ).toBe( 7 );
    expect( idealDemZoom( 6.8 ) ).toBe( DEM_MAX_ZOOM );
    expect( idealDemZoom( 9 ) ).toBe( DEM_MAX_ZOOM );
  } );

  it( 'wraps across the antimeridian', () => {
    const tiles = [ ...tilesForCamera( { center: [ 179.5, 50 ], zoom: 6.5, bearing: 0, pitch: 30 } ) ].map( parseTileKey );
    const z8 = tiles.filter( t => t.z === 8 );
    expect( z8.some( t => t.x === 255 ) ).toBe( true );
    expect( z8.some( t => t.x === 0 ) ).toBe( true );
    expect( tiles.every( t => t.x >= 0 && t.x < 2 ** t.z && t.y >= 0 && t.y < 2 ** t.z ) ).toBe( true );
  } );

  it( 'stays finite and in range near the poles', () => {
    for ( const lat of [ 84, -84, 89.9 ] ) {
      const f = viewFootprint( { center: [ 10, lat ], zoom: 5, bearing: 0, pitch: 30 } );
      expect( Object.values( f ).every( Number.isFinite ) ).toBe( true );
      const tiles = [ ...tilesForCamera( { center: [ 10, lat ], zoom: 5, bearing: 0, pitch: 30 } ) ].map( parseTileKey );
      expect( tiles.every( t => t.y >= 0 && t.y < 2 ** t.z ) ).toBe( true );
    }
  } );

  it( 'extends the footprint upward for a pitched camera and downward for bottom padding', () => {
    const flat = viewFootprint( { center: [ 0, 0 ], zoom: 6, bearing: 0, pitch: 0 } );
    const pitched = viewFootprint( { center: [ 0, 0 ], zoom: 6, bearing: 0, pitch: 30 } );
    const padded = viewFootprint( { center: [ 0, 0 ], zoom: 6, bearing: 0, pitch: 0, padding: { top: 0, bottom: 600, left: 0, right: 0 } } );
    expect( pitched.lat1 ).toBeGreaterThan( flat.lat1 );
    expect( padded.lat0 ).toBeLessThan( flat.lat0 );
    expect( padded.lat1 ).toBeLessThan( flat.lat1 );
  } );

  it( 'selects a deterministic trajectory set that contains every frame, including the end state', () => {
    for ( const target of [ noto, kamchatka ] ) {
      const a = tilesForTrajectory( f => newsCameraAt( f, target ), 1050 );
      expect( tilesForTrajectory( f => newsCameraAt( f, target ), 1050 ) ).toEqual( a );
      const set = new Set( a );
      for ( const frame of [ 0, 90, 165, 900, 1049 ] ) {
        for ( const key of tilesForCamera( newsCameraAt( frame, target ) ) ) {
          expect( set.has( key ) ).toBe( true );
        }
      }
      // The end view is around the epicenter at the prepared maximum zoom.
      const center = lonLatToTile( target.longitude, target.latitude, DEM_MAX_ZOOM );
      expect( set.has( `${center.z}/${center.x}/${center.y}` ) ).toBe( true );
    }
  } );

  it( 'crosses the antimeridian on the Kamchatka approach from the east', () => {
    const z3 = tilesForTrajectory( f => newsCameraAt( f, kamchatka ), 1050 ).map( parseTileKey ).filter( t => t.z === 3 );
    expect( z3.some( t => t.x === 7 ) ).toBe( true );
    expect( z3.some( t => t.x === 0 ) ).toBe( true );
  } );
} );
