import { describe, expect, it } from 'vitest';
import { SF_IMAGES, SF_TSUNAMI } from './ep11.js';
import { CLAIMS, UNCLAIMED_LINES } from './ep11claims.js';
import { CTA_LINE, episodeSeconds } from './episodes.js';
import { estimateClipSeconds } from '../../scripts/lib/edu-generate.js';
import { MAX_CLIP_SECONDS } from './narration.js';

describe( 'Myth vs Fact 11: Can a Tsunami Hit San Francisco?', () => {
  const script = SF_TSUNAMI.script;
  const ids = script.map( l => l.id );

  it( 'is the approved 14-line script: question, FACT reveal, then safety advice, ending with the approved CTA', () => {
    expect( ids ).toEqual( [ 'hook', 'q', 'fact', 'hist', 'far', 'push', 'sa', 'map', 'mapnot', 'look', 'shake', 'warn', 'close', 'cta' ] );
    expect( script[1].text.startsWith( 'Myth or fact' ) ).toBe( true );
    expect( script[2].text.startsWith( 'Fact.' ) ).toBe( true );
    expect( script.at( -1 )!.text ).toBe( CTA_LINE.text );
    expect( script.every( ( l, i ) => i === 0 || l.start > script[i - 1].start ) ).toBe( true );
  } );

  it( 'writes numbers as words and keeps every line inside the narration clip limit', () => {
    for ( const l of script ) {
      expect( l.text, l.id ).not.toMatch( /\d/ );
      expect( estimateClipSeconds( l.text.length ), l.id ).toBeLessThanOrEqual( MAX_CLIP_SECONDS );
    }
  } );

  it( 'plans a Short of about one minute at fast-beats pacing', () => {
    // Fast-beats speech runs at about 19.6 characters per second with about 0.12 s between clips (measured on the cinematic renders); the storyboard pause after the question is 0.5 s.
    const chars = script.reduce( ( n, l ) => n + l.text.length, 0 );
    const seconds = 0.5 + chars / 19.6 + ( script.length - 1 ) * 0.12 + 0.5 + SF_TSUNAMI.tailSeconds!;
    expect( seconds ).toBeGreaterThanOrEqual( 55 );
    expect( seconds ).toBeLessThanOrEqual( 68 );
    // Natural pacing (the silent preview) is slower; it only needs to be a valid length.
    expect( episodeSeconds( SF_TSUNAMI ) ).toBeGreaterThan( seconds );
  } );

  it( 'sources every narration line from a claim, and never claims a forecast', () => {
    const covered = new Set( CLAIMS.flatMap( c => c.lines ) );
    for ( const id of ids ) {
      expect( covered.has( id ) || UNCLAIMED_LINES.includes( id ), `line ${ id } has no claim` ).toBe( true );
    }
    for ( const c of CLAIMS ) {
      expect( c.source.length ).toBeGreaterThan( 0 );
      expect( c.source.every( s => s.startsWith( 'https://' ) ) ).toBe( true );
      expect( c.lines.every( l => ids.includes( l ) ) ).toBe( true );
    }
    expect( script.find( l => l.id === 'mapnot' )!.text ).toContain( 'not a forecast' );
  } );

  it( 'uses the seven approved stills under their narration-based filenames', () => {
    expect( Object.keys( SF_IMAGES ) ).toEqual( [ 'sign', 'marina1964', 'megathrust', 'goldengate', 'surge', 'uphill', 'sunset' ] );
    expect( Object.values( SF_IMAGES ).every( i => i.file.endsWith( '.png' ) ) ).toBe( true );
  } );
} );
