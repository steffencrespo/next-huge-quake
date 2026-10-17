import { describe, expect, it } from 'vitest';
import { CANVAS, CONTENT, LAYOUTS, MAP_ZONE, REGIONS, SAFE, inside, overlaps } from './layout.js';

describe( 'layout', () => {
  it( 'derives the content area from the platform safe area', () => {
    expect( CONTENT ).toEqual( { x: SAFE.left, y: SAFE.top, width: CANVAS.width - SAFE.left - SAFE.right, height: CANVAS.height - SAFE.top - SAFE.bottom } );
  } );

  it( 'keeps every text region inside the safe area', () => {
    for ( const [ name, rect ] of Object.entries( REGIONS ) ) {
      expect( inside( rect, CONTENT ), name ).toBe( true );
    }
  } );

  it( 'never overlaps regions that are shown together', () => {
    for ( const [ layout, names ] of Object.entries( LAYOUTS ) ) {
      for ( const [ i, a ] of names.entries() ) {
        for ( const b of names.slice( i + 1 ) ) {
          expect( overlaps( REGIONS[a], REGIONS[b] ), `${layout}: ${a} / ${b}` ).toBe( false );
        }
      }
    }
  } );

  it( 'reserves the map zone in the facts layout', () => {
    for ( const name of LAYOUTS.facts ) {
      expect( overlaps( REGIONS[name], MAP_ZONE ), name ).toBe( false );
    }
  } );
} );
