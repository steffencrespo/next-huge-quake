/**
 * EXPERIMENT: renders "SIX SEVEN: Earthquake Edition" v2 to out/edu/final/six-seven-v2.mp4 from the cached narration
 * (scripts/six-seven-narration.ts generates it; this script makes no request). Each line is paced with fast-beats, the
 * declared pauses (notably the one before "Seventy!") are kept, and the clips are placed back to back.
 * Usage: tsx scripts/render-six-seven.ts [--audio-only | --still=<seconds> | --credits-only]
 *   --credits-only writes out/edu/final/six-seven-v2.credits.txt (the attribution the publisher appends to the description); no render.
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
/** Attribution for the public description (appended verbatim by the publisher). */
function writeCredits() {
  const file = join( root, 'out', 'edu', 'final', 'six-seven-v2.credits.txt' );
  mkdirSync( dirname( file ), { recursive: true } );
  writeFileSync( file, [
    `Music: ${ MUSIC.reviver.credit }`,
    'Narration: ElevenLabs text-to-speech (voice: Daniel).',
    'Sound effects: synthesized for this video. The "six seven" meme is referenced in text and gesture only; no meme audio or third-party footage is used.',
    'Source: USGS, "The magnitude 6.7 Northridge, California, earthquake of 17 January 1994" (the earthquake raised the Santa Susana mountains by as much as 70 centimeters). https://pubs.usgs.gov/publication/70017610',
    'Source: USGS Open-File Report 96-263, studying the setting and consequences of the Northridge earthquake (a rupture on a hidden fault, about 17.5 kilometers deep). https://pubs.usgs.gov/of/1996/ofr-96-0263/mainshk.htm',
    'Source: USGS event page, M 6.7 - Northridge, California earthquake. https://earthquake.usgs.gov/earthquakes/eventpage/ci3144585',
    'The side view of the fault and mountain is a schematic illustration, not to scale, with the rise exaggerated; it is not data or footage. The SIX SEVEN opening is a meme about a number and does not depict a real event.',
    '',
    'Production Technology',
    'Automated news and video production powered by Output.ai',
    'https://output.ai',
    ''
  ].join( '\n' ) );
  console.log( `wrote ${ file }` );
}
if ( process.argv.includes( '--credits-only' ) ) {
  writeCredits();
  process.exit( 0 );
}

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
  if ( !stillArg ) {
    writeCredits();
  }
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
}
