import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { episodeSeconds } from '../../src/edu/episodes.js';
import { MAX_CLIP_SECONDS } from '../../src/edu/narration.js';
import { estimateClipSeconds } from '../../scripts/lib/edu-generate.js';
import { EVENTS, LARGEST, LATEST, LINES, VANUATU_SEQUENCE } from './script.js';

const text = LINES.map( l => l.text ).join( ' ' );

describe( 'Vanuatu sequence Short', () => {
  it( 'plots the five USGS M6+ events in chronological order, ending with the M6.0 us7000ttlm', () => {
    expect( EVENTS.map( e => e.id ) ).toEqual( [ 'us6000u3bc', 'us6000u3jl', 'us6000u4j2', 'us6000u4jb', 'us7000ttlm' ] );
    expect( EVENTS.map( e => e.mag ) ).toEqual( [ 6, 6.3, 6.9, 6.3, 6 ] );
    expect( LARGEST.id ).toBe( 'us6000u4j2' );
    expect( LATEST.id ).toBe( 'us7000ttlm' );
    expect( [ ...EVENTS ].sort( ( a, b ) => a.time.localeCompare( b.time ) ) ).toEqual( EVENTS );
  } );

  it( 'narration is within the clip limit, written as words and free of banned claims', () => {
    for ( const l of LINES ) expect( estimateClipSeconds( l.text.length ), l.id ).toBeLessThanOrEqual( MAX_CLIP_SECONDS );
    expect( text ).not.toMatch( /\d/ );
    expect( text.toLowerCase() ).not.toMatch( /aftershock|predict|imminent|larger earthquake|big one|will strike|four decades|unprecedented|record/ );
    expect( LINES.map( l => l.id ) ).toEqual( [ 'h0', 'h1', 's0', 's1', 's2', 's3', 'w0', 'w1', 'e0', 'e1' ] );
  } );

  it( 'spoken magnitudes and dates match the data', () => {
    expect( LINES.find( l => l.id === 's0' )!.text ).toContain( 'October nineteenth' );
    expect( LINES.find( l => l.id === 's2' )!.text ).toContain( 'October twenty-fourth' );
    expect( LINES.find( l => l.id === 's3' )!.text ).toContain( 'October twenty-eighth' );
    expect( EVENTS.map( e => Number( e.time.slice( 8, 10 ) ) ) ).toEqual( [ 19, 20, 24, 24, 28 ] );
    expect( LINES.find( l => l.id === 'e1' )!.text ).toBe( 'This one patch had five in nine days.' );
  } );

  it( 'is planned between 30 and 40 seconds, and the approved image is in place', () => {
    const seconds = episodeSeconds( VANUATU_SEQUENCE );
    expect( seconds ).toBeGreaterThanOrEqual( 30 );
    expect( seconds ).toBeLessThanOrEqual( 40 );
    expect( existsSync( join( import.meta.dirname, 'vanuatu-coast-ai.png' ) ) ).toBe( true );
  } );
} );
