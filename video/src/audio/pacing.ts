/**
 * Narration pacing presets. The `fast` preset is the Panama D4 experiment: the narration plays at 1.2x with the pitch
 * preserved (ffmpeg atempo), and the pauses between phrases are shortened to fixed lengths. Pure planning only; the
 * ffmpeg work is in scripts/lib/pace-audio.ts.
 *
 * Pauses are the silences of the existing audio (below `silenceDb` for at least `minSilence` seconds). Each one is
 * classified from the phrase before it (a pause inside a caption is placed by its position in the text): a sentence end gets `sentenceGap`, a colon, ellipsis or dash `pauseGap`, any
 * other phrase break `commaGap`. A pause that is already shorter than its target is left alone, never lengthened.
 * A compressed pause keeps the first and last half of the original silence, so the room tone either side of the words
 * stays natural. Captions are re-timed through the same piecewise map, so they stay locked to the speech.
 */
import type { Caption } from './soundtrack.js';

export type PacingPreset = {
  name: string;
  /** Speech speed factor (atempo): pitch is preserved. */
  rate: number;
  /** Target pause after a sentence end (seconds). Also the total silence kept at each end of a clip. */
  sentenceGap: number;
  /** Target pause at a comma or other phrase break. */
  commaGap: number;
  /** Target pause after a colon, ellipsis or dash, where the pause carries meaning. */
  pauseGap: number;
  /** Silence detection, as used for the original captions. */
  silenceDb: number;
  minSilence: number;
  /** Keep the pauses the episode script declares on purpose (ScriptLine.gap) instead of tightening them to the sentence gap. */
  keepPauses?: boolean;
};

/** Recovered from video/experiments/pacing/build.mts, variant D4 (published Panama M7.7 Quick Version). */
export const FAST_PACING: PacingPreset = { name: 'fast', rate: 1.2, sentenceGap: 0.1, commaGap: 0.15, pauseGap: 0.2, silenceDb: -35, minSilence: 0.2 };
/** Silence kept at the start and end of a clip, so the cut never clips a soft onset or release. */
export const EDGE_KEEP_SECONDS = 0.03;
/** Gap to leave between two back-to-back paced clips so the pause between sentences is `sentenceGap` in total. */
export const clipGap = ( preset: PacingPreset ) => Math.max( 0, preset.sentenceGap - 2 * EDGE_KEEP_SECONDS );

/** `fast` with the storyboard's declared pauses kept (e.g. the MYTH to FACT reveal and the punchline). */
export const FAST_BEATS_PACING: PacingPreset = { ...FAST_PACING, name: 'fast-beats', keepPauses: true };
export const PACING_PRESETS: Record<string, PacingPreset> = { fast: FAST_PACING, 'fast-beats': FAST_BEATS_PACING };

/** The pacing newly produced Shorts use. `natural` (no processing) is still available for re-renders of existing videos. */
export const DEFAULT_PACING = 'fast-beats';
export const NATURAL_PACING = 'natural';

/** Preset for a `--pace` value: the default when omitted, undefined for `natural`. */
export const resolvePacing = ( name: string | undefined ): PacingPreset | undefined => ( ( name ?? DEFAULT_PACING ) === NATURAL_PACING ? undefined : pacingPreset( name ?? DEFAULT_PACING ) );

export const pacingPreset = ( name: string ): PacingPreset => {
  const preset = PACING_PRESETS[name];
  if ( !preset ) {
    throw new Error( `unknown pacing '${name}'; choose ${[ ...Object.keys( PACING_PRESETS ), NATURAL_PACING ].join( ' | ' )}` );
  }
  return preset;
};

export type Silence = { start: number; end: number };
/** `segments` are the source intervals kept (one for speech and untouched pauses, two for a compressed pause). */
export type Piece = { kind: 'speech' | 'gap'; os: number; oe: number; segments: [ number, number ][] };

const SENTENCE_END = /[.?!]["')\]”’]*$/;
const MEANINGFUL_PAUSE = /[:…—–]["')\]”’]*$/;

/** Target length of the pause that follows the phrase ending with `text`. */
export function gapTarget( text: string | undefined, preset: PacingPreset ): number {
  const t = ( text ?? '' ).trim();
  return SENTENCE_END.test( t ) ? preset.sentenceGap : MEANINGFUL_PAUSE.test( t ) || /\.\.\.$/.test( t ) ? preset.pauseGap : preset.commaGap;
}

/** The words just before a pause: the caption's text at a caption boundary, else the word the pause falls after. */
function pauseText( captions: Caption[], s: number, e: number ): string | undefined {
  const c = [ ...captions ].reverse().find( x => x.start < s );
  if ( !c || c.end <= e + 0.05 ) {
    return c?.text;
  }
  const words = c.text.split( ' ' );
  const fraction = ( s - c.start ) / ( c.end - c.start );
  let seen = 0;
  return words.find( w => ( seen += w.length + 1 ) / ( c.text.length + 1 ) >= fraction ) ?? words[words.length - 1];
}

/** Splits the source audio into speech and pause pieces. The pieces are contiguous except for trimmed edge silence. */
export function planPieces( duration: number, silences: Silence[], captions: Caption[], preset: PacingPreset ): Piece[] {
  const pad = EDGE_KEEP_SECONDS;
  const pieces: Piece[] = [];
  const speech = ( a: number, b: number ) => {
    if ( b - a > 1e-6 ) {
      pieces.push( { kind: 'speech', os: a, oe: b, segments: [ [ a, b ] ] } );
    }
  };
  let cursor = 0;
  for ( const { start: s, end: e } of silences ) {
    if ( s <= 0.01 && e < duration - 0.01 ) {
      cursor = Math.max( s, e - pad ); // leading silence: keep only the last `pad` seconds
    } else if ( e >= duration - 0.01 ) {
      speech( cursor, s );
      const keep = Math.min( e, s + pad ); // trailing silence: keep only the first `pad` seconds
      pieces.push( { kind: 'gap', os: s, oe: keep, segments: [ [ s, keep ] ] } );
      cursor = duration;
    } else {
      speech( cursor, s );
      const before = pauseText( captions, s, e );
      const length = e - s;
      const target = Math.min( length, gapTarget( before, preset ) );
      const half = target / 2;
      pieces.push( { kind: 'gap', os: s, oe: e, segments: target < length - 1e-6 ? [ [ s, s + half ], [ e - half, e ] ] : [ [ s, e ] ] } );
      cursor = e;
    }
  }
  speech( cursor, duration );
  return pieces;
}

/** Maps source time to output time. `lengths[i]` is the real (measured) output length of piece i. */
export function timeMap( pieces: Piece[], lengths: number[] ): ( x: number ) => number {
  const starts: number[] = [];
  lengths.reduce( ( t, len, i ) => ( starts[i] = t, t + len ), 0 );
  const total = lengths.reduce( ( a, b ) => a + b, 0 );
  return x => {
    if ( x <= pieces[0].os ) {
      return 0;
    }
    const i = pieces.findIndex( p => x <= p.oe + 1e-9 );
    if ( i < 0 ) {
      return total;
    }
    const p = pieces[i];
    return starts[i] + ( ( x - p.os ) * lengths[i] ) / ( p.oe - p.os );
  };
}

const round3 = ( n: number ) => Math.round( n * 1000 ) / 1000;

/** Captions re-timed to the paced audio, never past `duration`, always with end after start. */
export function retimeCaptions( captions: Caption[], f: ( x: number ) => number, duration: number ): Caption[] {
  return captions.map( c => {
    const start = Math.min( f( c.start ), duration - 0.002 );
    const end = Math.min( Math.max( f( c.end ), start + 0.001 ), duration );
    return { text: c.text, start: round3( start ), end: Math.max( round3( end ), round3( start ) + 0.001 ) };
  } );
}
