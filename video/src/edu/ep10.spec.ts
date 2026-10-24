import { describe, expect, it } from 'vitest';
import { CLAIMS, UNCLAIMED_LINES } from './ep10claims.js';
import { NEXT_BIG_ONE } from './ep10.js';
import { CTA_LINE, episodeSeconds } from './episodes.js';

const text = NEXT_BIG_ONE.script.map( l => l.text ).join( ' ' );

describe( 'Where Will the Next Big One Hit?', () => {
  it( 'every line cites a USGS claim and the script ends with the approved CTA', () => {
    const ids = NEXT_BIG_ONE.script.map( l => l.id );
    const covered = new Set( CLAIMS.flatMap( c => c.lines ) );
    ids.forEach( id => expect( covered.has( id ) || UNCLAIMED_LINES.includes( id ), `line ${ id } has no claim` ).toBe( true ) );
    CLAIMS.forEach( c => {
      expect( c.source.every( s => s.startsWith( 'https://www.usgs.gov/' ) || s.startsWith( 'https://pubs.usgs.gov/' ) ) ).toBe( true );
      expect( c.lines.every( l => ids.includes( l ) ) ).toBe( true );
    } );
    expect( NEXT_BIG_ONE.script.at( -1 )!.text ).toBe( CTA_LINE.text );
  } );

  it( 'opens with the approved hypothetical question and names the 2014-2043 reference period', () => {
    expect( NEXT_BIG_ONE.script[0].text ).toBe( 'Could two massive earthquakes strike America’s West Coast close together in time?' );
    expect( text ).toContain( 'twenty fourteen to twenty forty-three' );
  } );

  it( 'keeps the scientific guardrails', () => {
    expect( text ).not.toMatch( /seventy-four|74|trigger|predicts?\b(?! the next)|will (happen|hit|strike)|\bboth (will|are going)/i );
    expect( text ).toContain( 'Not comparable' );
    expect( text ).toContain( 'No official forecast says so' );
    expect( text ).toContain( 'We can’t predict the next big one' );
    expect( text ).toContain( 'one of many faults' );
  } );

  it( 'fits a Short', () => {
    expect( episodeSeconds( NEXT_BIG_ONE ) ).toBeLessThanOrEqual( 70 );
    expect( NEXT_BIG_ONE.script.slice( 0, -1 ).reduce( ( n, l ) => n + l.text.length, 0 ) ).toBeLessThan( 760 );
  } );
} );
