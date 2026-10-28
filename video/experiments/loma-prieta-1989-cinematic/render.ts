/**
 * Renders the Loma Prieta 1989 cinematic experiment to experiments/loma-prieta-1989-cinematic/out/. Local only: no network, no paid API,
 * nothing published, publish/ untouched. Narration is the cached Daniel narration in fast-beats pacing, music is Deified.
 *
 * Usage: tsx experiments/loma-prieta-1989-cinematic/render.ts [--out=<name>] [--still=<frame>] [--audio=<audio.json>]
 *   --still renders one PNG (no audio staged); --audio overrides out/edu/lomaprieta1989/audio-deified-fast-beats.json (used for timing previews).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { eduAudioSchema } from '../../src/edu/narration.js';
import { EXTRA_SFX, SFX_FILES, boom, rumble, wavBytes } from '../../src/edu/sfx.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..', '..' );
const here = join( root, 'experiments', 'loma-prieta-1989-cinematic' );
const flag = ( name: string ) => process.argv.find( a => a.startsWith( `--${ name }=` ) )?.split( '=' )[1];
const name = flag( 'out' ) ?? 'loma-prieta-1989-cinematic-v1';
const still = flag( 'still' );

// Source files are the narration lines they illustrate (punctuation removed by the file system where needed); all ten must exist.
const IMAGES: Record<string, string> = {
  'hook.png': 'For decades, San Francisco fought its freeways. Then, the ground shook.png',
  'revolt.png': 'Neighborhoods pushed back. In nineteen fifty-nine, supervisors voted to cancel most of them.png',
  'emb.png': 'But one had already risen along the waterfront the double-decker Embarcadero Freeway.png',
  'date.png': 'Then, October seventeenth, nineteen eighty-nine, four minutes past five in the afternoon.png',
  'cyp.png': "The Cypress Viaduct's upper deck fell onto the traffic below.png",
  'sf.png': "Across the bay, San Francisco's Embarcadero Freeway was badly damaged, but it did not fall.png",
  'debate.png': 'Chinatown merchants feared losing customers. The debate lasted months.png',
  'demo.png': 'In February nineteen ninety-one, demolition began.png',
  'after.png': 'The Ferry Building returned to view. A palm-lined boulevard and streetcars replaced the concrete.png',
  'end.png': 'San Francisco spent decades fighting its freeways. Then nature forced the question.png'
};
const assets = join( here, 'assets' );
const audioJson = flag( 'audio' ) ?? join( root, 'out', 'edu', 'lomaprieta1989', 'audio-deified-fast-beats.json' );
const missing = [ audioJson, ...Object.values( IMAGES ).map( f => join( assets, f ) ) ].filter( f => !existsSync( f ) );
if ( missing.length > 0 ) {
  console.error( `missing files (not substituting):\n${ missing.join( '\n' ) }\nfound in assets: ${ readdirSync( assets ).join( ' | ' ) }` );
  process.exit( 1 );
}
const audio = eduAudioSchema.parse( JSON.parse( readFileSync( audioJson, 'utf8' ) ) );
const library = join( root, 'assets', 'audio', 'edu', 'library' );
const paced = join( root, 'out', 'edu', 'paced', 'fast-beats' );

const staged: string[] = [];
const stage = ( rel: string, from: string | Buffer ) => {
  const target = join( root, 'public', rel );
  const bytes = typeof from === 'string' ? readFileSync( from ) : from;
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

const out = join( here, 'out', `${ name }.mp4` );
mkdirSync( dirname( out ), { recursive: true } );
try {
  if ( !still ) {
    for ( const c of audio.clips ) {
      const file = c.file.split( '/' ).pop()!;
      stage( c.file, join( file.endsWith( '-fast-beats.mp3' ) ? paced : library, file ) );
    }
    stage( audio.musicFile, join( root, 'assets', audio.musicFile ) );
    stage( SFX_FILES.rumble, wavBytes( rumble() ) );
    stage( SFX_FILES.boom, wavBytes( boom() ) );
    for ( const e of Object.values( EXTRA_SFX ) ) {
      stage( e.file, wavBytes( e.make() ) );
    }
  }
  for ( const [ target, src ] of Object.entries( IMAGES ) ) {
    stage( `exp-loma-prieta-cinematic/${ target }`, join( assets, src ) );
  }
  const propsFile = join( here, 'out', `${ name }.props.json` );
  writeFileSync( propsFile, JSON.stringify( { audio } ) );
  const args = still
    ? [ 'remotion', 'still', 'experiments/loma-prieta-1989-cinematic/entry.tsx', 'LomaPrietaCinematic', join( here, 'out', 'stills', `${ name }-${ still }.png` ), `--props=${ propsFile }`, `--frame=${ still }`, '--overwrite' ]
    : [ 'remotion', 'render', 'experiments/loma-prieta-1989-cinematic/entry.tsx', 'LomaPrietaCinematic', out, `--props=${ propsFile }`, '--overwrite' ];
  const result = spawnSync( 'npx', args, { cwd: root, stdio: 'inherit' } );
  if ( result.status !== 0 ) {
    throw new Error( `render failed (exit ${ result.status })` );
  }
  console.log( `wrote ${ still ? 'still' : out }` );
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
}
