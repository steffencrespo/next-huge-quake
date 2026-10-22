/**
 * EXPERIMENT: renders the California cold open + seamless loop candidate from cached narration only. No request.
 *
 * Usage: tsx scripts/render-california-loop.ts [--audio-only]
 * Takes the nine cached California clips from the narration library, cuts the "Fact two:" and "Fact one:" lead-ins at the
 * word boundary the character alignment gives, paces each clip with fast-beats, places them in the loop order and renders
 * MythCaliforniaLoop to out/edu/final/california-loop.mp4. The published episode, manifests and library are not touched.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignmentToCaptions } from '../src/audio/captions.js';
import type { Alignment } from '../src/audio/captions.js';
import { MUSIC } from '../src/audio/music.js';
import { FAST_BEATS_PACING, clipGap } from '../src/audio/pacing.js';
import { OUTPUT_FORMAT, loadTtsConfig, parseEnvFile } from '../src/audio/tts.js';
import { CALIFORNIA } from '../src/edu/ep06.js';
import { openLibrary } from '../src/edu/library.js';
import { eduAudioSchema, placeClips } from '../src/edu/narration.js';
import type { ClipInput } from '../src/edu/narration.js';
import { EXTRA_SFX, SFX_FILES, boom, rumble, wavBytes } from '../src/edu/sfx.js';
import { paceNarration } from './lib/pace-audio.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const outDir = join( root, 'out', 'edu', 'loop' );
const ffmpeg = ( args: string[] ) => {
  const r = spawnSync( 'npx', [ 'remotion', 'ffmpeg', '-hide_banner', '-loglevel', 'error', ...args ], { cwd: root, encoding: 'utf8' } );
  if ( r.status !== 0 ) {
    throw new Error( `ffmpeg failed: ${ r.stderr }` );
  }
};

const envFile = join( root, '.env.local' );
const config = loadTtsConfig( { ...( existsSync( envFile ) ? parseEnvFile( readFileSync( envFile, 'utf8' ) ) : {} ), ...process.env } );
const library = openLibrary( join( root, 'assets', 'audio', 'edu', 'library' ) );

/** Loop order, and where a lead-in is cut: the clip starts at the first word of `from` (the text after the lead-in). */
const ORDER: { id: string; from?: string }[] = [
  { id: 'fact2', from: 'Los' }, { id: 'punch' }, { id: 'hook' }, { id: 'fact', from: 'there’s' }, { id: 'plates' }, { id: 'slide' }, { id: 'rate' }, { id: 'how' }
];

/** Gain per clip as the published episode uses it (levels matched to the median); read from the natural-pacing audio plan. */
function gains(): Record<string, number> {
  const r = spawnSync( 'npx', [ 'tsx', 'scripts/edu-batch.ts', 'audio', '--series=myth', '--music=deified', '--pace=natural' ], { cwd: root, encoding: 'utf8' } );
  if ( r.status !== 0 ) {
    throw new Error( `edu-batch audio failed: ${ r.stderr || r.stdout }` );
  }
  const audio = JSON.parse( readFileSync( join( root, 'out', 'edu', 'california', 'audio-deified.json' ), 'utf8' ) );
  return Object.fromEntries( audio.clips.map( ( c: { id: string; gain: number } ) => [ c.id, c.gain ] ) );
}

function prepare( id: string, from?: string ): { file: string; duration: number; captions: ClipInput['captions'] } {
  const line = CALIFORNIA.script.find( l => l.id === id )!;
  const p = library.paths( { text: line.text, voiceId: config.voiceId, modelId: config.modelId, outputFormat: OUTPUT_FORMAT } );
  if ( !existsSync( p.mp3 ) ) {
    throw new Error( `no cached clip for '${ id }'; this experiment makes no request` );
  }
  let source = p.mp3;
  let alignment: Alignment = JSON.parse( readFileSync( p.alignment, 'utf8' ) );
  if ( from ) {
    const text = alignment.characters.join( '' );
    const index = text.indexOf( from );
    if ( index < 0 ) {
      throw new Error( `'${ from }' not found in '${ id }'` );
    }
    const cut = Math.max( 0, alignment.character_start_times_seconds[index] - 0.03 );
    source = join( outDir, `${ id }.cut.mp3` );
    mkdirSync( outDir, { recursive: true } );
    ffmpeg( [ '-y', '-ss', String( cut ), '-i', p.mp3, '-c:a', 'libmp3lame', '-q:a', '2', source ] );
    alignment = {
      characters: alignment.characters.slice( index ),
      character_start_times_seconds: alignment.character_start_times_seconds.slice( index ).map( x => Math.max( 0, x - cut ) ),
      character_end_times_seconds: alignment.character_end_times_seconds.slice( index ).map( x => Math.max( 0, x - cut ) )
    };
  }
  const paced = paceNarration( { root, source, captions: alignmentToCaptions( alignment ), preset: FAST_BEATS_PACING, outMp3: join( outDir, 'paced', `loop-${ id }-fast-beats.mp3` ) } );
  return { file: `audio/edu/loop-${ id }-fast-beats.mp3`, duration: paced.duration, captions: paced.captions };
}

const gain = gains();
const clips: ClipInput[] = ORDER.map( ( { id, from } ) => ( { id, ...prepare( id, from ), gain: gain[id] } ) );
const script = ORDER.map( ( { id } ) => ( { ...CALIFORNIA.script.find( l => l.id === id )!, start: 0 } ) );
const audio = eduAudioSchema.parse( { ...placeClips( script, clips, { gap: clipGap( FAST_BEATS_PACING ), keepPauses: true } ), musicFile: MUSIC.deified.file, musicCredit: MUSIC.deified.credit, pacing: FAST_BEATS_PACING.name } );
writeFileSync( join( outDir, 'audio.json' ), `${ JSON.stringify( audio, null, 2 ) }\n` );
console.log( `narration ${ audio.narrationStart }-${ audio.narrationEnd } s, ${ audio.captions.length } captions` );
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
  const out = join( root, 'out', 'edu', 'final', 'california-loop.mp4' );
  mkdirSync( dirname( out ), { recursive: true } );
  const propsFile = join( outDir, 'props.json' );
  writeFileSync( propsFile, JSON.stringify( { audio } ) );
  const r = spawnSync( 'npx', [ 'remotion', 'render', 'MythCaliforniaLoop', out, `--props=${ propsFile }`, '--overwrite' ], { cwd: root, stdio: 'inherit' } );
  if ( r.status !== 0 ) {
    throw new Error( `render failed (exit ${ r.status })` );
  }
  console.log( `wrote ${ out }` );
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
}
