import { describe, expect, it } from 'vitest';
import { FAST_PACING, clipGap, gapTarget, pacingPreset, planPieces, retimeCaptions, timeMap } from './pacing.js';

const cap = ( text: string, start: number, end: number ) => ( { text, start, end } );

describe( 'fast pacing preset', () => {
  it( 'matches the Panama D4 experiment', () => {
    expect( FAST_PACING ).toMatchObject( { rate: 1.2, sentenceGap: 0.1, commaGap: 0.15, pauseGap: 0.2, silenceDb: -35, minSilence: 0.2 } );
    expect( pacingPreset( 'fast' ) ).toBe( FAST_PACING );
    expect( () => pacingPreset( 'x' ) ).toThrow( /unknown pacing/ );
  } );
  it( 'leaves 0.1 s between sentences in total', () => {
    expect( clipGap( FAST_PACING ) + 2 * 0.03 ).toBeCloseTo( 0.1 );
  } );
  it( 'classifies a pause inside a caption by its position in the text', () => {
    const captions = [ cap( 'Well… in about fifteen million years.', 0, 2 ) ];
    const [ , gap ] = planPieces( 2.4, [ { start: 0.3, end: 0.9 } ], captions, FAST_PACING );
    expect( gap.segments.reduce( ( n, [ a, b ] ) => n + b - a, 0 ) ).toBeCloseTo( 0.2 ); // after "Well…": the 0.2 s pause, not the 0.1 s sentence gap
  } );
  it( 'classifies pauses by the preceding phrase', () => {
    expect( gapTarget( 'It ends here.', FAST_PACING ) ).toBe( 0.1 );
    expect( gapTarget( 'Is it?', FAST_PACING ) ).toBe( 0.1 );
    expect( gapTarget( 'a stark reminder:', FAST_PACING ) ).toBe( 0.2 );
    expect( gapTarget( 'Well…', FAST_PACING ) ).toBe( 0.2 );
    expect( gapTarget( 'and then, slowly,', FAST_PACING ) ).toBe( 0.15 );
  } );
} );

describe( 'planPieces and retiming', () => {
  // 0-0.5 lead silence, speech 0.5-2, comma gap 2-2.6, speech 2.6-4, sentence gap 4-4.8, speech 4.8-6, tail 6-7
  const captions = [ cap( 'one two,', 0.5, 2.6 ), cap( 'three four.', 2.6, 4 ), cap( 'five six.', 4.8, 6 ) ];
  const silences = [ { start: 0, end: 0.5 }, { start: 2, end: 2.6 }, { start: 4, end: 4.8 }, { start: 6, end: 7 } ];
  const pieces = planPieces( 7, silences, captions, FAST_PACING );

  it( 'trims edge silence and compresses pauses to their targets', () => {
    expect( pieces.map( p => p.kind ) ).toEqual( [ 'speech', 'gap', 'speech', 'gap', 'speech', 'gap' ] );
    expect( pieces[0].os ).toBeCloseTo( 0.47 ); // only the last 0.03 s of the lead silence is kept
    const kept = ( i: number ) => pieces[i].segments.reduce( ( n, [ a, b ] ) => n + b - a, 0 );
    expect( kept( 1 ) ).toBeCloseTo( 0.15 );
    expect( kept( 3 ) ).toBeCloseTo( 0.1 );
    expect( kept( 5 ) ).toBeCloseTo( 0.03 );
  } );
  it( 'never lengthens a pause that is already short', () => {
    const p = planPieces( 3, [ { start: 1, end: 1.05 } ], [ cap( 'a.', 0, 1 ) ], FAST_PACING );
    expect( p[1].segments ).toEqual( [ [ 1, 1.05 ] ] );
  } );
  it( 'keeps captions locked to the speech after the speed-up', () => {
    const lengths = pieces.map( p => p.segments.reduce( ( n, [ a, b ] ) => n + b - a, 0 ) / ( p.kind === 'speech' ? 1.2 : 1 ) );
    const total = lengths.reduce( ( a, b ) => a + b, 0 );
    const f = timeMap( pieces, lengths );
    const out = retimeCaptions( captions, f, total );
    expect( out[0].start ).toBeCloseTo( 0.03 / 1.2, 2 ); // only 0.03 s of lead silence remains, sped up with the speech
    expect( out[2].start ).toBeCloseTo( ( total - 0.03 ) - 1.2 / 1.2, 2 ); // last phrase: 1.2 s of speech at 1.2x, then the 0.03 s tail
    out.forEach( ( c, i ) => {
      expect( c.end ).toBeGreaterThan( c.start );
      expect( c.end ).toBeLessThanOrEqual( total );
      if ( i ) {
        expect( c.start ).toBeGreaterThanOrEqual( out[i - 1].start );
      }
    } );
    expect( total ).toBeLessThan( 7 / 1.2 );
  } );
} );
