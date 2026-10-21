import { describe, expect, it } from 'vitest';
import { CALIFORNIA } from './ep06.js';
import { CLAIMS, FANTASY_URL, FAQ_URL, UNCLAIMED_LINES } from './ep06claims.js';
import { CTA_LINE, episodeSeconds } from './episodes.js';

describe( 'Myth vs Fact 06: Will California Fall Into the Ocean?', () => {
  const ids = CALIFORNIA.script.map( l => l.id );
  const text = CALIFORNIA.script.map( l => l.text ).join( ' ' );

  it( 'has an ordered script that opens with the myth, answers with two facts and ends with the approved CTA', () => {
    expect( CALIFORNIA.script[0].text.startsWith( 'Myth:' ) ).toBe( true );
    expect( CALIFORNIA.script[0].start ).toBeLessThan( 1 );
    expect( CALIFORNIA.script[1].text.startsWith( 'Fact one:' ) ).toBe( true );
    expect( CALIFORNIA.script.find( l => l.id === 'fact2' )!.text ).toContain( 'Fact two:' );
    expect( CALIFORNIA.script.at( -1 )!.text ).toBe( CTA_LINE.text );
    expect( CALIFORNIA.script.every( ( l, i ) => i === 0 || l.start > CALIFORNIA.script[i - 1].start ) ).toBe( true );
    expect( episodeSeconds( CALIFORNIA ) ).toBeLessThanOrEqual( 47 );
    expect( episodeSeconds( CALIFORNIA ) ).toBeGreaterThanOrEqual( 38 );
  } );

  it( 'sources every narration line from a USGS claim', () => {
    const covered = new Set( CLAIMS.flatMap( c => c.lines ) );
    for ( const id of ids ) {
      expect( covered.has( id ) || UNCLAIMED_LINES.includes( id ), `line ${id} has no claim` ).toBe( true );
    }
    for ( const c of CLAIMS ) {
      expect( c.source.length ).toBeGreaterThan( 0 );
      expect( c.source.every( s => s.startsWith( 'https://www.usgs.gov/' ) ) ).toBe( true );
      expect( c.lines.every( l => ids.includes( l ) ) ).toBe( true );
    }
    expect( [ FAQ_URL, FANTASY_URL ] ).toEqual( [ expect.stringContaining( 'will-california-eventually-fall-ocean' ), expect.stringContaining( 'earthquake-fantasy' ) ] );
  } );

  it( 'states only the numbers and timeframe its claims support', () => {
    expect( text ).toContain( 'forty-six millimeters a year' );
    expect( text ).toContain( 'about fifteen million years' );
    const rate = CLAIMS.find( c => c.id === 'rate' )!;
    expect( rate.claim ).toContain( '46 mm' );
    expect( rate.claim ).toContain( 'relative to the North American Plate' );
    const timeframe = CLAIMS.find( c => c.id === 'neighbors' )!;
    expect( timeframe.claim ).toContain( '15 million years' );
    expect( timeframe.source ).toEqual( [ FANTASY_URL ] );
    expect( text ).not.toMatch( /\d/ );
  } );

  it( 'keeps the corrected wording', () => {
    expect( text ).not.toMatch( /creep/i );
    expect( text ).not.toMatch( /sink/i );
    expect( text ).toContain( 'Relative to the North American Plate, the Pacific Plate moves northwest' );
    expect( text ).toContain( 'Southwestern California is moving north' );
    expect( text ).not.toMatch( /all of California|the whole state|California sits on/i );
  } );
} );
