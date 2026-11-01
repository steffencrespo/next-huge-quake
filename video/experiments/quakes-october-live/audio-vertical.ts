/** tsx experiments/quakes-october-live/audio-vertical.ts : FREE. Builds audio-vertical.json for the 9:16 edit from cached library clips only
 * (every line is a landscape line, see script-vertical.ts), paced with fast-beats (1.2x, the Panama D4 pacing). Never calls ElevenLabs:
 * a missing clip is an error. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignmentToCaptions } from '../../src/audio/captions.js';
import { DEFAULT_MUSIC, MUSIC } from '../../src/audio/music.js';
import { FAST_BEATS_PACING, clipGap } from '../../src/audio/pacing.js';
import type { Caption } from '../../src/audio/soundtrack.js';
import { OUTPUT_FORMAT, loadTtsConfig, parseEnvFile, speechFromAudio } from '../../src/audio/tts.js';
import { openLibrary } from '../../src/edu/library.js';
import { MAX_CLIP_SECONDS, eduAudioSchema, placeClips } from '../../src/edu/narration.js';
import type { ClipInput } from '../../src/edu/narration.js';
import { paceNarration } from '../../scripts/lib/pace-audio.js';
import { QUAKES_OCTOBER_VERTICAL } from './script-vertical.js';

const here = dirname( new URL( import.meta.url ).pathname );
const root = join( here, '..', '..' );
const config = loadTtsConfig( { ...parseEnvFile( readFileSync( join( root, '.env.local' ), 'utf8' ) ), ...process.env } );
const library = openLibrary( join( root, 'assets', 'audio', 'edu', 'library' ) );
const identity = ( text: string ) => ( { text, voiceId: config.voiceId, modelId: config.modelId, outputFormat: OUTPUT_FORMAT } );
const script = QUAKES_OCTOBER_VERTICAL.script;
const missing = script.filter( l => !library.has( identity( l.text ) ) );
for ( const l of script ) console.log( `${library.has( identity( l.text ) ) ? 'REUSED' : 'MISSING'} ${l.id.padEnd( 5 )} ${l.text}` );
if ( missing.length ) throw new Error( `missing clips: ${missing.map( l => l.id ).join( ', ' )}; this script never generates` );

const pace = FAST_BEATS_PACING;
const pacedDir = join( root, 'out', 'edu', 'paced', pace.name );
const rms = ( mp3: string ) => {
  const tmp = join( root, 'out', 'edu', 'level.wav' );
  execFileSync( 'npx', [ 'remotion', 'ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', '22050', '-c:a', 'pcm_s16le', tmp ], { cwd: root } );
  const pcm = readFileSync( tmp ).subarray( 44 ); rmSync( tmp, { force: true } );
  let s = 0, c = 0;
  for ( let i = 0; i + 1 < pcm.length; i += 2 ) { const v = pcm.readInt16LE( i ) / 32768; if ( Math.abs( v ) > 0.02 ) { s += v * v; c++; } }
  return 10 * Math.log10( s / Math.max( 1, c ) );
};
const levels = script.map( l => rms( library.paths( identity( l.text ) ).mp3 ) );
const target = [ ...levels ].sort( ( a, b ) => a - b )[Math.floor( levels.length / 2 )];
mkdirSync( pacedDir, { recursive: true } );
const clips: ClipInput[] = script.map( ( l, i ) => {
  const p = library.paths( identity( l.text ) );
  const speech = speechFromAudio( l.text, readFileSync( p.mp3 ), JSON.parse( readFileSync( p.alignment, 'utf8' ) ), MAX_CLIP_SECONDS );
  const captions = alignmentToCaptions( speech.alignment );
  const out = join( pacedDir, `${p.key}-${pace.name}.mp3` ), meta = join( pacedDir, `${p.key}-${pace.name}.json` );
  if ( !existsSync( out ) || !existsSync( meta ) ) writeFileSync( meta, `${JSON.stringify( paceNarration( { root, source: p.mp3, captions, preset: pace, outMp3: out } ) )}\n` );
  const fast = JSON.parse( readFileSync( meta, 'utf8' ) ) as { duration: number; captions: Caption[] };
  return { id: l.id, file: `audio/edu/${p.key}-${pace.name}.mp3`, duration: fast.duration, captions: fast.captions, gain: Math.round( Math.min( 1.4, Math.max( 0.7, 10 ** ( ( target - levels[i] ) / 20 ) ) ) * 100 ) / 100 };
} );
const audio = eduAudioSchema.parse( { ...placeClips( script, clips, { gap: clipGap( pace ), keepPauses: pace.keepPauses } ), musicFile: MUSIC[DEFAULT_MUSIC].file, musicCredit: MUSIC[DEFAULT_MUSIC].credit, pacing: pace.name } );
writeFileSync( join( here, 'audio-vertical.json' ), JSON.stringify( audio, null, 2 ) );
console.log( `audio-vertical.json: narration ${audio.narrationStart}-${audio.narrationEnd} s (fast-beats); no credits used` );
audio.clips.forEach( c => console.log( `  ${c.id.padEnd( 5 )} ${c.start.toFixed( 2 )}-${( c.start + c.duration ).toFixed( 2 )} gain ${c.gain}` ) );
