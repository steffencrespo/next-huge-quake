/**
 * tsx experiments/vanuatu-m60-us7000ttlm/render.ts [--still=<seconds>] [--out=<name>]
 * Local only: no network, no paid call, nothing uploaded or published. Stages the approved image (and, when audio.json exists, the cached paced
 * narration, music and synthesized sfx) into public/, renders, then removes what it staged. Without audio.json only stills are possible: they use
 * the storyboard timing in script.ts instead of real clip timing.
 */
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { eduAudioSchema } from '../../src/edu/narration.js';
import { EXTRA_SFX, SFX_FILES, boom, rumble, wavBytes } from '../../src/edu/sfx.js';
import { IMAGE_FILE } from './script.js';

const here = dirname( new URL( import.meta.url ).pathname );
const root = join( here, '..', '..' );
const flag = ( name: string ) => process.argv.find( a => a.startsWith( `--${name}=` ) )?.split( '=' )[1];
const still = flag( 'still' );
const name = flag( 'out' ) ?? 'vanuatu-m60-us7000ttlm-v1';
const audioJson = join( here, 'audio.json' );
const audio = existsSync( audioJson ) ? eduAudioSchema.parse( JSON.parse( readFileSync( audioJson, 'utf8' ) ) ) : undefined;
if ( !audio && !still ) throw new Error( 'no audio.json: only --still renders are possible until the narration is generated and built' );
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
  stage( IMAGE_FILE, readFileSync( join( here, 'vanuatu-coast-ai.png' ) ) );
  if ( audio ) {
    const library = join( root, 'assets', 'audio', 'edu', 'library' ), paced = join( root, 'out', 'edu', 'paced', audio.pacing ?? '' );
    for ( const c of audio.clips ) {
      const file = c.file.split( '/' ).pop()!;
      stage( c.file, readFileSync( audio.pacing && file.endsWith( `-${audio.pacing}.mp3` ) ? join( paced, file ) : join( library, file ) ) );
    }
    stage( audio.musicFile, readFileSync( join( root, 'assets', audio.musicFile ) ) );
    stage( SFX_FILES.rumble, wavBytes( rumble() ) );
    stage( SFX_FILES.boom, wavBytes( boom() ) );
    for ( const e of Object.values( EXTRA_SFX ) ) stage( e.file, wavBytes( e.make() ) );
  }
  const props = join( out, 'props.json' );
  writeFileSync( props, JSON.stringify( audio ? { audio } : {} ) );
  const target = still ? [ 'still', join( out, `still-${still}.png` ), `--frame=${Math.round( Number( still ) * 30 )}` ] : [ 'render', join( out, `${name}.mp4` ) ];
  const args = [ 'remotion', target[0], join( here, 'index.ts' ), 'VanuatuSequence', ...target.slice( 1 ), '--gl=angle', `--props=${props}`, '--public-dir=' + join( root, 'public' ) ];
  // --log=verbose makes the browser console reach the log: scripts/verify-render.ts reads the MAPDIAG lines from out/<name>.log (it was missing from the first renders)
  const log = still ? undefined : openSync( join( out, `${name}.log` ), 'w' );
  const r = spawnSync( 'npx', still ? args : [ ...args, '--log=verbose' ], { cwd: root, stdio: log === undefined ? 'inherit' : [ 'ignore', log, log ] } );
  if ( log !== undefined ) closeSync( log );
  if ( r.status !== 0 ) throw new Error( `render failed (${r.status})` );
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
}
