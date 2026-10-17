/**
 * Shared helpers for the terrain review renders (M2.2a, M2.2b): optional network sandbox, bundling, and direct map
 * stills rendered as one-frame PNG sequences (same pixels as `remotion still`, but the verbose log keeps the MAPDIAG
 * and TILEREQ lines, so still renders are covered by scripts/check-terrain-coverage.ts too).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Outbound network denied except localhost (the Remotion server). */
export const SANDBOX_PROFILE = '(version 1)(allow default)(deny network-outbound)(allow network-outbound (remote ip "localhost:*"))';

/** npx argv, optionally wrapped in sandbox-exec. */
export const npxCommand = ( argv: string[], sandboxed: boolean ): [ string, string[] ] =>
  sandboxed ? [ 'sandbox-exec', [ '-p', SANDBOX_PROFILE, 'npx', ...argv ] ] : [ 'npx', argv ];

export function ffmpeg( cwd: string, input: string, filter: string, output: string ) {
  execFileSync( 'npx', [ 'remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', input, '-vf', filter, output ], { cwd } );
}

export function bundle( cwd: string, bundleDir: string, sandboxed: boolean ) {
  const [ cmd, argv ] = npxCommand( [ 'remotion', 'bundle', `--out-dir=${bundleDir}` ], sandboxed );
  execFileSync( cmd, argv, { cwd, stdio: 'inherit' } );
}

export type StillDirs = { out: string; stills: string; phone: string; coast: string; logs: string };

export function stillDirs( out: string ): StillDirs {
  const stills = join( out, 'stills' );
  const dirs = { out, stills, phone: join( stills, 'phone' ), coast: join( stills, 'coast' ), logs: join( stills, 'logs' ) };
  for ( const dir of Object.values( dirs ) ) {
    mkdirSync( dir, { recursive: true } );
  }
  return dirs;
}

/**
 * Renders frame `frame` of TerrainSpike with `props` to `<stills>/<file>`, plus a phone-size copy and, at the end
 * state (frame 900), a 2x close-up of the coast around the epicenter (the marker sits near x=540, y=665).
 */
export function renderMapStill( cwd: string, bundleDir: string, dirs: StillDirs, sandboxed: boolean, file: string, frame: number, props: Record<string, unknown> ) {
  const sequenceDir = join( dirs.out, 'sequence' );
  const [ c, a ] = npxCommand( [ 'remotion', 'render', bundleDir, 'TerrainSpike', sequenceDir, '--sequence', '--image-format=png', `--frames=${frame}-${frame}`, '--gl=angle', `--props=${JSON.stringify( props )}`, '--log=verbose', '--overwrite' ], sandboxed );
  const run = spawnSync( c, a, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 } );
  writeFileSync( join( dirs.logs, file.replace( /\.png$/, '.log' ) ), run.stdout + run.stderr );
  if ( run.status !== 0 ) {
    throw new Error( `still ${file} failed; see ${dirs.logs}` );
  }
  renameSync( join( sequenceDir, `element-${frame}.png` ), join( dirs.stills, file ) );
  ffmpeg( cwd, join( dirs.stills, file ), 'scale=360:640:flags=lanczos', join( dirs.phone, file ) );
  if ( frame === 900 ) {
    ffmpeg( cwd, join( dirs.stills, file ), 'crop=540:540:270:395,scale=1080:1080:flags=lanczos', join( dirs.coast, file ) );
  }
  console.log( `still ${file}` );
}
