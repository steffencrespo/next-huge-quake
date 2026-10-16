import { describe, expect, it } from 'vitest';
import { DURATION_FRAMES, TIMING, ZOOM, cameraAt, lerpLongitude, startCenter, wrapLongitude } from './camera.js';
import { EVENTS } from './events.js';

const frames = Array.from( { length: DURATION_FRAMES }, ( _, i ) => i );

describe( 'camera', () => {
  for ( const [ key, event ] of Object.entries( EVENTS ) ) {
    describe( key, () => {
      it( 'starts on the globe away from the event and ends centered on the epicenter', () => {
        const first = cameraAt( 0, event );
        expect( first.zoom ).toBe( ZOOM.globe );
        expect( first.center ).toEqual( startCenter( event ) );

        const arrived = cameraAt( TIMING.rotateEnd, event );
        expect( arrived.center[0] ).toBeCloseTo( event.longitude, 9 );
        expect( arrived.center[1] ).toBeCloseTo( event.latitude, 9 );
        expect( cameraAt( DURATION_FRAMES - 1, event ).zoom ).toBeCloseTo( ZOOM.holdEnd, 9 );
      } );

      it( 'zooms in monotonically and keeps the epicenter centered after arrival', () => {
        for ( const frame of frames.slice( 1 ) ) {
          expect( cameraAt( frame, event ).zoom ).toBeGreaterThanOrEqual( cameraAt( frame - 1, event ).zoom );
        }
        for ( const frame of frames.filter( f => f >= TIMING.rotateEnd ) ) {
          expect( cameraAt( frame, event ).center ).toEqual( [ event.longitude, event.latitude ] );
        }
      } );

      it( 'moves smoothly: no longitude jump larger than 2.5 degrees between frames', () => {
        for ( const frame of frames.slice( 1 ) ) {
          const a = cameraAt( frame - 1, event ).center[0];
          const b = cameraAt( frame, event ).center[0];
          expect( Math.abs( wrapLongitude( b - a ) ) ).toBeLessThan( 2.5 );
        }
      } );

      it( 'is a pure function of the frame', () => {
        expect( frames.map( f => cameraAt( f, event ) ) ).toEqual( frames.map( f => cameraAt( f, event ) ) );
      } );
    } );
  }

  it( 'approaches Kamchatka across the antimeridian along the short arc', () => {
    const [ startLon ] = startCenter( EVENTS.kamchatka );
    expect( startLon ).toBeCloseTo( -124.7605, 6 ); // 160.2395 + 75, wrapped
    const longitudes = frames.map( f => cameraAt( f, EVENTS.kamchatka ).center[0] );
    expect( longitudes.some( lon => lon > 170 ) ).toBe( true );
    expect( longitudes.some( lon => lon < -170 ) ).toBe( true );
    // never passes through the long way (e.g. 0 degrees)
    expect( longitudes.every( lon => Math.abs( lon ) > 120 ) ).toBe( true );
  } );

  it( 'interpolates longitude on the shortest arc', () => {
    expect( lerpLongitude( 170, -170, 0.5 ) ).toBeCloseTo( -180, 9 );
    expect( lerpLongitude( -170, 170, 0.25 ) ).toBeCloseTo( -175, 9 );
    expect( lerpLongitude( 10, 20, 0.5 ) ).toBeCloseTo( 15, 9 );
  } );
} );
