/**
 * Renders one complete QuakeNews video from generated artifacts (M2.4a spec, M2.4b soundtrack). No manual copying.
 *
 * Usage: tsx scripts/render-package.ts <spec.json> <soundtrack.json> [--narration=<mp3>] [--out=<dir>] [--validate-only]
 *   spec.json        VideoSpec v1 (build-from-package)
 *   soundtrack.json  Soundtrack with timed captions (generate-narration); narration.mp3 is expected next to it
 *   --out            default out/videos/<eventId>/ (git-ignored): video.mp4, credits.txt, props.json, render.log, metrics.json
 *   --validate-only  check every input and exit without rendering
 * Prints one JSON line on success. Exit codes: 0 ok, 1 invalid input or failed render, 2 usage.
 */
import { dirname, join, resolve } from 'node:path';
import { renderPackage, resolveRenderInputs } from './lib/package-render.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const [ specFile, soundtrackFile ] = args.filter( arg => !arg.startsWith( '--' ) ).map( file => resolve( file ) );
const option = ( name: string ) => args.find( arg => arg.startsWith( `--${name}=` ) )?.slice( name.length + 3 );
if ( !specFile || !soundtrackFile ) {
  console.error( 'usage: tsx scripts/render-package.ts <spec.json> <soundtrack.json> [--narration=<mp3>] [--out=<dir>] [--validate-only]' );
  process.exit( 2 );
}

try {
  const options = { specFile, soundtrackFile, narrationFile: option( 'narration' ), outDir: option( 'out' ), root };
  if ( args.includes( '--validate-only' ) ) {
    const { spec } = resolveRenderInputs( options );
    console.log( JSON.stringify( { eventId: spec.event.id, valid: true } ) );
  } else {
    console.log( JSON.stringify( await renderPackage( options ) ) );
  }
} catch ( error ) {
  console.error( error instanceof Error ? error.message : String( error ) );
  process.exit( 1 );
}
