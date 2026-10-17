/**
 * Helpers for render scripts: run a Remotion CLI command while sampling the peak memory of its whole process tree
 * (Node CLI + Chrome tabs + compositor), and extract exact frames from an MP4 as PNG stills.
 */
import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';


function treeRssKb( rootPid: number ): number {
  const rows = execFileSync( 'ps', [ '-A', '-o', 'pid=,ppid=,rss=' ], { encoding: 'utf8' } )
    .trim().split( '\n' ).map( line => line.trim().split( /\s+/ ).map( Number ) );
  const children = new Map<number, number[]>();
  const rss = new Map<number, number>();
  for ( const [ pid, ppid, kb ] of rows ) {
    rss.set( pid, kb );
    children.set( ppid, [ ...( children.get( ppid ) ?? [] ), pid ] );
  }
  let total = 0;
  const stack = [ rootPid ];
  while ( stack.length > 0 ) {
    const pid = stack.pop()!;
    total += rss.get( pid ) ?? 0;
    stack.push( ...( children.get( pid ) ?? [] ) );
  }
  return total;
}

/**
 * Runs `<command> <args>` (default `npx`) in `cwd`, logging stdout/stderr to `logFile`. Returns exit code, wall time
 * and peak tree RSS.
 */
export async function runMeasured( args: string[], cwd: string, logFile: string, command = 'npx' ) {
  const log = createWriteStream( logFile );
  const started = Date.now();
  const child = spawn( command, args, { cwd } );
  child.stdout.pipe( log );
  child.stderr.pipe( log );
  let peakKb = 0;
  const sampler = setInterval( () => {
    try {
      peakKb = Math.max( peakKb, treeRssKb( child.pid! ) );
    } catch {
      // process tree changed mid-sample
    }
  }, 1000 );
  const exitCode: number = await new Promise( resolve => child.on( 'close', code => resolve( code ?? 1 ) ) );
  clearInterval( sampler );
  return { exitCode, wallMs: Date.now() - started, peakTreeRssMb: Math.round( peakKb / 1024 ) };
}

/**
 * Saves frame `frame` of `mp4` as a full-size PNG and a phone-size (360x640) PNG.
 * Output seeking (after -i) keeps the first frame at or after the seek time; seeking half a frame early selects
 * frame n exactly, including the last one. (Remotion's bundled ffmpeg has no select filter.)
 */
export function saveFrame( cwd: string, mp4: string, frame: number, fps: number, fullPath: string, phonePath: string ) {
  const seek = Math.max( 0, ( frame - 0.5 ) / fps ).toFixed( 4 );
  const ffmpeg = ( extra: string[], target: string ) =>
    execFileSync( 'npx', [ 'remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', mp4, '-ss', seek, ...extra, '-frames:v', '1', target ], { cwd } );
  ffmpeg( [], fullPath );
  ffmpeg( [ '-vf', 'scale=360:640:flags=lanczos' ], phonePath );
}

export const pad3 = ( n: number ) => String( n ).padStart( 3, '0' );

