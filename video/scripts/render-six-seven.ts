/**
 * EXPERIMENT: renders "SIX SEVEN: Earthquake Edition" to out/edu/final/six-seven.mp4. No narration, no network, no paid call:
 * music from the YouTube Audio Library and synthesized effects, staged into public/ for the render and removed afterwards.
 * Usage: tsx scripts/render-six-seven.ts [--still=<seconds>]   (--still renders one frame to out/edu/six-seven-still-<s>.png)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MUSIC } from '../src/audio/music.js';
import { EXTRA_SFX, SFX_FILES, boom, rumble, wavBytes } from '../src/edu/sfx.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const stillArg = process.argv.find( a => a.startsWith( '--still=' ) )?.split( '=' )[1];
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
  stage( MUSIC.reviver.file, readFileSync( join( root, 'assets', MUSIC.reviver.file ) ) );
  stage( SFX_FILES.rumble, wavBytes( rumble() ) );
  stage( SFX_FILES.boom, wavBytes( boom() ) );
  for ( const e of Object.values( EXTRA_SFX ) ) {
    stage( e.file, wavBytes( e.make() ) );
  }
  const outDir = join( root, 'out', 'edu' );
  mkdirSync( join( outDir, 'final' ), { recursive: true } );
  const args = stillArg
    ? [ 'remotion', 'still', 'SixSevenEarthquake', join( outDir, `six-seven-still-${ stillArg }.png` ), `--frame=${ Math.round( Number( stillArg ) * 30 ) }`, '--overwrite' ]
    : [ 'remotion', 'render', 'SixSevenEarthquake', join( outDir, 'final', 'six-seven.mp4' ), '--overwrite' ];
  const r = spawnSync( 'npx', args, { cwd: root, stdio: 'inherit' } );
  if ( r.status !== 0 ) {
    throw new Error( `render failed (exit ${ r.status })` );
  }
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
}
