import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Directory of the video renderer package: VIDEO_DIR, or the sibling of quake-news-agent/ found from this file
 * (src/shared or dist/shared). The worker's working directory is not used: it is not the project directory.
 */
export const videoDir = (): string =>
  resolve( process.env.VIDEO_DIR ?? resolve( dirname( fileURLToPath( import.meta.url ) ), '../../../video' ) );

const TAIL = 1200;
const tail = ( text: string ) => text.trim().slice( -TAIL );

/**
 * Runs `npx tsx <script> ...args` in the video package without a shell. Resolves with stdout on exit 0 and rejects
 * with the tail of stderr (or stdout) otherwise. Asynchronous, so the worker keeps heartbeating the activity.
 */
export function runVideoScript( script: string, args: string[] ): Promise<string> {
  return new Promise( ( resolvePromise, reject ) => {
    const child = spawn( 'npx', [ 'tsx', script, ...args ], { cwd: videoDir() } );
    let stdout = '';
    let stderr = '';
    child.stdout.on( 'data', chunk => { stdout += chunk; } );
    child.stderr.on( 'data', chunk => { stderr += chunk; } );
    child.on( 'error', error => reject( new Error( `${script} could not start: ${error.message}` ) ) );
    child.on( 'close', code => code === 0 ?
      resolvePromise( stdout ) :
      reject( new Error( `${script} failed (exit ${code}): ${tail( stderr ) || tail( stdout )}` ) ) );
  } );
}
