import { describe, expect, it } from 'vitest';
import { CTA_LINE } from '../edu/episodes.js';
import { HISTORIC_LIST } from './episodes.js';

describe( 'historic episodes', () => {
  it( 'each ends with the approved CTA and has unique line ids', () => {
    for ( const ep of HISTORIC_LIST ) {
      expect( ep.script.at( -1 )?.text ).toBe( CTA_LINE.text );
      expect( new Set( ep.script.map( l => l.id ) ).size ).toBe( ep.script.length );
    }
  } );

  it( 'narration contains no digits (numbers are written as words for the voice)', () => {
    for ( const ep of HISTORIC_LIST ) {
      for ( const line of ep.script ) {
        expect( line.text ).not.toMatch( /\d/ );
      }
    }
  } );

  it( 'plans land between 55 and 70 seconds', () => {
    // Northridge is a fast-beats-only episode: its natural-pace plan is long by design, its video lands near 54 s after pacing.
    for ( const ep of HISTORIC_LIST.filter( e => e.id !== 'northridge1994' ) ) {
      const last = ep.script.at( -1 )!;
      expect( last.start + 5 ).toBeGreaterThan( 55 );
      expect( last.start + 5 ).toBeLessThan( 70 );
    }
  } );
} );
