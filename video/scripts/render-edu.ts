/**
 * Renders the educational Short with its narration, music and effects: tsx scripts/render-edu.ts [--out=<file.mp4>]
 *
 * Needs out/edu/audio.json (from generate-edu-narration.ts), the cached narration clips in
 * assets/audio/edu/why-earthquakes/ and the music in assets/audio/. Synthesizes the sound effects, stages every audio
 * file under public/audio/ (existing files are kept, never overwritten with different content), renders, removes only
 * what it staged and writes <out>.credits.txt next to the MP4. Calls no paid service.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join, resolve } from 'node:path';
import { eduAudioSchema } from '../src/edu/narration.js';
import { SFX_FILES, boom, rumble, wavBytes } from '../src/edu/sfx.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const outArg = process.argv.find( a => a.startsWith( '--out=' ) )?.slice( 6 );
const out = resolve( outArg ?? join( root, 'out', 'edu', 'why-earthquakes-v2.mp4' ) );

const audioFile = join( root, 'out', 'edu', 'audio.json' );
if ( !existsSync( audioFile ) ) {
  console.error( 'out/edu/audio.json is missing: run scripts/generate-edu-narration.ts first' );
  process.exit( 1 );
}
const audio = eduAudioSchema.parse( JSON.parse( readFileSync( audioFile, 'utf8' ) ) );

const files: { staged: string; bytes: Buffer }[] = [
  ...audio.clips.map( c => ( { staged: c.file, bytes: readFileSync( join( root, 'assets', 'audio', 'edu', 'why-earthquakes', `${c.id}.mp3` ) ) } ) ),
  { staged: audio.musicFile, bytes: readFileSync( join( root, 'assets', audio.musicFile ) ) },
  { staged: SFX_FILES.rumble, bytes: wavBytes( rumble() ) },
  { staged: SFX_FILES.boom, bytes: wavBytes( boom() ) }
];

const created: string[] = [];
const cleanup = () => created.forEach( f => rmSync( f, { force: true } ) );
try {
  for ( const { staged, bytes } of files ) {
    const target = join( root, 'public', staged );
    if ( existsSync( target ) ) {
      if ( !readFileSync( target ).equals( bytes ) ) {
        throw new Error( `${target} exists with different content; remove it and retry` );
      }
      continue;
    }
    mkdirSync( dirname( target ), { recursive: true } );
    writeFileSync( target, bytes );
    created.push( target );
  }
  mkdirSync( dirname( out ), { recursive: true } );
  const props = join( dirname( out ), `${basename( out, '.mp4' )}.props.json` );
  writeFileSync( props, JSON.stringify( { audio } ) );
  const result = spawnSync( 'npx', [ 'remotion', 'render', 'WhyEarthquakes', out, `--props=${props}`, '--overwrite' ], { cwd: root, stdio: 'inherit' } );
  if ( result.status !== 0 ) {
    throw new Error( `render failed (exit ${result.status})` );
  }
  writeFileSync( out.replace( /\.mp4$/, '.credits.txt' ), [
    'Music: ' + audio.musicCredit,
    'Narration: ElevenLabs text-to-speech.',
    'Sound effects: synthesized for this video.',
    ''
  ].join( '\n' ) );
  console.log( `wrote ${out}` );
} catch ( error ) {
  console.error( error instanceof Error ? error.message : String( error ) );
  process.exitCode = 1;
} finally {
  cleanup();
}
