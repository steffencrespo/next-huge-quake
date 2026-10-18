import { describe, expect, it } from 'vitest';
import { SCRIPT, placeClips, scriptCharacters, videoSeconds } from './narration.js';
import { boom, rumble, wavBytes } from './sfx.js';

const clips = ( seconds: number ) => SCRIPT.map( l => ( { id: l.id, file: `audio/edu/${l.id}.mp3`, duration: seconds, captions: [ { text: l.text, start: 0, end: seconds } ] } ) );

describe( 'educational narration', () => {
  it( 'script is ordered and short enough to read in a minute', () => {
    expect( SCRIPT.every( ( l, i ) => i === 0 || l.start > SCRIPT[i - 1].start ) ).toBe( true );
    expect( scriptCharacters() ).toBeLessThan( 700 );
  } );

  it( 'places each clip at its scene start and offsets captions', () => {
    const placed = placeClips( SCRIPT, clips( 2.3 ) );
    expect( placed.clips.map( c => c.start ) ).toEqual( SCRIPT.map( l => l.start ) );
    expect( placed.captions[1].start ).toBe( SCRIPT[1].start );
    expect( placed.narrationEnd ).toBeCloseTo( 57.3, 5 );
  } );

  it( 'pushes a clip back when the previous one overruns and extends the video when needed', () => {
    const long = clips( 2.5 );
    long[0].duration = 8;
    const placed = placeClips( SCRIPT, long );
    expect( placed.clips[1].start ).toBeCloseTo( 0.8 + 8 + 0.3, 5 );
    expect( () => placeClips( SCRIPT, clips( 9.5 ) ) ).toThrow( /over 9 s/ );
    expect( videoSeconds( 59.34 ) ).toBe( 62 );
    expect( videoSeconds( 50 ) ).toBe( 60 );
  } );
} );

describe( 'sound effects', () => {
  it( 'are deterministic, non-silent and within range', () => {
    const a = rumble( 1 );
    expect( Buffer.compare( wavBytes( a ), wavBytes( rumble( 1 ) ) ) ).toBe( 0 );
    expect( Math.max( ...a.map( Math.abs ) ) ).toBeLessThanOrEqual( 0.85 + 1e-6 );
    expect( Math.max( ...boom( 1 ).map( Math.abs ) ) ).toBeGreaterThan( 0.5 );
  } );
} );
