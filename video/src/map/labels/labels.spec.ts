import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { MapCamera } from '../LiveMap.js';
import { HOLD_CAMERA, newsCameraAt } from '../newsCamera.js';
import type { NewsCameraOptions } from '../newsCamera.js';
import type { LabelData } from './data.js';
import { areaAt, areaContains } from './geo.js';
import { projectAt, unprojectAt } from './projection.js';
import { DEFAULT_RULES, LABEL_FRAMES, displayName, inBundledFonts, selectLabels } from './selectLabels.js';
import type { LabelPlan } from './selectLabels.js';
import { LABEL_TEST_REGIONS } from './testRegions.js';

/** Natural Earth (public domain) clipped to the test regions by scripts/make-label-fixture.ts. */
const data = JSON.parse( readFileSync( new URL( './__fixtures__/geo-sample.json', import.meta.url ), 'utf8' ) ) as LabelData;
const FRAMES = LABEL_FRAMES;

const plan = ( region: string, { exclusionRadius = 240, camera = HOLD_CAMERA }: { exclusionRadius?: number; camera?: NewsCameraOptions } = {} ) => {
  const { target } = LABEL_TEST_REGIONS[region];
  return selectLabels( { epicenter: [ target.longitude, target.latitude ], cameraAt: f => newsCameraAt( f, target, camera ), frames: FRAMES, data, rules: { exclusionRadius } } );
};
const names = ( p: LabelPlan ) => p.labels.map( l => `${l.kind}:${l.name}` );
const reason = ( p: LabelPlan, name: string ) => p.rejected.find( r => r.name === name )?.reason ?? '';

describe( 'label projection model', () => {
  const camera: MapCamera = { center: [ 137.271, 37.4874 ], zoom: 6.8, bearing: 0, pitch: 30, padding: { top: 0, bottom: 590, left: 0, right: 0 } };

  it( 'draws the camera center at the padded view center', () => {
    expect( projectAt( camera, [ 137.271, 37.4874 ] ) ).toEqual( { x: 540, y: 665 } );
  } );

  it( 'round-trips screen points within 0.5 px', () => {
    for ( const p of [ { x: 100, y: 470 }, { x: 900, y: 860 }, { x: 540, y: 300 } ] ) {
      const q = projectAt( camera, unprojectAt( camera, p ) );
      expect( Math.hypot( q.x - p.x, q.y - p.y ) ).toBeLessThan( 0.5 );
    }
  } );

  it( 'keeps east to the right across the antimeridian', () => {
    const c: MapCamera = { ...camera, center: [ 179.9, -17.8 ] };
    expect( projectAt( c, [ -179.9, -17.8 ] ).x ).toBeGreaterThan( 540 );
    expect( projectAt( c, [ 179.7, -17.8 ] ).x ).toBeLessThan( 540 );
  } );

  it( 'models bearing 0 only', () => {
    expect( () => projectAt( { ...camera, bearing: 10 }, [ 137, 37 ] ) ).toThrow();
  } );
} );

describe( 'geographic lookups', () => {
  it( 'finds the country or sea containing each test epicenter', () => {
    const at = ( region: string ) => {
      const { latitude, longitude } = LABEL_TEST_REGIONS[region].target;
      return [ areaAt( data.countries, [ longitude, latitude ] )?.name ?? null, areaAt( data.marine, [ longitude, latitude ] )?.name ?? null ];
    };
    expect( at( 'noto' )[0] ).toBe( 'Japan' );
    expect( at( 'inlandMyanmar' )[0] ).toBe( 'Myanmar' );
    expect( at( 'kamchatka' ) ).toEqual( [ null, 'North Pacific Ocean' ] );
    expect( at( 'remotePacific' ) ).toEqual( [ null, 'North Pacific Ocean' ] );
  } );

  it( 'handles rings across the antimeridian from both sides', () => {
    const fiji = data.countries.find( c => c.name === 'Fiji' )!;
    expect( areaContains( fiji, [ 178.0, -17.8 ] ) ).toBe( true );
    expect( areaContains( fiji, [ 178.0 - 360, -17.8 ] ) ).toBe( true );
  } );
} );

describe( 'label selection: geographic cases (camera hold, R = 240 px)', () => {
  it( 'Noto (coastal): Japan on land and the Sea of Japan on water; the nearest cities are never labelled', () => {
    const p = plan( 'noto' );
    expect( names( p ) ).toEqual( [ 'country:Japan', 'sea:Sea of Japan' ] );
    // Nagano (123 km, scalerank 4) is eligible but inside the exclusion disk; Kanazawa (117 km) is scalerank 6.
    expect( reason( p, 'Nagano' ) ).toMatch( /exclusion/ );
    expect( reason( p, 'Kanazawa' ) ).toMatch( /not eligible/ );
  } );

  it( 'Kamchatka (offshore): Russia; Petropavlovsk-Kamchatsky is dropped rather than squeezed', () => {
    const p = plan( 'kamchatka' );
    expect( names( p ) ).toEqual( [ 'country:Russia' ] );
    expect( reason( p, 'Petropavlovsk-Kamchatsky' ) ).toMatch( /does not fit/ );
  } );

  it( 'Myanmar probe (inland): Mandalay, 9 km away, is never labelled', () => {
    const p = plan( 'inlandMyanmar' );
    expect( names( p ) ).toEqual( [ 'country:Myanmar' ] );
    expect( reason( p, 'Mandalay' ) ).toMatch( /exclusion/ );
  } );

  it( 'Alaska probe (high latitude): Anchorage, 25 km away, is never labelled', () => {
    const p = plan( 'highLatAlaska' );
    expect( names( p ) ).toEqual( [ 'sea:Cook Inlet' ] );
    expect( reason( p, 'Anchorage' ) ).toMatch( /exclusion/ );
  } );

  it( 'Chile and open-ocean probes: no label fits at R = 240; at R = 180 the long names fit on two lines', () => {
    expect( names( plan( 'coastChile' ) ) ).toEqual( [] );
    expect( names( plan( 'remotePacific' ) ) ).toEqual( [] );
    expect( names( plan( 'coastChile', { exclusionRadius: 180 } ) ) ).toEqual( [ 'country:Chile', 'sea:South Pacific Ocean' ] );
    const ocean = plan( 'remotePacific', { exclusionRadius: 180 } );
    expect( names( ocean ) ).toEqual( [ 'sea:North Pacific Ocean' ] );
    expect( ocean.labels[0].lines ).toEqual( [ 'NORTH', 'PACIFIC OCEAN' ] );
  } );

  it( 'gives the same labels on both sides of the antimeridian (Fiji)', () => {
    expect( names( plan( 'fijiEast' ) ) ).toEqual( names( plan( 'fijiWest' ) ) );
    expect( names( plan( 'fijiEast' ) ) ).toEqual( [ 'country:Fiji' ] );
  } );

  it( 'fits no label with the original slow push at R = 240 (the camera-hold comparison)', () => {
    for ( const region of [ 'noto', 'kamchatka', 'inlandMyanmar' ] ) {
      expect( names( plan( region, { camera: {} } ) ) ).toEqual( [] );
    }
  } );
} );

describe( 'label selection: invariants', () => {
  const regions = Object.keys( LABEL_TEST_REGIONS );
  const cases = regions.flatMap( region => [ 180, 240, 300 ].map( exclusionRadius => ( { region, exclusionRadius } ) ) );

  it.each( cases )( '$region at R = $exclusionRadius: at most one of each kind, inside the rules on every frame, in its feature', ( { region, exclusionRadius } ) => {
    const { target } = LABEL_TEST_REGIONS[region];
    const p = plan( region, { exclusionRadius } );
    expect( p.labels.length ).toBeLessThanOrEqual( 3 );
    expect( new Set( p.labels.map( l => l.kind ) ).size ).toBe( p.labels.length );
    for ( const frame of FRAMES ) {
      const camera = newsCameraAt( frame, target, HOLD_CAMERA );
      const marker = projectAt( camera, [ target.longitude, target.latitude ] );
      const rects = p.labels.map( l => {
        const a = projectAt( camera, l.anchor );
        return { x0: a.x + l.box.left, y0: a.y + l.box.top, x1: a.x + l.box.right, y1: a.y + l.box.bottom };
      } );
      for ( const r of rects ) {
        const z = DEFAULT_RULES.zone;
        expect( r.x0 >= z.left && r.x1 <= z.right && r.y0 >= z.top && r.y1 <= z.bottom ).toBe( true );
        const dx = Math.max( r.x0 - marker.x, 0, marker.x - r.x1 );
        const dy = Math.max( r.y0 - marker.y, 0, marker.y - r.y1 );
        expect( Math.hypot( dx, dy ) ).toBeGreaterThanOrEqual( exclusionRadius );
      }
      rects.forEach( ( a, i ) => rects.slice( i + 1 ).forEach( b => expect( a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0 ).toBe( true ) ) );
    }
    for ( const label of p.labels ) {
      expect( label.fontSize ).toBeGreaterThanOrEqual( 30 );
      expect( label.lines.join( ' ' ) ).not.toMatch( /\d/ );
      if ( label.kind === 'country' ) {
        expect( areaContains( data.countries.find( c => c.name === label.name && areaContains( c, label.anchor ) )!, label.anchor ) ).toBe( true );
      }
      if ( label.kind === 'sea' ) {
        expect( areaAt( data.countries, label.anchor ) ).toBeNull();
        expect( areaAt( data.marine.filter( m => m.name === label.name ), label.anchor ) ).not.toBeNull();
      }
    }
  } );

  it( 'is deterministic', () => {
    expect( plan( 'noto' ) ).toEqual( plan( 'noto' ) );
  } );

  it( 'uses the Natural Earth name, or its ASCII form for glyphs outside the bundled fonts', () => {
    expect( inBundledFonts( 'Valparaíso' ) ).toBe( true );
    expect( displayName( 'Valparaíso', 'Valparaiso' ) ).toBe( 'Valparaíso' );
    expect( displayName( 'Ōsaka', 'Osaka' ) ).toBe( 'Osaka' );
  } );
} );
