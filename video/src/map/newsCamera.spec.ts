import { describe, expect, it } from 'vitest';
import { MAP_ZONE } from '../design/layout.js';
import { FIXTURES } from '../fixtures/index.js';
import { wrapLongitude } from '../spike/camera.js';
import { FRAMED_PADDING_BOTTOM, NEWS_TIMING, NEWS_ZOOM, newsCameraAt } from './newsCamera.js';

const TOTAL = 1050;
const frames = Array.from( { length: TOTAL }, ( _, i ) => i );
const targets = {
  noto: { ...FIXTURES.noto.event, approachFrom: FIXTURES.noto.approachFrom },
  kamchatka: { ...FIXTURES.kamchatka.event, approachFrom: FIXTURES.kamchatka.approachFrom }
};

describe( 'newsCameraAt', () => {
  for ( const [ key, target ] of Object.entries( targets ) ) {
    describe( key, () => {
      it( 'opens on the globe, unframed, and arrives centered on the epicenter', () => {
        const first = newsCameraAt( 0, target );
        expect( first.zoom ).toBe( NEWS_ZOOM.globe );
        expect( first.padding?.bottom ).toBe( 0 );
        for ( const frame of frames.filter( f => f >= NEWS_TIMING.rotateEnd ) ) {
          expect( newsCameraAt( frame, target ).center ).toEqual( [ target.longitude, target.latitude ] );
        }
      } );

      it( 'zooms in monotonically, then holds after the push', () => {
        for ( const frame of frames.slice( 1 ) ) {
          expect( newsCameraAt( frame, target ).zoom ).toBeGreaterThanOrEqual( newsCameraAt( frame - 1, target ).zoom );
        }
        expect( newsCameraAt( NEWS_TIMING.pushEnd, target ).zoom ).toBeCloseTo( NEWS_ZOOM.pushEnd, 9 );
        expect( newsCameraAt( TOTAL - 1, target ) ).toEqual( newsCameraAt( NEWS_TIMING.pushEnd, target ) );
      } );

      it( 'moves smoothly: no longitude jump over 2.5 degrees, no zoom step over 0.1, no padding step over 40 px', () => {
        for ( const frame of frames.slice( 1 ) ) {
          const [ a, b ] = [ newsCameraAt( frame - 1, target ), newsCameraAt( frame, target ) ];
          expect( Math.abs( wrapLongitude( b.center[0] - a.center[0] ) ) ).toBeLessThan( 2.5 );
          expect( b.zoom - a.zoom ).toBeLessThan( 0.1 );
          expect( Math.abs( ( b.padding?.bottom ?? 0 ) - ( a.padding?.bottom ?? 0 ) ) ).toBeLessThanOrEqual( 40 );
        }
      } );

      it( 'is a pure function of the frame', () => {
        expect( frames.map( f => newsCameraAt( f, target ) ) ).toEqual( frames.map( f => newsCameraAt( f, target ) ) );
      } );
    } );
  }

  it( 'frames the epicenter at the middle of the map zone after the hook compacts', () => {
    // MapLibre draws the center at the middle of the padded viewport.
    expect( ( 1920 - FRAMED_PADDING_BOTTOM ) / 2 ).toBe( MAP_ZONE.y + MAP_ZONE.height / 2 );
    expect( newsCameraAt( NEWS_TIMING.framingEnd, targets.noto ).padding?.bottom ).toBe( FRAMED_PADDING_BOTTOM );
  } );

  it( 'approaches Kamchatka across the antimeridian along the short arc', () => {
    const longitudes = frames.map( f => newsCameraAt( f, targets.kamchatka ).center[0] );
    expect( longitudes.some( lon => lon > 170 ) ).toBe( true );
    expect( longitudes.some( lon => lon < -170 ) ).toBe( true );
    expect( longitudes.every( lon => Math.abs( lon ) > 120 ) ).toBe( true );
  } );
} );
