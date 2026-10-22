/**
 * EXPERIMENT: renders "SIX SEVEN: Earthquake Edition" v2 to out/edu/final/six-seven-v2.mp4 from the cached narration
 * (scripts/six-seven-narration.ts generates it; this script makes no request). Each line is paced with fast-beats, the
 * declared pauses (notably the one before "Seventy!") are kept, and the clips are placed back to back.
 * Usage: tsx scripts/render-six-seven.ts [--audio-only | --still=<seconds>]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignmentToCaptions } from '../src/audio/captions.js';
import { MUSIC } from '../src/audio/music.js';
import { FAST_BEATS_PACING, clipGap } from '../src/audio/pacing.js';
import { OUTPUT_FORMAT, loadTtsConfig, parseEnvFile } from '../src/audio/tts.js';
import { openLibrary } from '../src/edu/library.js';
import { eduAudioSchema, placeClips } from '../src/edu/narration.js';
import type { ClipInput } from '../src/edu/narration.js';
import { EXTRA_SFX, SFX_FILES, boom, rumble, wavBytes } from '../src/edu/sfx.js';
import { SIX_SEVEN_SCRIPT } from '../src/edu/sixsevenScript.js';
import { paceNarration } from './lib/pace-audio.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const outDir = join( root, 'out', 'edu', 'six-seven' );
const stillArg = process.argv.find( a => a.startsWith( '--still=' ) )?.split( '=' )[1];
const envFile = join( root, '.env.local' );
const config = loadTtsConfig( { ...( existsSync( envFile ) ? parseEnvFile( readFileSync( envFile, 'utf8' ) ) : {} ), ...process.env } );
const library = openLibrary( join( root, 'assets', 'audio', 'edu', 'library' ) );

const clips: ClipInput[] = SIX_SEVEN_SCRIPT.map( line => {
  const p = library.paths( { text: line.text, voiceId: config.voiceId, modelId: config.modelId, outputFormat: OUTPUT_FORMAT } );
  if ( !existsSync( p.mp3 ) ) {
    throw new Error( `no cached clip for '${ line.id }': run scripts/six-seven-narration.ts --generate first (this script makes no request)` );
  }
  const captions = alignmentToCaptions( JSON.parse( readFileSync( p.alignment, 'utf8' ) ) );
  const paced = paceNarration( { root, source: p.mp3, captions, preset: FAST_BEATS_PACING, outMp3: join( outDir, 'paced', `sixseven-${ line.id }-fast-beats.mp3` ) } );
  return { id: line.id, file: `audio/edu/sixseven-${ line.id }-fast-beats.mp3`, duration: paced.duration, captions: paced.captions, gain: 1 };
} );
const script = SIX_SEVEN_SCRIPT.map( l => ( { id: l.id, text: l.text, start: 0, gap: l.gap } ) );
const audio = eduAudioSchema.parse( { ...placeClips( script, clips, { gap: clipGap( FAST_BEATS_PACING ), keepPauses: true } ), musicFile: MUSIC.reviver.file, musicCredit: MUSIC.reviver.credit, pacing: FAST_BEATS_PACING.name } );
mkdirSync( outDir, { recursive: true } );
writeFileSync( join( outDir, 'audio.json' ), `${ JSON.stringify( audio, null, 2 ) }\n` );
console.log( `narration ${ audio.narrationStart }-${ audio.narrationEnd } s` );
if ( process.argv.includes( '--audio-only' ) ) {
  process.exit( 0 );
}

const staged: string[] = [];
const stage = ( rel: string, bytes: Buffer ) => {
  const target = join( root, 'public', rel );
  if ( existsSync( target ) ) {
    if ( !readFileSync( target ).equals( bytes ) ) {
      throw new Error( `${ target } exists with different content; remove it and retry` );
    }
    return;
  }
  mkdirSync( dirname( target ), { recursive: true } );
  writeFileSync( target, bytes );
  staged.push( target );
};
try {
  for ( const c of audio.clips ) {
    stage( c.file, readFileSync( join( outDir, 'paced', c.file.split( '/' ).pop()! ) ) );
  }
  stage( audio.musicFile, readFileSync( join( root, 'assets', audio.musicFile ) ) );
  stage( SFX_FILES.rumble, wavBytes( rumble() ) );
  stage( SFX_FILES.boom, wavBytes( boom() ) );
  for ( const e of Object.values( EXTRA_SFX ) ) {
    stage( e.file, wavBytes( e.make() ) );
  }
  const finalDir = join( root, 'out', 'edu', 'final' );
  mkdirSync( finalDir, { recursive: true } );
  const propsFile = join( outDir, 'props.json' );
  writeFileSync( propsFile, JSON.stringify( { audio } ) );
  const args = stillArg
    ? [ 'remotion', 'still', 'SixSevenEarthquake', join( root, 'out', 'edu', `six-seven-v2-still-${ stillArg }.png` ), `--frame=${ Math.round( Number( stillArg ) * 30 ) }`, `--props=${ propsFile }`, '--overwrite' ]
    : [ 'remotion', 'render', 'SixSevenEarthquake', join( finalDir, 'six-seven-v2.mp4' ), `--props=${ propsFile }`, '--overwrite' ];
  const r = spawnSync( 'npx', args, { cwd: root, stdio: 'inherit' } );
  if ( r.status !== 0 ) {
    throw new Error( `render failed (exit ${ r.status })` );
  }
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
}
