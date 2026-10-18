/**
 * Generates the narration audio package for an M2.4a video package with ElevenLabs. Does not render.
 *
 * Usage: tsx scripts/generate-narration.ts <package.json> [--generate] [--out=<dir>]
 * --promote-rejected re-checks audio kept as narration.rejected.mp3 (a paid request that failed the length check) against
 * the current limits and, if it now fits, writes the outputs below. It makes no request.
 * Without --generate it is a dry run: it validates the package and configuration and prints the voice ID, model and
 * character count (credits are billed per character), and makes no request.
 *
 * Config (environment or video/.env.local): ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID.
 * Writes, under out/audio/<eventId>/ (git-ignored): narration.mp3, alignment.json, captions.json, soundtrack.json.
 * soundtrack.json matches the M2.3 Soundtrack schema (music: the Legendary track already in assets/audio).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { panamaSoundtrack } from '../src/audio/panama.js';
import { soundtrackSchema } from '../src/audio/soundtrack.js';
import { NARRATION_START_SECONDS, NarrationTooLongError, generateSpeech, loadTtsConfig, parseEnvFile, speechFromAudio } from '../src/audio/tts.js';
import { specFromPackage } from '../src/spec/package.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const file = args.find( arg => !arg.startsWith( '--' ) );
if ( !file ) {
  console.error( 'usage: tsx scripts/generate-narration.ts <package.json> [--generate | --promote-rejected] [--out=<dir>]' );
  process.exit( 2 );
}

try {
  const { pkg } = specFromPackage( JSON.parse( readFileSync( file, 'utf8' ) ) );
  const envFile = join( root, '.env.local' );
  const config = loadTtsConfig( { ...( existsSync( envFile ) ? parseEnvFile( readFileSync( envFile, 'utf8' ) ) : {} ), ...process.env } );
  console.log( `event ${pkg.event.id}: voice ${config.voiceId}, model ${config.modelId}, ${pkg.narration.length} characters` );
  if ( !args.includes( '--generate' ) && !args.includes( '--promote-rejected' ) ) {
    console.log( 'dry run: no request made (add --generate to call ElevenLabs and use credits)' );
    process.exit( 0 );
  }

  const outArg = args.find( arg => arg.startsWith( '--out=' ) )?.slice( '--out='.length );
  const out = outArg ? resolve( outArg ) : join( root, 'out', 'audio', pkg.event.id );
  mkdirSync( out, { recursive: true } );
  let speech;
  try {
    if ( args.includes( '--promote-rejected' ) ) {
      speech = speechFromAudio(
        pkg.narration,
        readFileSync( join( out, 'narration.rejected.mp3' ) ),
        JSON.parse( readFileSync( join( out, 'alignment.rejected.json' ), 'utf8' ) )
      );
    } else {
      speech = await generateSpeech( pkg.narration, config );
    }
  } catch ( error ) {
    if ( error instanceof NarrationTooLongError ) {
      // The request was paid for: keep the audio for review, but never as narration.mp3 (the render will not use it).
      writeFileSync( join( out, 'narration.rejected.mp3' ), error.speech.mp3 );
      writeFileSync( join( out, 'alignment.rejected.json' ), `${JSON.stringify( error.speech.alignment )}\n` );
      console.error( `kept the generated audio for review: ${join( out, 'narration.rejected.mp3' )}` );
    }
    throw error;
  }
  const soundtrack = soundtrackSchema.parse( {
    narrationFile: `audio/${pkg.event.id}-narration.mp3`,
    musicFile: panamaSoundtrack.musicFile,
    narrationStart: NARRATION_START_SECONDS,
    narrationDuration: Math.round( speech.durationSeconds * 1000 ) / 1000,
    captions: speech.captions,
    musicCredit: panamaSoundtrack.musicCredit
  } );
  writeFileSync( join( out, 'narration.mp3' ), speech.mp3 );
  writeFileSync( join( out, 'alignment.json' ), `${JSON.stringify( speech.alignment )}\n` );
  writeFileSync( join( out, 'captions.json' ), `${JSON.stringify( speech.captions, null, 2 )}\n` );
  writeFileSync( join( out, 'soundtrack.json' ), `${JSON.stringify( soundtrack, null, 2 )}\n` );
  console.log( `narration ${soundtrack.narrationDuration} s, ${speech.captions.length} captions\nwrote ${out}/{narration.mp3,alignment.json,captions.json,soundtrack.json}` );
} catch ( error ) {
  console.error( `narration failed: ${error instanceof Error ? error.message : String( error )}` );
  process.exit( 1 );
}
