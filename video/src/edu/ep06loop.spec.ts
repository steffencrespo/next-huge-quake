import { describe, expect, it } from 'vitest';
import { CALIFORNIA } from './ep06.js';
import { CLAIMS } from './ep06claims.js';
import { COLD_OPEN_QUALIFIER, LOOP_LINES } from './ep06loop.js';

describe( 'California cold open + loop', () => {
  it( 'uses only narration lines of the published episode, each backed by a USGS claim, and no call to action', () => {
    const claimed = new Set( CLAIMS.flatMap( c => c.lines ) );
    for ( const id of LOOP_LINES ) {
      expect( CALIFORNIA.script.some( l => l.id === id ) ).toBe( true );
      expect( claimed.has( id ) ).toBe( true );
    }
    expect( new Set( LOOP_LINES ).size ).toBe( LOOP_LINES.length );
    expect( LOOP_LINES ).not.toContain( 'cta' );
  } );
  it( 'keeps the 15-million-year projection conditional and schematic on screen', () => {
    expect( COLD_OPEN_QUALIFIER ).toMatch( /If today’s plate motion simply continued/ );
    expect( COLD_OPEN_QUALIFIER ).toMatch( /schematic/ );
  } );
} );
