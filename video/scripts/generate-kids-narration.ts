/**
 * Narration for "Why Does the Earth Shake?" (kids series) with ElevenLabs, one clip per script line.
 *
 * Usage: tsx scripts/generate-kids-narration.ts [--ep=short|safety] [--generate] [--budget=<credits>]
 * Without --generate it is a dry run (no request). With --generate it requests only clips that are not cached for the
 * same text, voice and model, stops at the first failure, refuses to start when the new characters exceed the budget,
 * and never regenerates a cached clip. The voice is the kids Max voice from src/kids/config.ts, not the ELEVENLABS_VOICE_ID
 * of the adult workflows; the API key comes from the usual environment / .env.local. Clips are cached (git-ignored) in
 * assets/audio/kids/narration/. When every clip exists it writes out/kids/audio.json for scripts/render-kids.ts --final.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignmentToCaptions } from '../src/audio/captions.js';
import { generateSpeech, loadTtsConfig, parseEnvFile, speechFromAudio } from '../src/audio/tts.js';
import { MAX_CLIP_SECONDS, placeClips } from '../src/edu/narration.js';
import type { ClipInput } from '../src/edu/narration.js';
import { normalizeText } from '../src/edu/library.js';
import { KIDS_EPISODE, KIDS_EPISODES, KIDS_MUSIC, KIDS_VOICE } from '../src/kids/config.js';
import type { KidsEpKey } from '../src/kids/config.js';
import { kidsAudioSchema } from '../src/kids/audio.js';
import { creditsPerCharacter } from '../src/kids/credits.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const epArg = args.find( a => a.startsWith( '--ep=' ) )?.slice( 5 );
if ( epArg && !( epArg in KIDS_EPISODES ) ) {
  throw new Error( `unknown --ep=${epArg}; expected one of ${Object.keys( KIDS_EPISODES ).join( ', ' )}` );
}
const ep = epArg as KidsEpKey | undefined;
const cacheDir = join( root, 'assets', 'audio', 'kids', ep ? `narration-${ep}` : 'narration' );
const clipFile = ( id: string ) => ep ? `audio/kids/${ep}-${id}.mp3` : `audio/kids/${id}.mp3`;
const audioOut = join( root, 'out', 'kids', ep ? `${ep}.audio.json` : 'audio.json' );
const MODEL = 'eleven_multilingual_v2';
const budget = Number( args.find( a => a.startsWith( '--budget=' ) )?.slice( 9 ) ?? 643 );
const SCRIPT = ( ep ? KIDS_EPISODES[ep] : KIDS_EPISODE ).script;

const mp3Path = ( id: string ) => join( cacheDir, `${id}.mp3` );
const alignmentPath = ( id: string ) => join( cacheDir, `${id}.alignment.json` );
const metaPath = ( id: string ) => join( cacheDir, `${id}.meta.json` );
const identity = ( text: string ) => JSON.stringify( { text: normalizeText( text ), voiceId: KIDS_VOICE.id, modelId: MODEL } );
const cached = ( id: string, text: string ) => existsSync( mp3Path( id ) ) && existsSync( alignmentPath( id ) ) && existsSync( metaPath( id ) ) && readFileSync( metaPath( id ), 'utf8' ).trim() === identity( text );

/** Average level (dB) of the voiced part of a clip, measured on a decoded copy (Remotion's bundled ffmpeg). */
function voicedRmsDb( mp3: string ): number {
  const tmp = join( root, 'out', 'kids', 'level.wav' );
  mkdirSync( dirname( tmp ), { recursive: true } );
  execFileSync( 'npx', [ 'remotion', 'ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', '22050', tmp ], { cwd: root } );
  const pcm = readFileSync( tmp ).subarray( 44 );
  rmSync( tmp, { force: true } );
  let sum = 0;
  let count = 0;
  for ( let i = 0; i + 1 < pcm.length; i += 2 ) {
    const v = pcm.readInt16LE( i ) / 32768;
    if ( Math.abs( v ) > 0.02 ) {
      sum += v * v;
      count++;
    }
  }
  return 10 * Math.log10( sum / Math.max( 1, count ) );
}
const gainFor = ( db: number, target: number ) => Math.round( Math.min( 1.4, Math.max( 0.7, 10 ** ( ( target - db ) / 20 ) ) ) * 100 ) / 100;

try {
  const envFile = join( root, '.env.local' );
  const env = { ...( existsSync( envFile ) ? parseEnvFile( readFileSync( envFile, 'utf8' ) ) : {} ), ...process.env };
  const base = loadTtsConfig( env );
  if ( base.modelId !== MODEL ) {
    throw new Error( `ELEVENLABS_MODEL_ID is ${base.modelId}; the approved model is ${MODEL}` );
  }
  const config = { ...base, voiceId: KIDS_VOICE.id, modelId: MODEL };
  const todo = SCRIPT.filter( l => !cached( l.id, l.text ) );
  const chars = todo.reduce( ( n, l ) => n + normalizeText( l.text ).length, 0 );
  const credits = Math.ceil( chars * creditsPerCharacter( MODEL ) );
  console.log( `voice ${config.voiceId}, model ${config.modelId}; ${todo.length} of ${SCRIPT.length} clips to request, ${chars} characters, about ${credits} credits (budget ${budget})` );
  if ( !args.includes( '--generate' ) ) {
    console.log( 'dry run: no request made' );
    process.exit( 0 );
  }
  if ( credits > budget ) {
    throw new Error( `${credits} credits needed, over the budget of ${budget}; nothing requested` );
  }
  mkdirSync( cacheDir, { recursive: true } );
  let spent = 0;
  for ( const line of todo ) {
    const speech = await generateSpeech( normalizeText( line.text ), config, fetch, MAX_CLIP_SECONDS );
    writeFileSync( mp3Path( line.id ), speech.mp3 );
    writeFileSync( alignmentPath( line.id ), `${JSON.stringify( speech.alignment )}\n` );
    writeFileSync( metaPath( line.id ), `${identity( line.text )}\n` );
    spent += normalizeText( line.text ).length;
    console.log( `  generated ${line.id}: ${speech.durationSeconds.toFixed( 2 )} s (${spent} characters so far)` );
  }

  const levels = SCRIPT.map( l => voicedRmsDb( mp3Path( l.id ) ) );
  const target = [ ...levels ].sort( ( a, b ) => a - b )[Math.floor( levels.length / 2 )];
  const clips: ClipInput[] = SCRIPT.map( ( line, i ) => {
    const speech = speechFromAudio( normalizeText( line.text ), readFileSync( mp3Path( line.id ) ), JSON.parse( readFileSync( alignmentPath( line.id ), 'utf8' ) ), MAX_CLIP_SECONDS );
    return { id: line.id, file: clipFile( line.id ), duration: speech.durationSeconds, captions: alignmentToCaptions( speech.alignment ), gain: gainFor( levels[i], target ) };
  } );
  const audio = kidsAudioSchema.parse( { ...placeClips( ep === 'short' ? SCRIPT.map( ( l, i ) => ( i === 0 ? l : { ...l, start: 0 } ) ) : SCRIPT, clips ), musicFile: KIDS_MUSIC.file, musicCredit: KIDS_MUSIC.credit } );
  mkdirSync( join( root, 'out', 'kids' ), { recursive: true } );
  writeFileSync( audioOut, `${JSON.stringify( audio, null, 2 )}\n` );
  console.log( `characters requested this run: ${spent} (about ${Math.ceil( spent * creditsPerCharacter( MODEL ) )} credits)\nnarration ${audio.narrationStart}-${audio.narrationEnd} s, ${audio.captions.length} captions\nwrote ${audioOut}` );
} catch ( error ) {
  console.error( `narration failed: ${error instanceof Error ? error.message : String( error )}` );
  process.exit( 1 );
}
