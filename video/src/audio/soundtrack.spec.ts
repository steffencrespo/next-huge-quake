import { describe, expect, it } from 'vitest';
import { notoSoundtrack } from './noto.js';
import { panamaSoundtrack } from './panama.js';
import { MIX, captionAt, musicGain, soundtrackSchema } from './soundtrack.js';

const video = 35;

describe( 'noto soundtrack', () => {
  it( 'is valid and its captions are ordered, non-overlapping and inside the narration', () => {
    soundtrackSchema.parse( notoSoundtrack );
    const { captions, narrationDuration, narrationStart } = notoSoundtrack;
    captions.forEach( ( c, i ) => {
      expect( c.end ).toBeLessThanOrEqual( narrationDuration );
      if ( i > 0 ) {
        expect( c.start ).toBeGreaterThanOrEqual( captions[i - 1].end );
      }
    } );
    expect( narrationStart + narrationDuration ).toBeLessThan( video );
  } );

  it( 'shows captions offset by the narration start', () => {
    expect( captionAt( 0.5, notoSoundtrack ) ).toBeNull();
    expect( captionAt( 1.5 + 3, notoSoundtrack )?.text ).toContain( 'magnitude' );
  } );
} );

describe( 'panama soundtrack', () => {
  it( 'is valid, ordered, inside the narration and leaves room for the closing swell', () => {
    soundtrackSchema.parse( panamaSoundtrack );
    const { captions, narrationDuration, narrationStart } = panamaSoundtrack;
    captions.forEach( ( c, i ) => {
      expect( c.end ).toBeLessThanOrEqual( narrationDuration );
      if ( i > 0 ) {
        expect( c.start ).toBeGreaterThanOrEqual( captions[i - 1].end );
      }
    } );
    expect( video - ( narrationStart + narrationDuration ) ).toBeGreaterThan( MIX.swellRamp + MIX.fadeOut / 2 );
    expect( captionAt( 1.5 + 16, panamaSoundtrack )?.text ).toContain( 'magnitude' );
  } );
} );

describe( 'musicGain', () => {
  const g = ( t: number ) => musicGain( t, notoSoundtrack, video );
  it( 'opens loud, ducks under the voice, swells after it and fades to silence', () => {
    expect( g( 0 ) ).toBeCloseTo( MIX.openGain );
    expect( g( 10 ) ).toBeCloseTo( MIX.duckGain );
    expect( g( 33.5 ) ).toBeCloseTo( MIX.endGain * 0.75 );
    expect( g( 35 ) ).toBe( 0 );
  } );
  it( 'never exceeds the open gain', () => {
    for ( let t = 0; t <= video; t += 0.1 ) {
      expect( g( t ) ).toBeLessThanOrEqual( MIX.openGain );
    }
  } );
} );
