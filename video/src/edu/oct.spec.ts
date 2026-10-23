import { describe, expect, it } from 'vitest';
import { MAG10 } from './ep07.js';
import { VERSUS } from './ep08.js';
import { AFTERSHOCKS } from './ep09.js';
import { AFTERSHOCK_CLAIMS, MAG10_CLAIMS, UNCLAIMED_LINES, VERSUS_CLAIMS } from './octClaims.js';
import type { Claim } from './octClaims.js';
import type { EpisodeMeta } from './episodes.js';

const cases: [ EpisodeMeta, Claim[] ][] = [ [ MAG10, MAG10_CLAIMS ], [ VERSUS, VERSUS_CLAIMS ], [ AFTERSHOCKS, AFTERSHOCK_CLAIMS ] ];

describe( 'October 26/28/30 Shorts', () => {
  for ( const [ ep, claims ] of cases ) {
    it( `${ ep.title }: every line cites a USGS claim`, () => {
      const ids = ep.script.map( l => l.id );
      const covered = new Set( claims.flatMap( c => c.lines ) );
      for ( const id of ids ) {
        expect( covered.has( id ) || UNCLAIMED_LINES.includes( id ), `line ${ id } has no claim` ).toBe( true );
      }
      for ( const c of claims ) {
        expect( c.source.every( s => s.startsWith( 'https://www.usgs.gov/' ) ) ).toBe( true );
        expect( c.lines.every( l => ids.includes( l ) ) ).toBe( true );
      }
    } );
  }

  it( 'magnitude 10 never calls the event impossible', () => {
    expect( MAG10.script.map( l => l.text ).join( ' ' ) ).not.toMatch( /impossible|cannot happen|never happen/i );
  } );

  it( 'versus states the ratio as approximate and matches 10^(1.5 x 2.5)', () => {
    expect( VERSUS.script.find( l => l.id === 'ratio' )!.text ).toContain( 'about fifty-six hundred' );
    expect( Math.round( 10 ** ( 1.5 * ( 6.7 - 4.2 ) ) ) ).toBe( 5623 );
  } );

  it( 'aftershocks does not call every later earthquake an aftershock', () => {
    expect( AFTERSHOCKS.script.find( l => l.id === 'notall' )!.text ).toContain( 'Not every later earthquake is an aftershock' );
  } );
} );
