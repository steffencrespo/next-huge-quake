/**
 * Renders the Gate B DesignBoard stills: full size (1080x1920) into out/design/ and phone size (360x640, one third)
 * into out/design/phone/, using Remotion's bundled ffmpeg for the downscale.
 *
 * Usage: tsx scripts/render-design.ts [name ...]   (no names = all boards)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

type Job = { name: string; board: string; fixture: string; card?: number; live?: boolean };

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const out = join( root, 'out', 'design' );
const phone = join( out, 'phone' );
mkdirSync( phone, { recursive: true } );

/** Frame of DesignBoardLive (the spike's 10 s camera) at the regional hold. Matches LIVE_FRAME in DesignBoard.tsx. */
const LIVE_FRAME = 270;

const JOBS: Job[] = [
  { name: '01-hook-noto', board: 'hook', fixture: 'noto' },
  { name: '02-facts-noto', board: 'facts', fixture: 'noto' },
  { name: '03-facts-live-noto', board: 'facts-live', fixture: 'noto', live: true },
  { name: '04-context-depth-noto', board: 'context', fixture: 'noto', card: 0 },
  { name: '05-context-pager-noto', board: 'context', fixture: 'noto', card: 1 },
  { name: '06-context-felt-noto', board: 'context', fixture: 'noto', card: 2 },
  { name: '07-closing-noto', board: 'closing', fixture: 'noto' },
  { name: '08-hook-kamchatka', board: 'hook', fixture: 'kamchatka' },
  { name: '09-facts-live-kamchatka', board: 'facts-live', fixture: 'kamchatka', live: true },
  { name: '10-facts-preliminary-test', board: 'facts', fixture: 'preliminaryTest' },
  { name: '11-context-preliminary-test', board: 'context', fixture: 'preliminaryTest', card: 0 },
  { name: '12-closing-preliminary-test', board: 'closing', fixture: 'preliminaryTest' }
];

const selected = process.argv.slice( 2 );
for ( const job of JOBS.filter( j => selected.length === 0 || selected.includes( j.name ) ) ) {
  const file = join( out, `${job.name}.png` );
  const props = JSON.stringify( { board: job.board, fixture: job.fixture, card: job.card ?? 0 } );
  const args = job.live ?
    [ 'remotion', 'still', 'DesignBoardLive', file, `--frame=${LIVE_FRAME}`, '--gl=angle', `--props=${props}`, '--overwrite' ] :
    [ 'remotion', 'still', 'DesignBoard', file, `--props=${props}`, '--overwrite' ];
  execFileSync( 'npx', args, { cwd: root, stdio: 'ignore' } );
  execFileSync( 'npx', [ 'remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', file, '-vf', 'scale=360:640:flags=lanczos', join( phone, `${job.name}.png` ) ], { cwd: root } );
  console.log( `rendered ${job.name}` );
}
