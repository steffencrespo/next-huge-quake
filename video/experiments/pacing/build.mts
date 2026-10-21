/**
 * Pacing experiment: rebuilds the published Panama narration (no new TTS) with shorter sentence gaps and/or 1.10x
 * speech, then writes the matching props (captions and scene frames re-timed). Usage: node build.mts
 * Speech phrases are split at the silences the existing soundtrack captions were timed against (-35 dB, >= 0.2 s).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL( '../../', import.meta.url ).pathname;
const FF = `${root}node_modules/@remotion/compositor-darwin-x64`;
const env = { ...process.env, DYLD_LIBRARY_PATH: FF };
const SRC = `${root}public/audio/panama-narration.mp3`;
const outDir = `${root}out/experiments/pacing`;
mkdirSync( outDir, { recursive: true } );

const base = JSON.parse( readFileSync( `${root}out/news/panama.spec.json`, 'utf8' ) );
const FPS = 30, GAP = 0.1, RATE = 1.1;
const dur = Number( execFileSync( `${FF}/ffprobe`, [ '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', SRC ], { env } ).toString() );

const log = spawnSync( `${FF}/ffmpeg`, [ '-hide_banner', '-i', SRC, '-af', 'silencedetect=noise=-35dB:d=0.2', '-f', 'null', '-' ], { env } ).stderr.toString();
const starts = [ ...log.matchAll( /silence_start: ([\d.]+)/g ) ].map( m => +m[ 1 ] );
const ends = [ ...log.matchAll( /silence_end: ([\d.]+)/g ) ].map( m => +m[ 1 ] );
// the file ends in silence: that last one is the tail, not a gap between phrases
const gaps = starts.map( ( s, i ) => ( { s, e: ends[ i ] ?? dur } ) ).filter( g => g.e < dur - 0.01 );
const phrases = Array.from( { length: gaps.length + 1 }, ( _, i ) => ( { s: i ? gaps[ i - 1 ].e : 0, e: i < gaps.length ? gaps[ i ].s : dur } ) );
const captions: { text: string; start: number; end: number }[] = base.soundtrack.captions;
if ( captions.length !== phrases.length ) throw new Error( `captions ${captions.length} != phrases ${phrases.length}` );
const isSentenceEnd = ( j: number ) => /[.!?]$/.test( captions[ j ].text ); // gap j follows caption j

// ---- measurements -------------------------------------------------------------------------------------------------
const gapLens = gaps.map( g => g.e - g.s );
const sum = ( a: number[] ) => a.reduce( ( x, y ) => x + y, 0 );
const sentenceGaps = gapLens.filter( ( _, j ) => isSentenceEnd( j ) );
const r3 = ( n: number ) => Math.round( n * 1000 ) / 1000;
const measure = {
  videoSeconds: base.spec.scenes.reduce( ( a: number, s: any ) => a + s.frames, 0 ) / FPS,
  narrationFileSeconds: dur,
  segments: phrases.length,
  gapsBetweenSegments: gapLens.map( ( g, j ) => ( { after: captions[ j ].text, seconds: r3( g ), sentenceEnd: isSentenceEnd( j ) } ) ),
  totalGap: r3( sum( gapLens ) ), avgGap: r3( sum( gapLens ) / gapLens.length ), maxGap: r3( Math.max( ...gapLens ) ),
  sentenceGapCount: sentenceGaps.length, sentenceGapTotal: r3( sum( sentenceGaps ) ), sentenceGapAvg: r3( sum( sentenceGaps ) / sentenceGaps.length ),
  speechSeconds: r3( sum( phrases.map( p => p.e - p.s ) ) ), voiceLead: phrases[ 0 ].s
};
writeFileSync( `${outDir}/measurements.json`, JSON.stringify( measure, null, 2 ) );

/** Real length of one speech piece after atempo (the filter adds a few ms per piece, which would drift the captions). */
function speechLength( s: number, e: number, rate: number ): number {
  if ( rate === 1 ) return e - s;
  const out = execFileSync( `${FF}/ffmpeg`, [ '-hide_banner', '-i', SRC, '-af', `atrim=${s}:${e},asetpts=PTS-STARTPTS,atempo=${rate}`, '-f', 'wav', '-' ], { env, maxBuffer: 1e8, stdio: [ 'ignore', 'pipe', 'ignore' ] } );
  return ( out.length - 44 ) / ( 44100 * 2 );
}

// ---- variants -----------------------------------------------------------------------------------------------------
type Piece = { os: number; oe: number; ns: number; ne: number; speech: boolean; head?: number; tail?: number };
const DEIFIED = { file: 'audio/ytal-deified-the-grey-room.mp3', credit: '"Deified" by The Grey Room / Density & Time.\nSource: YouTube Audio Library.' };
/** commaGap: target pause after a comma phrase (seconds, by gap index); closingFrames: shorter closing scene. Deified music when `deified`. */
function variant( name: string, rate: number, sentenceGap: number | null, opts: { commaGap?: ( j: number ) => number; closingFrames?: number; deified?: boolean; endBeforeClosing?: number } = {} ) {
  const pieces: Piece[] = [];
  let t = 0;
  const add = ( os: number, oe: number, newLen: number, speech: boolean, extra: Partial<Piece> = {} ) => { pieces.push( { os, oe, ns: t, ne: t + newLen, speech, ...extra } ); t += newLen; };
  phrases.forEach( ( p, i ) => {
    add( p.s, p.e, speechLength( p.s, p.e, rate ), true );
    if ( i < gaps.length ) {
      const g = gaps[ i ], G = g.e - g.s;
      if ( sentenceGap !== null && isSentenceEnd( i ) ) add( g.s, g.e, sentenceGap, false, { head: sentenceGap / 2, tail: sentenceGap / 2 } );
      else if ( opts.commaGap ) { const T = opts.commaGap( i ); add( g.s, g.e, T, false, { head: T / 2, tail: T / 2 } ); }
      else add( g.s, g.e, G, false );
    }
  } );
  const f = ( x: number ) => {
    const p = pieces.find( q => x <= q.oe + 1e-9 ) ?? pieces[ pieces.length - 1 ];
    return p.ns + ( x - p.os ) * ( p.ne - p.ns ) / ( p.oe - p.os );
  };
  const filters = pieces.map( ( p, i ) => {
    if ( p.speech ) return `[0:a]atrim=${p.os}:${p.oe},asetpts=PTS-STARTPTS${rate === 1 ? '' : `,atempo=${rate}`}[p${i}]`;
    if ( p.head === undefined ) return `[0:a]atrim=${p.os}:${p.oe},asetpts=PTS-STARTPTS[p${i}]`;
    // compressed gap: keep the first and last half of the original pause (room tone either side of the words)
    return `[0:a]atrim=${p.os}:${p.os + p.head},asetpts=PTS-STARTPTS[h${i}];[0:a]atrim=${p.oe - p.tail!}:${p.oe},asetpts=PTS-STARTPTS[t${i}];[h${i}][t${i}]concat=n=2:v=0:a=1[p${i}]`;
  } );
  const wav = `${root}public/audio/exp-panama-${name}-narration.wav`;
  execFileSync( `${FF}/ffmpeg`, [ '-y', '-hide_banner', '-loglevel', 'error', '-i', SRC, '-filter_complex',
    `${filters.join( ';' )};${pieces.map( ( _, i ) => `[p${i}]` ).join( '' )}concat=n=${pieces.length}:v=0:a=1[out]`, '-map', '[out]', '-c:a', 'pcm_s16le', wav ], { env } );
  const actual = Number( execFileSync( `${FF}/ffprobe`, [ '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav ], { env } ).toString() );

  const narrationDuration = r3( actual );
  const soundtrack = { ...base.soundtrack, narrationFile: `audio/exp-panama-${name}-narration.wav`, narrationDuration,
    captions: captions.map( c => ( { ...c, start: r3( Math.min( f( c.start ), actual - 0.001 ) ), end: r3( Math.min( f( c.end ), actual ) ) } ) ) };
  // Same tail after the voice as the published video (35 s - 1.5 s - 29.73 s = 3.77 s); hook and closing keep their frames,
  // facts and context share the remainder in the published 1:1 ratio.
  const tail = measure.videoSeconds - base.soundtrack.narrationStart - dur;
  // endBeforeClosing: the closing scene starts that many seconds after the voice ends (no overlap, no tail beyond the closing)
  const total0 = opts.endBeforeClosing !== undefined ? Math.round( ( base.soundtrack.narrationStart + narrationDuration + opts.endBeforeClosing ) * FPS ) + 150 : Math.round( ( base.soundtrack.narrationStart + narrationDuration + tail ) * FPS );
  const closing = opts.closingFrames ?? 150;
  const total = total0 - ( 150 - closing );
  const flex = total - 180 - closing, facts = Math.round( flex / 2 );
  const scenes = base.spec.scenes.map( ( s: any ) => s.kind === 'facts' ? { ...s, frames: facts } : s.kind === 'context' ? { ...s, frames: flex - facts } : s.kind === 'closing' ? { ...s, frames: closing } : s );
  const spec = { ...base.spec, scenes };
  if ( opts.deified ) { soundtrack.musicFile = DEIFIED.file; soundtrack.musicCredit = DEIFIED.credit; }
  const pushEnd = total - closing; // the slow camera push ends with the context scene, as in production (frame 900 of 1050)
  const closingSpeed = closing < 150 ? 2.5 : 1; // plays the closing card's entrance 2.5x faster so every part is settled in ~0.9 s
  writeFileSync( `${outDir}/${name}.props.json`, JSON.stringify( { spec, soundtrack, pushEnd, closingSpeed }, null, 2 ) );
  const info = { name, rate, sentenceGap, narrationSeconds: narrationDuration, predicted: r3( t ), videoFrames: total, videoSeconds: r3( total / FPS ), sceneFrames: scenes.map( ( s: any ) => `${s.kind}:${s.frames}` ).join( ' ' ) };
  console.log( JSON.stringify( info ) );
  return info;
}
// Comma pauses: 0.15 s, 0.20 s after the colon ("a stark reminder:") where the pause carries meaning.
const comma = ( j: number ) => /:$/.test( captions[ j ].text ) ? 0.2 : 0.15;
const infos = process.argv[ 2 ] === 'd4'
  ? [ variant( 'D4', 1.2, GAP, { commaGap: comma, closingFrames: 45, deified: true, endBeforeClosing: 0.3 } ) ]
  : process.argv[ 2 ] === 'new'
  ? [ variant( 'D2', RATE, GAP, { commaGap: comma, deified: true } ), variant( 'D3', RATE, GAP, { commaGap: comma, closingFrames: 45, deified: true } ) ]
  : [ variant( 'B', 1, GAP ), variant( 'C', RATE, null ), variant( 'D', RATE, GAP ) ];
writeFileSync( `${outDir}/variants${process.argv[ 2 ] === 'new' ? '-d2d3' : process.argv[ 2 ] === 'd4' ? '-d4' : ''}.json`, JSON.stringify( infos, null, 2 ) );
console.log( JSON.stringify( { ...measure, gapsBetweenSegments: undefined } ) );
