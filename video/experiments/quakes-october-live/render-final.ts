/** tsx experiments/quakes-october-live/render-final.ts [--still=<seconds>[,<seconds>...]] [--silent] : stages cached audio into public/, renders the FINAL landscape loop locally, cleans up.
 * No network, no paid call, no upload. --silent renders stills from the planned timeline without audio.json. */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { eduAudioSchema } from '../../src/edu/narration.js';

const here = dirname( new URL( import.meta.url ).pathname );
const root = join( here, '..', '..' );
const silent = process.argv.includes( '--silent' );
const audio = silent ? undefined : eduAudioSchema.parse( JSON.parse( readFileSync( join( here, 'audio-final.json' ), 'utf8' ) ) );
const still = process.argv.find( a => a.startsWith( '--still=' ) )?.slice( 8 );
const out = join( here, 'out' );
mkdirSync( join( out, 'final-stills' ), { recursive: true } );
const staged: string[] = [];
const stage = ( rel: string, bytes: Buffer ) => {
  const target = join( root, 'public', rel );
  if ( existsSync( target ) ) return;
  mkdirSync( dirname( target ), { recursive: true } );
  writeFileSync( target, bytes );
  staged.push( target );
};
try {
  if ( audio ) {
    for ( const c of audio.clips ) stage( c.file, readFileSync( join( root, 'assets', 'audio', 'edu', 'library', c.file.split( '/' ).pop()! ) ) );
    if ( !existsSync( join( root, 'public', audio.musicFile ) ) ) stage( audio.musicFile, readFileSync( join( root, 'assets', audio.musicFile ) ) );
  }
  const props = join( out, 'props-final.json' );
  writeFileSync( props, JSON.stringify( audio ? { audio } : {} ) );
  const jobs = still ? still.split( ',' ).map( s => [ 'still', join( out, 'final-stills', `still-${s}.png` ), `--frame=${Math.round( Number( s ) * 30 )}` ] ) : [ [ 'render', join( out, silent ? 'preview-silent.mp4' : 'earthquakes-october-2026-live-final.mp4' ), '--overwrite', '--codec=h264', '--audio-codec=aac', '--crf=18', '--pixel-format=yuv420p' ] ];
  for ( const target of jobs ) {
    const args = [ 'remotion', target[0], join( here, 'index.ts' ), 'QuakesOctoberFinal', ...target.slice( 1 ), '--gl=angle', `--props=${props}`, '--public-dir=' + join( root, 'public' ) ];
    const r = spawnSync( 'npx', args, { cwd: root, stdio: 'inherit' } );
    if ( r.status !== 0 ) throw new Error( `render failed (${r.status})` );
  }
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
}
