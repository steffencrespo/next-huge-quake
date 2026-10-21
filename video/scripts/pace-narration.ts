/**
 * Applies a pacing preset to the narration of a news video (generate-narration output). No request, no render.
 *
 * Usage: tsx scripts/pace-narration.ts <soundtrack.json> [--narration=<mp3>] [--pace=fast] [--out=<dir>]
 *   soundtrack.json  Soundtrack with timed captions; narration.mp3 is expected next to it
 *   --out            default: next to soundtrack.json
 * Writes narration.<pace>.mp3 and soundtrack.<pace>.json (new narrationDuration, captions re-timed). Render it with:
 *   tsx scripts/render-package.ts <spec.json> <out>/soundtrack.<pace>.json --narration=<out>/narration.<pace>.mp3
 * The scene frames of the spec are not changed, so the video keeps its length and the narration ends earlier.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pacingPreset } from '../src/audio/pacing.js';
import { soundtrackSchema } from '../src/audio/soundtrack.js';
import { paceNarration } from './lib/pace-audio.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const option = ( name: string ) => args.find( arg => arg.startsWith( `--${name}=` ) )?.slice( name.length + 3 );
const file = args.find( arg => !arg.startsWith( '--' ) );
if ( !file ) {
  console.error( 'usage: tsx scripts/pace-narration.ts <soundtrack.json> [--narration=<mp3>] [--pace=fast] [--out=<dir>]' );
  process.exit( 2 );
}

try {
  const preset = pacingPreset( option( 'pace' ) ?? 'fast' );
  const soundtrackFile = resolve( file );
  const soundtrack = soundtrackSchema.parse( JSON.parse( readFileSync( soundtrackFile, 'utf8' ) ) );
  const source = resolve( option( 'narration' ) ?? join( dirname( soundtrackFile ), 'narration.mp3' ) );
  const out = resolve( option( 'out' ) ?? dirname( soundtrackFile ) );
  mkdirSync( out, { recursive: true } );
  const mp3 = join( out, `narration.${ preset.name }.mp3` );
  const paced = paceNarration( { root, source, captions: soundtrack.captions, preset, outMp3: mp3 } );
  const result = soundtrackSchema.parse( { ...soundtrack, narrationDuration: paced.duration, captions: paced.captions } );
  writeFileSync( join( out, `soundtrack.${ preset.name }.json` ), `${ JSON.stringify( result, null, 2 ) }\n` );
  console.log( JSON.stringify( { pace: preset.name, rate: preset.rate, sourceSeconds: paced.sourceDuration, pacedSeconds: paced.duration, pausesBefore: paced.pauses.before, pausesAfter: paced.pauses.after, mp3 } ) );
} catch ( error ) {
  console.error( `pacing failed: ${ error instanceof Error ? error.message : String( error ) }` );
  process.exit( 1 );
}
