import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { episodeSeconds } from '../../src/edu/episodes.js';
import { MAX_CLIP_SECONDS } from '../../src/edu/narration.js';
import { estimateClipSeconds } from '../../scripts/lib/edu-generate.js';
import data from './data.json' with { type: 'json' };
import { EASTER_ISLAND_M64, EVENT, HANGA_ROA_KM, LINES, PAGER, PRIOR_2021 } from './script.js';

const text = LINES.map( l => l.text ).join( ' ' );
const line = ( id: string ) => LINES.find( l => l.id === id )!.text;

describe( 'Easter Island M6.4 Short', () => {
  it( 'uses the reviewed USGS event us7000ttxz', () => {
    expect( EVENT ).toMatchObject( { id: 'us7000ttxz', mag: 6.4, magType: 'mww', status: 'reviewed', alert: 'green', depth: 10, depthType: 'operator assigned', tsunami: 0 } );
    expect( EVENT.time.slice( 0, 10 ) ).toBe( '2026-10-29' );
    expect( HANGA_ROA_KM ).toBeGreaterThan( 1400 );
    expect( HANGA_ROA_KM ).toBeLessThan( 1600 );
    expect( PAGER.populationExposedAnyMmi ).toBe( 0 );
    expect( PRIOR_2021 ).toMatchObject( { mag: 6.7, km: 26 } );
    expect( PRIOR_2021.time.slice( 0, 4 ) ).toBe( '2021' );
    expect( data.tsunamiFeeds.every( f => f.afterOrigin.length === 0 ) ).toBe( true );
  } );

  it( 'narration is within the clip limit, written as words and free of banned claims', () => {
    for ( const l of LINES ) expect( estimateClipSeconds( l.text.length ), l.id ).toBeLessThanOrEqual( MAX_CLIP_SECONDS );
    expect( text ).not.toMatch( /\d/ );
    // the depth is operator-assigned, so it is never narrated as a number; nothing on the island, no tsunami, no prediction
    expect( text.toLowerCase() ).not.toMatch( /ten kilometers|moai|tsunami (hit|struck|generated)|predict|imminent|big one|will strike|aftershock|devastat|destroy/ );
    expect( line( 'h1' ) ).toBe( 'But not on Easter Island.' );
    expect( line( 'i1' ) ).toContain( 'reported' );
    expect( line( 's1' ) ).toContain( 'October twenty-ninth' );
    expect( line( 'e0' ) ).toContain( 'six point seven in twenty twenty-one' );
  } );

  it( 'is planned between 30 and 40 seconds, and the approved image is in place', () => {
    const seconds = episodeSeconds( EASTER_ISLAND_M64 );
    expect( seconds ).toBeGreaterThanOrEqual( 30 );
    expect( seconds ).toBeLessThanOrEqual( 40 );
    expect( existsSync( join( import.meta.dirname, '..', '..', 'assets', 'images', 'easter-island-m64', 'easter-island-m64-opening.png' ) ) ).toBe( true );
  } );
} );
