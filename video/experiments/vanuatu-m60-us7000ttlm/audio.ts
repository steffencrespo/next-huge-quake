/**
 * tsx experiments/vanuatu-m60-us7000ttlm/audio.ts [plan|generate --budget=<credits>|build]
 * plan (default) = free: lists each line, its characters, the preflight verdict and the credit estimate. No request.
 * generate = PAID: ONE ElevenLabs request per line the library lacks; refuses to run without an explicit --budget=<credits> that covers the estimate.
 * build = free: paces the cached clips (fast-beats, the Panama D4 pacing) and writes audio.json; fails if a clip is missing.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { alignmentToCaptions } from '../../src/audio/captions.js';
import { DEFAULT_MUSIC, MUSIC } from '../../src/audio/music.js';
import { FAST_BEATS_PACING, clipGap } from '../../src/audio/pacing.js';
import type { Caption } from '../../src/audio/soundtrack.js';
import { OUTPUT_FORMAT, generateSpeech, loadTtsConfig, parseEnvFile, speechFromAudio } from '../../src/audio/tts.js';
import { clipKey, normalizeText, openLibrary } from '../../src/edu/library.js';
import { MAX_CLIP_SECONDS, eduAudioSchema, placeClips } from '../../src/edu/narration.js';
import type { ClipInput } from '../../src/edu/narration.js';
import { paceNarration } from '../../scripts/lib/pace-audio.js';
import { generateLine, preflightLines } from '../../scripts/lib/edu-generate.js';
import type { LedgerEntry } from '../../scripts/lib/edu-generate.js';
import { VANUATU_SEQUENCE } from './script.js';

const mode = process.argv[2] ?? 'plan';
const here = dirname( new URL( import.meta.url ).pathname );
const root = join( here, '..', '..' );
const ledgerFile = join( root, 'out', 'edu', 'credit-ledger-vanuatu-m60-us7000ttlm.json' );
const config = loadTtsConfig( { ...parseEnvFile( readFileSync( join( root, '.env.local' ), 'utf8' ) ), ...process.env } );
const library = openLibrary( join( root, 'assets', 'audio', 'edu', 'library' ) );
const identity = ( text: string ) => ( { text, voiceId: config.voiceId, modelId: config.modelId, outputFormat: OUTPUT_FORMAT } );
const readLedger = (): LedgerEntry[] => ( existsSync( ledgerFile ) ? JSON.parse( readFileSync( ledgerFile, 'utf8' ) ) : [] );
const spent = () => readLedger().reduce( ( n, e ) => n + e.characters, 0 );
const script = VANUATU_SEQUENCE.script;
const todo = script.filter( l => !library.has( identity( l.text ) ) );
const chars = ( lines: typeof script ) => lines.reduce( ( n, l ) => n + normalizeText( l.text ).length, 0 );
const pace = FAST_BEATS_PACING;
const pacedDir = join( root, 'out', 'edu', 'paced', pace.name );

for ( const l of script ) console.log( `${library.has( identity( l.text ) ) ? 'REUSED' : 'NEW   '} ${String( normalizeText( l.text ).length ).padStart( 3 )} ${l.id.padEnd( 3 )} ${l.text}` );
const estimate = chars( todo );
console.log( `voice ${config.voiceId} model ${config.modelId}: ${todo.length} new clips, ${estimate} characters = ~${estimate} credits (1 credit per character); ledger so far ${spent()}` );
console.log( `lines: ${script.length} total ${chars( script )} characters; preflight limit ${MAX_CLIP_SECONDS} s per clip at 12 characters/s` );
try {
  preflightLines( script.map( l => ( { id: l.id, text: l.text, characters: normalizeText( l.text ).length } ) ), MAX_CLIP_SECONDS );
  console.log( 'preflight: every line is within the clip limit' );
} catch ( e ) {
  console.log( `preflight FAILED: ${( e as Error ).message}` );
  process.exitCode = 1;
}

if ( mode === 'generate' || mode === 'build' ) {
  const budget = Number( process.argv.find( a => a.startsWith( '--budget=' ) )?.slice( 9 ) );
  if ( mode === 'generate' ) {
    if ( !Number.isFinite( budget ) || budget < spent() + estimate ) throw new Error( `generate is paid: pass --budget=<credits> of at least ${spent() + estimate} (ledger ${spent()} + estimate ${estimate})` );
    preflightLines( todo.map( l => ( { id: l.id, text: l.text, characters: normalizeText( l.text ).length } ) ), MAX_CLIP_SECONDS );
  }
  if ( mode === 'build' && todo.length ) throw new Error( 'build: clips missing; run generate (paid, needs approval)' );
  for ( const line of mode === 'generate' ? todo : [] ) {
    const id = identity( line.text );
    const speech = await generateLine( {
      episode: VANUATU_SEQUENCE.id, line, key: clipKey( id ), characters: normalizeText( line.text ).length, budget, limitSeconds: MAX_CLIP_SECONDS, spent,
      record: e => { mkdirSync( dirname( ledgerFile ), { recursive: true } ); writeFileSync( ledgerFile, JSON.stringify( [ ...readLedger(), e ], null, 2 ) ); },
      request: ( text, limit ) => generateSpeech( text, config, fetch, limit ),
      save: s => library.addGenerated( id, s.mp3, s.alignment, `${VANUATU_SEQUENCE.id}:${line.id}` )
    } );
    console.log( `generated ${line.id}: ${speech.durationSeconds.toFixed( 2 )} s` );
  }
  const rms = ( mp3: string ) => {
    const tmp = join( root, 'out', 'edu', 'level.wav' );
    execFileSync( 'npx', [ 'remotion', 'ffmpeg', '-y', '-v', 'error', '-i', mp3, '-ac', '1', '-ar', '22050', tmp ], { cwd: root } );
    const pcm = readFileSync( tmp ).subarray( 44 ); rmSync( tmp, { force: true } );
    let s = 0, c = 0;
    for ( let i = 0; i + 1 < pcm.length; i += 2 ) { const v = pcm.readInt16LE( i ) / 32768; if ( Math.abs( v ) > 0.02 ) { s += v * v; c++; } }
    return 10 * Math.log10( s / Math.max( 1, c ) );
  };
  const levels = script.map( l => rms( library.paths( identity( l.text ) ).mp3 ) );
  const target = [ ...levels ].sort( ( a, b ) => a - b )[Math.floor( levels.length / 2 )];
  mkdirSync( pacedDir, { recursive: true } );
  const clips: ClipInput[] = script.map( ( l, i ) => {
    const p = library.paths( identity( l.text ) );
    const speech = speechFromAudio( l.text, readFileSync( p.mp3 ), JSON.parse( readFileSync( p.alignment, 'utf8' ) ), MAX_CLIP_SECONDS );
    const captions = alignmentToCaptions( speech.alignment );
    const out = join( pacedDir, `${p.key}-${pace.name}.mp3` ), meta = join( pacedDir, `${p.key}-${pace.name}.json` );
    if ( !existsSync( out ) || !existsSync( meta ) ) writeFileSync( meta, `${JSON.stringify( paceNarration( { root, source: p.mp3, captions, preset: pace, outMp3: out } ) )}\n` );
    const fast = JSON.parse( readFileSync( meta, 'utf8' ) ) as { duration: number; captions: Caption[] };
    return { id: l.id, file: `audio/edu/${p.key}-${pace.name}.mp3`, duration: fast.duration, captions: fast.captions, gain: Math.round( Math.min( 1.4, Math.max( 0.7, 10 ** ( ( target - levels[i] ) / 20 ) ) ) * 100 ) / 100 };
  } );
  const audio = eduAudioSchema.parse( { ...placeClips( script, clips, { gap: clipGap( pace ), keepPauses: pace.keepPauses } ), musicFile: MUSIC[DEFAULT_MUSIC].file, musicCredit: MUSIC[DEFAULT_MUSIC].credit, pacing: pace.name } );
  writeFileSync( join( here, 'audio.json' ), JSON.stringify( audio, null, 2 ) );
  console.log( `audio.json: narration ${audio.narrationStart}-${audio.narrationEnd} s (fast-beats); ledger total ${spent()} credits` );
}
