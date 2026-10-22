/**
 * Applies a pacing preset (src/audio/pacing.ts) to one narration MP3 with ffmpeg: speech at the preset rate with the
 * pitch preserved (atempo), pauses shortened, then re-encoded to MP3. Returns the new length and the captions re-timed
 * to it. Piece lengths are measured from the rendered samples (atempo adds a few milliseconds per piece), so the
 * captions do not drift. Makes no network request.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { planPieces, retimeCaptions, timeMap } from '../../src/audio/pacing.js';
import type { PacingPreset, Silence } from '../../src/audio/pacing.js';
import type { Caption } from '../../src/audio/soundtrack.js';

const RATE_HZ = 44100;

function ffmpeg( root: string, args: string[] ): string {
  const result = spawnSync( 'npx', [ 'remotion', 'ffmpeg', '-hide_banner', ...args ], { cwd: root, encoding: 'utf8', maxBuffer: 1e8 } );
  if ( result.status !== 0 ) {
    throw new Error( `ffmpeg failed: ${result.stderr.split( '\n' ).slice( -6 ).join( '\n' )}` );
  }
  return result.stderr;
}

/** Silences of `source` as the original captions were timed against them. */
export function detectSilences( root: string, source: string, preset: PacingPreset ): { duration: number; silences: Silence[] } {
  const log = ffmpeg( root, [ '-i', source, '-af', `silencedetect=noise=${preset.silenceDb}dB:d=${preset.minSilence}`, '-f', 'null', '-' ] );
  const duration = log.match( /Duration: (\d+):(\d+):([\d.]+)/ );
  const total = duration ? +duration[1] * 3600 + +duration[2] * 60 + +duration[3] : NaN;
  const starts = [ ...log.matchAll( /silence_start: (-?[\d.]+)/g ) ].map( m => Math.max( 0, +m[1] ) );
  const ends = [ ...log.matchAll( /silence_end: ([\d.]+)/g ) ].map( m => +m[1] );
  // the decoded length (from the last time stamp) is more exact than the container's rounded duration
  const decoded = [ ...log.matchAll( /time=(\d+):(\d+):([\d.]+)/g ) ].map( m => +m[1] * 3600 + +m[2] * 60 + +m[3] ).pop();
  const length = decoded ?? total;
  return { duration: length, silences: starts.map( ( start, i ) => ( { start, end: ends[i] ?? length } ) ) };
}

/** PCM bytes of a 16-bit mono WAV (finds the data chunk, so extra header chunks are fine). */
function pcmOf( wav: Buffer ): Buffer {
  let pos = 12;
  while ( pos + 8 <= wav.length ) {
    const id = wav.toString( 'ascii', pos, pos + 4 );
    const size = wav.readUInt32LE( pos + 4 );
    if ( id === 'data' ) {
      return wav.subarray( pos + 8, pos + 8 + Math.min( size, wav.length - pos - 8 ) );
    }
    pos += 8 + size + ( size % 2 );
  }
  throw new Error( 'no data chunk in WAV' );
}

function wavHeader( pcmBytes: number ): Buffer {
  const h = Buffer.alloc( 44 );
  h.write( 'RIFF', 0 ); h.writeUInt32LE( 36 + pcmBytes, 4 ); h.write( 'WAVEfmt ', 8 );
  h.writeUInt32LE( 16, 16 ); h.writeUInt16LE( 1, 20 ); h.writeUInt16LE( 1, 22 ); h.writeUInt32LE( RATE_HZ, 24 );
  h.writeUInt32LE( RATE_HZ * 2, 28 ); h.writeUInt16LE( 2, 32 ); h.writeUInt16LE( 16, 34 ); h.write( 'data', 36 ); h.writeUInt32LE( pcmBytes, 40 );
  return h;
}

export type PacedAudio = { duration: number; captions: Caption[]; sourceDuration: number; pauses: { before: number; after: number } };

export function paceNarration( { root, source, captions, preset, outMp3 }: { root: string; source: string; captions: Caption[]; preset: PacingPreset; outMp3: string } ): PacedAudio {
  const { duration, silences } = detectSilences( root, source, preset );
  const pieces = planPieces( duration, silences, captions, preset );
  const tmp = mkdtempSync( join( tmpdir(), 'pace-' ) );
  try {
    const graph = pieces.map( ( p, i ) => {
      const cut = ( a: number, b: number, tag: string ) => `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS${p.kind === 'speech' ? `,atempo=${preset.rate}` : ''}[${tag}]`;
      return p.segments.length === 1
        ? cut( p.segments[0][0], p.segments[0][1], `p${i}` )
        : `${cut( p.segments[0][0], p.segments[0][1], `h${i}` )};${cut( p.segments[1][0], p.segments[1][1], `t${i}` )};[h${i}][t${i}]concat=n=2:v=0:a=1[p${i}]`;
    } );
    const files = pieces.map( ( _, i ) => join( tmp, `p${i}.wav` ) );
    ffmpeg( root, [ '-y', '-loglevel', 'error', '-i', source, '-filter_complex', graph.join( ';' ),
      ...pieces.flatMap( ( _, i ) => [ '-map', `[p${i}]`, '-ar', String( RATE_HZ ), '-ac', '1', '-c:a', 'pcm_s16le', files[i] ] ) ] );
    const pcm = files.map( f => pcmOf( readFileSync( f ) ) );
    const lengths = pcm.map( b => b.length / 2 / RATE_HZ );
    const total = lengths.reduce( ( a, b ) => a + b, 0 );
    const wav = join( tmp, 'paced.wav' );
    writeFileSync( wav, Buffer.concat( [ wavHeader( pcm.reduce( ( n, b ) => n + b.length, 0 ) ), ...pcm ] ) );
    mkdirSync( dirname( outMp3 ), { recursive: true } );
    ffmpeg( root, [ '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-q:a', '2', outMp3 ] );
    const gapSum = ( src: boolean ) => pieces.reduce( ( n, p, i ) => ( p.kind === 'gap' ? n + ( src ? p.oe - p.os : lengths[i] ) : n ), 0 );
    return {
      duration: Math.round( total * 1000 ) / 1000,
      sourceDuration: duration,
      captions: retimeCaptions( captions, timeMap( pieces, lengths ), total ),
      pauses: { before: Math.round( gapSum( true ) * 1000 ) / 1000, after: Math.round( gapSum( false ) * 1000 ) / 1000 }
    };
  } finally {
    rmSync( tmp, { recursive: true, force: true } );
  }
}
