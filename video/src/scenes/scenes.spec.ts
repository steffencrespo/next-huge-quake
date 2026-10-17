import { describe, expect, it } from 'vitest';
import { DEFAULT_SCENE_FRAMES } from '../spec/build.js';
import { cardIndexAt, contextSegments } from './ContextScene.js';
import { FACTS_TIMING, factsRowStart } from './FactsScene.js';

describe( 'FactsScene timing', () => {
  it( 'brings every row in well before the panels leave', () => {
    const lastRowSettled = factsRowStart( 3 ) + 12;
    expect( lastRowSettled ).toBeLessThan( DEFAULT_SCENE_FRAMES.facts - FACTS_TIMING.exit - 5 * 30 ); // at least 5 s of full panel
  } );
} );

describe( 'ContextScene timing', () => {
  it( 'splits the scene into contiguous equal segments, one per card', () => {
    for ( const count of [ 1, 2, 3 ] ) {
      const segments = contextSegments( DEFAULT_SCENE_FRAMES.context, count );
      expect( segments ).toHaveLength( count );
      expect( segments[0].start ).toBe( 0 );
      expect( segments[count - 1].end ).toBe( DEFAULT_SCENE_FRAMES.context );
      for ( let i = 1; i < count; i++ ) {
        expect( segments[i].start ).toBe( segments[i - 1].end );
      }
    }
  } );

  it( 'gives each of three cards the same 4 s on screen, the last one included', () => {
    const lengths = contextSegments( DEFAULT_SCENE_FRAMES.context, 3 ).map( ( { start, end } ) => end - start );
    expect( lengths ).toEqual( [ 120, 120, 120 ] );
  } );

  it( 'shows exactly one card at a time', () => {
    const segments = contextSegments( 360, 3 );
    expect( [ 0, 119, 120, 239, 240, 359 ].map( f => cardIndexAt( f, segments ) ) ).toEqual( [ 0, 0, 1, 1, 2, 2 ] );
  } );
} );
