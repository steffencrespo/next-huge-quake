/**
 * PAID: generates the "SIX SEVEN" v2 narration with ElevenLabs (Daniel, the project's configured voice and model), one request
 * per line, and stores each clip in the narration library. Single attempt per line: no retries, stops at the first failure,
 * skips any line the library already holds, and refuses to exceed the approved character budget. Every request is recorded
 * in out/edu/credit-ledger-sixseven.json.
 * Usage: tsx scripts/six-seven-narration.ts            (dry run: prints the plan)
 *        tsx scripts/six-seven-narration.ts --generate (makes the requests)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OUTPUT_FORMAT, generateSpeech, loadTtsConfig, parseEnvFile } from '../src/audio/tts.js';
import { SIX_SEVEN_BUDGET, SIX_SEVEN_SCRIPT } from '../src/edu/sixsevenScript.js';
import { clipKey, normalizeText, openLibrary } from '../src/edu/library.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const envFile = join( root, '.env.local' );
const config = loadTtsConfig( { ...( existsSync( envFile ) ? parseEnvFile( readFileSync( envFile, 'utf8' ) ) : {} ), ...process.env } );
const library = openLibrary( join( root, 'assets', 'audio', 'edu', 'library' ) );
const ledgerFile = join( root, 'out', 'edu', 'credit-ledger-sixseven.json' );
const identity = ( text: string ) => ( { text, voiceId: config.voiceId, modelId: config.modelId, outputFormat: OUTPUT_FORMAT } );
const missing = SIX_SEVEN_SCRIPT.filter( l => !library.has( identity( l.text ) ) );
const characters = missing.reduce( ( n, l ) => n + normalizeText( l.text ).length, 0 );
console.log( `${ missing.length } of ${ SIX_SEVEN_SCRIPT.length } lines need audio: ${ characters } characters (budget ${ SIX_SEVEN_BUDGET })` );
if ( characters > SIX_SEVEN_BUDGET ) {
  throw new Error( 'over the approved budget; stopping' );
}
if ( !process.argv.includes( '--generate' ) ) {
  console.log( 'dry run: no request made' );
  process.exit( 0 );
}
const ledger: unknown[] = existsSync( ledgerFile ) ? JSON.parse( readFileSync( ledgerFile, 'utf8' ) ) : [];
for ( const line of missing ) {
  const id = identity( line.text );
  const chars = normalizeText( line.text ).length;
  const speech = await generateSpeech( line.text, config, fetch, 9 );
  library.addGenerated( id, speech.mp3, speech.alignment, `sixseven:${ line.id }` );
  ledger.push( { at: new Date().toISOString(), line: line.id, key: clipKey( id ), characters: chars } );
  mkdirSync( dirname( ledgerFile ), { recursive: true } );
  writeFileSync( ledgerFile, JSON.stringify( ledger, null, 2 ) );
  console.log( `generated ${ line.id }: ${ speech.durationSeconds.toFixed( 2 ) } s, ${ chars } credits` );
}
console.log( `done. Characters billed this run: ${ missing.reduce( ( n, l ) => n + normalizeText( l.text ).length, 0 ) }` );
