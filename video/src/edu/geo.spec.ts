import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAPTIONS, EVENTS, FOCUS, SCENES, VP, VS, arrival, faultDisplacement, faultState, mapPoint, waveDisplacement } from './geo.js';

describe( 'educational short model', () => {
  it( 'stress rises while locked, then drops after rupture', () => {
    const s = [ 19, 24, 29, 32 ].map( t => faultState( t ).stress );
    expect( s ).toEqual( [ ...s ].sort( ( a, b ) => a - b ) );
    expect( faultState( 32.2 ).stress ).toBeGreaterThan( 0.95 );
    expect( faultState( 36 ).stress ).toBeLessThan( 0.05 );
  } );

  it( 'the field is continuous across the fault before rupture and ends in a slip step after it', () => {
    const at = ( t: number, side: number ) => faultDisplacement( 120 * 0.819 + side * 0.574 * 12, 520 + 120 * 0.574 - side * 0.819 * 12, t );
    const gap = ( t: number ) => Math.hypot( at( t, 1 ).x - at( t, -1 ).x, at( t, 1 ).y - at( t, -1 ).y );
    // While the patch is locked the offset across the fault stays at what it was when it locked; rupture adds the stored slip.
    expect( gap( 30 ) - gap( 18.5 ) ).toBeLessThan( 15 );
    expect( gap( 36 ) - gap( 30 ) ).toBeGreaterThan( 50 );
  } );

  it( 'P is faster than S by sqrt(3) and P reaches the surface first', () => {
    expect( VP / VS ).toBeCloseTo( Math.sqrt( 3 ), 6 );
    expect( arrival( 0, VP ) ).toBeLessThan( arrival( 0, VS ) );
    expect( arrival( 300, VP ) ).toBeGreaterThan( arrival( 0, VP ) );
    expect( waveDisplacement( 0, 0, EVENTS.rupture - 1 ) ).toEqual( { x: 0, y: 0 } );
    const before = waveDisplacement( 0, 0, arrival( 0, VP ) - 0.5 );
    expect( Math.hypot( before.x, before.y ) ).toBeLessThan( 1e-6 );
  } );

  it( 'is deterministic and scenes tile the 60 s video', () => {
    expect( mapPoint( 100, 200, 25 ) ).toEqual( mapPoint( 100, 200, 25 ) );
    expect( SCENES.every( ( s, i ) => i === 0 || s.from === SCENES[i - 1].to ) ).toBe( true );
    expect( SCENES[5].to ).toBe( 60 );
    expect( CAPTIONS.every( c => c.end > c.start ) ).toBe( true );
    expect( FOCUS.y ).toBeGreaterThan( 150 );
  } );

  it( 'uses no unseeded randomness or wall clock', () => {
    for ( const file of [ 'geo.ts', 'ScienceShort.tsx' ] ) {
      expect( readFileSync( new URL( file, import.meta.url ), 'utf8' ) ).not.toMatch( /Math\.random|Date\.now/ );
    }
  } );
} );
