/**
 * Dry run for the kids series narration: prints the script, the characters needing synthesis, cache reuse and the
 * ElevenLabs credit estimate. Makes no request and writes nothing: tsx scripts/kids-narration-plan.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OUTPUT_FORMAT, parseEnvFile } from '../src/audio/tts.js';
import { openLibrary } from '../src/edu/library.js';
import { normalizeText } from '../src/edu/library.js';
import { KIDS_EPISODE, KIDS_MUSIC, KIDS_VOICE } from '../src/kids/config.js';
import { creditsPerCharacter } from '../src/kids/credits.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const envFile = join( root, '.env.local' );
const env = { ...( existsSync( envFile ) ? parseEnvFile( readFileSync( envFile, 'utf8' ) ) : {} ), ...process.env };
const modelId = env.ELEVENLABS_MODEL_ID?.trim() || 'eleven_multilingual_v2';
const library = openLibrary( join( root, 'assets', 'audio', 'edu', 'library' ) );

let total = 0;
let fresh = 0;
for ( const line of KIDS_EPISODE.script ) {
  const text = normalizeText( line.text );
  const hit = library.has( { text, voiceId: KIDS_VOICE.id, modelId, outputFormat: OUTPUT_FORMAT } );
  total += text.length;
  fresh += hit ? 0 : text.length;
  console.log( `${hit ? 'cached' : 'NEW   '} ${String( text.length ).padStart( 3 )}  ${line.id.padEnd( 7 )} ${text}` );
}
const rate = creditsPerCharacter( modelId );
console.log( `\nvoice ${KIDS_VOICE.name} (${KIDS_VOICE.id}), model ${modelId}, ${KIDS_EPISODE.script.length} clips` );
console.log( `${total} characters in the script, ${total - fresh} reusable from the library, ${fresh} need new synthesis` );
console.log( `estimated credits: ${Math.ceil( fresh * rate )} (${rate} per character); with one full re-take of every line: ${Math.ceil( fresh * rate * 2 )}` );
console.log( `music file: ${existsSync( join( root, 'assets', KIDS_MUSIC.file ) ) ? 'present' : 'MISSING'} (${KIDS_MUSIC.file})` );
console.log( 'dry run: no request made' );
