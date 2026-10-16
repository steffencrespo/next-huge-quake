/**
 * Renders the spike matrix and records wall time and peak memory of the whole render process tree
 * (Node CLI + Chrome tabs + compositor), sampled once per second with `ps`.
 *
 * Usage: tsx scripts/render-matrix.ts [render-name ...]   (no names = full matrix)
 * Output per render: out/<name>.mp4, out/<name>.log (verbose log incl. MAPDIAG lines), out/<name>.metrics.json
 */
import { execFileSync, spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

type Job = { name: string; event: 'noto' | 'kamchatka'; tiles: 'local' | 'remote'; gl: 'angle' | 'swangle' };

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const out = join( root, 'out' );

const JOBS: Job[] = [];
for ( const event of [ 'noto', 'kamchatka' ] as const ) {
  for ( const tiles of [ 'local', 'remote' ] as const ) {
    for ( const gl of [ 'angle', 'swangle' ] as const ) {
      JOBS.push( { name: `${event}-${tiles}-${gl}-1`, event, tiles, gl } );
    }
  }
  JOBS.push( { name: `${event}-local-angle-2`, event, tiles: 'local', gl: 'angle' } );
  JOBS.push( { name: `${event}-local-swangle-2`, event, tiles: 'local', gl: 'swangle' } );
}

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

async function run( job: Job ) {
  const args = [
    'remotion', 'render', 'MapSpike', join( out, `${job.name}.mp4` ),
    `--gl=${job.gl}`, `--props=${JSON.stringify( { event: job.event, tiles: job.tiles } )}`, '--log=verbose', '--overwrite'
  ];
  const log = createWriteStream( join( out, `${job.name}.log` ) );
  const started = Date.now();
  const child = spawn( 'npx', args, { cwd: root, detached: true } );
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
  const wallMs = Date.now() - started;
  const metrics = { ...job, exitCode, wallMs, peakTreeRssMb: Math.round( peakKb / 1024 ), concurrency: 4 };
  writeFileSync( join( out, `${job.name}.metrics.json` ), JSON.stringify( metrics, null, 2 ) );
  console.log( JSON.stringify( metrics ) );
}

const selected = process.argv.slice( 2 );
const unknown = selected.filter( name => !JOBS.some( j => j.name === name ) );
if ( unknown.length > 0 ) {
  throw new Error( `Unknown render(s): ${unknown.join( ', ' )}` );
}
for ( const job of JOBS.filter( j => selected.length === 0 || selected.includes( j.name ) ) ) {
  await run( job );
}
