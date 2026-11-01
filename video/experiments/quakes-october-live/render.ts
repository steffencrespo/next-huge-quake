/** tsx experiments/quakes-october-live/render.ts [--still=<seconds>] : stages cached audio into public/, renders locally, cleans up. No network, no paid call, no upload. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { eduAudioSchema } from '../../src/edu/narration.js';
import { EXTRA_SFX, SFX_FILES, boom, rumble, wavBytes } from '../../src/edu/sfx.js';

const here = dirname( new URL( import.meta.url ).pathname );
const root = join( here, '..', '..' );
const audio = eduAudioSchema.parse( JSON.parse( readFileSync( join( here, 'audio.json' ), 'utf8' ) ) );
const still = process.argv.find( a => a.startsWith( '--still=' ) )?.slice( 8 );
const out = join( here, 'out' );
mkdirSync( out, { recursive: true } );
const staged: string[] = [];
const stage = ( rel: string, bytes: Buffer ) => {
  const target = join( root, 'public', rel );
  if ( existsSync( target ) ) return;
  mkdirSync( dirname( target ), { recursive: true } );
  writeFileSync( target, bytes );
  staged.push( target );
};
try {
  for ( const c of audio.clips ) stage( c.file, readFileSync( join( root, 'assets', 'audio', 'edu', 'library', c.file.split( '/' ).pop()! ) ) );
  stage( SFX_FILES.rumble, wavBytes( rumble() ) );
  stage( SFX_FILES.boom, wavBytes( boom() ) );
  for ( const e of Object.values( EXTRA_SFX ) ) stage( e.file, wavBytes( e.make() ) );
  const props = join( out, 'props.json' );
  writeFileSync( props, JSON.stringify( { audio } ) );
  const target = still ? [ 'still', join( out, `still-${still}.png` ), `--frame=${Math.round( Number( still ) * 30 )}` ] : [ 'render', join( out, 'earthquakes-october-2026-m5-live-loop.mp4' ), '--overwrite' ];
  const args = [ 'remotion', target[0], join( here, 'index.ts' ), 'QuakesOctober', ...target.slice( 1 ), '--gl=angle', `--props=${props}` ];
  if ( !still ) args.push( '--public-dir=' + join( root, 'public' ) );
  const r = spawnSync( 'npx', args, { cwd: root, stdio: 'inherit' } );
  if ( r.status !== 0 ) throw new Error( `render failed (${r.status})` );
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
}
