/** FINAL landscape loop. tsx experiments/quakes-october-live/audio-final.ts [plan|generate]. plan = no request. generate = ONE paid ElevenLabs request per line the library lacks, then writes audio.json. build = only (re)places cached clips, never paid. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignmentToCaptions } from '../../src/audio/captions.js';
import { DEFAULT_MUSIC, MUSIC } from '../../src/audio/music.js';
import { OUTPUT_FORMAT, generateSpeech, loadTtsConfig, parseEnvFile, speechFromAudio } from '../../src/audio/tts.js';
import { clipKey, normalizeText, openLibrary } from '../../src/edu/library.js';
import { MAX_CLIP_SECONDS, eduAudioSchema, placeClips } from '../../src/edu/narration.js';
import type { ClipInput } from '../../src/edu/narration.js';
import { generateLine, preflightLines } from '../../scripts/lib/edu-generate.js';
import type { LedgerEntry } from '../../scripts/lib/edu-generate.js';
import { QUAKES_OCTOBER_FINAL } from './script-final.js';

const here = dirname( new URL( import.meta.url ).pathname );
const root = join( here, '..', '..' );
const ledgerFile = join( root, 'out', 'edu', 'credit-ledger-quakes-october-live.json' );
const config = loadTtsConfig( { ...parseEnvFile( readFileSync( join( root, '.env.local' ), 'utf8' ) ), ...process.env } );
const library = openLibrary( join( root, 'assets', 'audio', 'edu', 'library' ) );
const identity = ( text: string ) => ( { text, voiceId: config.voiceId, modelId: config.modelId, outputFormat: OUTPUT_FORMAT } );
const readLedger = (): LedgerEntry[] => ( existsSync( ledgerFile ) ? JSON.parse( readFileSync( ledgerFile, 'utf8' ) ) : [] );
const spent = () => readLedger().reduce( ( n, e ) => n + e.characters, 0 );
const script = QUAKES_OCTOBER_FINAL.script;
const budget = spent() + 1500; // per-run cap for this final pass (paid TTS authorized for the final render)
const todo = script.filter( l => !library.has( identity( l.text ) ) );
const chars = todo.reduce( ( n, l ) => n + normalizeText( l.text ).length, 0 );
for ( const l of script ) console.log( `${library.has( identity( l.text ) ) ? 'REUSED' : 'NEW   '} ${String( l.text.length ).padStart( 3 )} ${l.id.padEnd( 5 )} ${l.text}` );
console.log( `voice ${config.voiceId} model ${config.modelId}: ${todo.length} new clips, ${chars} characters = ~${chars} credits` );

if ( process.argv[2] === 'generate' || process.argv[2] === 'build' ) {
  preflightLines( todo.map( l => ( { id: l.id, text: l.text, characters: normalizeText( l.text ).length } ) ), MAX_CLIP_SECONDS );
  if ( process.argv[2] === 'build' && todo.length ) throw new Error( 'build: clips missing; run generate' );
  for ( const line of todo ) {
    const id = identity( line.text );
    const speech = await generateLine( {
      episode: 'quakes-october-live-final', line, key: clipKey( id ), characters: normalizeText( line.text ).length, budget, limitSeconds: MAX_CLIP_SECONDS, spent,
      record: e => { mkdirSync( dirname( ledgerFile ), { recursive: true } ); writeFileSync( ledgerFile, JSON.stringify( [ ...readLedger(), e ], null, 2 ) ); },
      request: ( text, limit ) => generateSpeech( text, config, fetch, limit ),
      save: s => library.addGenerated( id, s.mp3, s.alignment, `quakes-october-live-final:${line.id}` )
    } );
    console.log( `generated ${line.id}: ${speech.durationSeconds.toFixed( 2 )} s` );
  }
  const rms = ( mp3: string ) => {
    const tmp = join( root, 'out', 'edu', 'level.wav' );
    execFileSync( 'npx', [ 'remotion', 'ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', '22050', '-c:a', 'pcm_s16le', tmp ], { cwd: root } );
    const pcm = readFileSync( tmp ).subarray( 44 ); rmSync( tmp, { force: true } );
    let s = 0, c = 0;
    for ( let i = 0; i + 1 < pcm.length; i += 2 ) { const v = pcm.readInt16LE( i ) / 32768; if ( Math.abs( v ) > 0.02 ) { s += v * v; c++; } }
    return 10 * Math.log10( s / Math.max( 1, c ) );
  };
  const levels = script.map( l => rms( library.paths( identity( l.text ) ).mp3 ) );
  const target = [ ...levels ].sort( ( a, b ) => a - b )[Math.floor( levels.length / 2 )];
  const clips: ClipInput[] = script.map( ( l, i ) => {
    const p = library.paths( identity( l.text ) );
    const speech = speechFromAudio( l.text, readFileSync( p.mp3 ), JSON.parse( readFileSync( p.alignment, 'utf8' ) ), MAX_CLIP_SECONDS );
    return { id: l.id, file: `audio/edu/${p.key}.mp3`, duration: speech.durationSeconds, captions: alignmentToCaptions( speech.alignment ), gain: Math.round( Math.min( 1.4, Math.max( 0.7, 10 ** ( ( target - levels[i] ) / 20 ) ) ) * 100 ) / 100 };
  } );
  const audio = eduAudioSchema.parse( { ...placeClips( script, clips ), musicFile: MUSIC[DEFAULT_MUSIC].file, musicCredit: MUSIC[DEFAULT_MUSIC].credit } );
  writeFileSync( join( here, 'audio-final.json' ), JSON.stringify( audio, null, 2 ) );
  console.log( `audio.json: narration ${audio.narrationStart}-${audio.narrationEnd} s; ledger total ${spent()} credits` );
}
