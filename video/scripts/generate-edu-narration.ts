/**
 * Narration for the educational Short "Why Do Earthquakes Happen?" with ElevenLabs, one clip per script line.
 *
 * Usage: tsx scripts/generate-edu-narration.ts [--generate] [--force]
 * Without --generate it is a dry run: it prints the script, the character count (credits are billed per character),
 * the voice and model, and which clips are already cached; it makes no request.
 * With --generate it requests only the clips that are not cached, stops at the first failure, and never regenerates a
 * cached clip unless --force. Clips are cached in assets/audio/edu/why-earthquakes/ (git-ignored, like all licensed
 * audio), so renders and re-runs reuse them at no cost. Whenever every clip exists it writes out/edu/audio.json
 * (the EduAudio props: placement, captions, music) for scripts/render-edu.ts.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignmentToCaptions } from '../src/audio/captions.js';
import { generateSpeech, loadTtsConfig, parseEnvFile, speechFromAudio } from '../src/audio/tts.js';
import { MAX_CLIP_SECONDS, SCRIPT, eduAudioSchema, placeClips, scriptCharacters } from '../src/edu/narration.js';
import type { ClipInput } from '../src/edu/narration.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const cacheDir = join( root, 'assets', 'audio', 'edu', 'why-earthquakes' );
const MUSIC_FILE = 'audio/legendary-kulakovka.mp3';
const MUSIC_CREDIT = '"Legendary" by Kulakovka, Pixabay Content License. Source: https://pixabay.com/music/orchestral-legendary-608531/';

/** Average level (dB) of the voiced part of a clip, measured on a decoded copy (Remotion's bundled ffmpeg). */
function voicedRmsDb( mp3: string ): number {
  const tmp = join( root, 'out', 'edu', 'level.wav' );
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
/** Separately generated lines differ a little in level; each is nudged toward the median level (limited so no line is distorted). */
const gainFor = ( db: number, target: number ) => Math.round( Math.min( 1.4, Math.max( 0.7, 10 ** ( ( target - db ) / 20 ) ) ) * 100 ) / 100;

const mp3Path = ( id: string ) => join( cacheDir, `${id}.mp3` );
const alignmentPath = ( id: string ) => join( cacheDir, `${id}.alignment.json` );
const cached = ( id: string ) => existsSync( mp3Path( id ) ) && existsSync( alignmentPath( id ) );

try {
  const envFile = join( root, '.env.local' );
  const config = loadTtsConfig( { ...( existsSync( envFile ) ? parseEnvFile( readFileSync( envFile, 'utf8' ) ) : {} ), ...process.env } );
  console.log( `voice ${config.voiceId}, model ${config.modelId}, ${SCRIPT.length} lines, ${scriptCharacters()} characters` );
  for ( const line of SCRIPT ) {
    console.log( `  ${cached( line.id ) ? 'cached ' : 'missing'} ${line.id.padEnd( 12 )} @${line.start.toFixed( 1 )}s  ${line.text}` );
  }
  const todo = SCRIPT.filter( line => args.includes( '--force' ) || !cached( line.id ) );
  const chars = todo.reduce( ( n, line ) => n + line.text.length, 0 );
  console.log( `${todo.length} clips to request, ${chars} characters` );
  if ( !args.includes( '--generate' ) ) {
    console.log( 'dry run: no request made (add --generate to call ElevenLabs and use credits)' );
    process.exit( 0 );
  }

  mkdirSync( cacheDir, { recursive: true } );
  for ( const line of todo ) {
    const speech = await generateSpeech( line.text, config, fetch, MAX_CLIP_SECONDS );
    writeFileSync( mp3Path( line.id ), speech.mp3 );
    writeFileSync( alignmentPath( line.id ), `${JSON.stringify( speech.alignment )}\n` );
    console.log( `  generated ${line.id}: ${speech.durationSeconds.toFixed( 2 )} s` );
  }

  const levels = SCRIPT.map( line => voicedRmsDb( mp3Path( line.id ) ) );
  const target = [ ...levels ].sort( ( a, b ) => a - b )[Math.floor( levels.length / 2 )];
  const clips: ClipInput[] = SCRIPT.map( ( line, i ) => {
    const speech = speechFromAudio( line.text, readFileSync( mp3Path( line.id ) ), JSON.parse( readFileSync( alignmentPath( line.id ), 'utf8' ) ), MAX_CLIP_SECONDS );
    return { id: line.id, file: `audio/edu/${line.id}.mp3`, duration: speech.durationSeconds, captions: alignmentToCaptions( speech.alignment ), gain: gainFor( levels[i], target ) };
  } );
  const audio = eduAudioSchema.parse( { ...placeClips( SCRIPT, clips ), musicFile: MUSIC_FILE, musicCredit: MUSIC_CREDIT } );
  mkdirSync( join( root, 'out', 'edu' ), { recursive: true } );
  writeFileSync( join( root, 'out', 'edu', 'audio.json' ), `${JSON.stringify( audio, null, 2 )}\n` );
  console.log( `narration ${audio.narrationStart}-${audio.narrationEnd} s, ${audio.captions.length} captions\nwrote out/edu/audio.json` );
} catch ( error ) {
  console.error( `narration failed: ${error instanceof Error ? error.message : String( error )}` );
  process.exit( 1 );
}
