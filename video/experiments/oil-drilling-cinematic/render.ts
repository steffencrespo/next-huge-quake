/**
 * tsx experiments/oil-drilling-cinematic/render.ts [--still=<seconds>] [--final] [--tiktok] [--ui] [--out=<name>]
 * --tiktok renders the TikTok edition (composition OilDrillingTikTok, default name oil-drilling-tiktok-no-music-v1): the Deified bed is replaced by a
 * silent WAV; narration, SFX, timing and captions are unchanged, and the owner adds licensed music in TikTok Studio. --ui adds the mock TikTok
 * interface for diagnostic stills and is refused for a video render, so the simulation can never reach an exported MP4.
 * --final refuses to render while any required still is missing (AI-5 is optional), so a review cut never carries a placeholder.
 * Local only: no network, no paid call, nothing uploaded or published. Stages into public/ every still in assets.ts that exists (missing ones
 * render as labelled placeholders), the cached paced narration, the Deified music and the synthesized SFX; renders, then removes what it staged.
 * Outputs: out/<name>.mp4 (default name oil-drilling-cinematic-v1), out/<name>.props.json and .log.
 */
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { eduAudioSchema } from '../../src/edu/narration.js';
import { EXTRA_SFX, SFX_FILES, boom, rumble, wavBytes } from '../../src/edu/sfx.js';
import { ASSETS } from './assets.js';

const here = dirname( new URL( import.meta.url ).pathname );
const root = join( here, '..', '..' );
const flag = ( name: string ) => process.argv.find( a => a.startsWith( `--${name}=` ) )?.split( '=' )[1];
const still = flag( 'still' );
const final = process.argv.includes( '--final' );
const tiktok = process.argv.includes( '--tiktok' );
const ui = process.argv.includes( '--ui' );
if ( ui && ( !tiktok || !still ) ) throw new Error( '--ui is only for --tiktok --still diagnostic frames' );
const SILENCE = 'audio/oil-drilling-silence.wav';
const name = flag( 'out' ) ?? ( tiktok ? 'oil-drilling-tiktok-no-music-v1' : 'oil-drilling-cinematic-v1' );
const audio = eduAudioSchema.parse( JSON.parse( readFileSync( join( here, 'audio.json' ), 'utf8' ) ) );

const out = join( here, 'out' );
mkdirSync( out, { recursive: true } );
const staged: string[] = [];
const stage = ( rel: string, bytes: Buffer ) => {
  const target = join( root, 'public', rel );
  if ( existsSync( target ) ) {
    if ( !readFileSync( target ).equals( bytes ) ) throw new Error( `${target} exists with different content; remove it and retry` );
    return;
  }
  mkdirSync( dirname( target ), { recursive: true } );
  writeFileSync( target, bytes );
  staged.push( target );
};
try {
  const present: string[] = [];
  for ( const a of Object.values( ASSETS ) ) {
    const src = join( here, 'assets', a.file );
    if ( !existsSync( src ) ) continue;
    stage( a.staged, readFileSync( src ) );
    present.push( a.id );
  }
  const missing = Object.values( ASSETS ).filter( a => !present.includes( a.id ) );
  console.log( `stills present: ${present.join( ', ' ) || 'none'}; placeholders: ${missing.map( a => a.id ).join( ', ' ) || 'none'}` );
  const required = missing.filter( a => !( 'optional' in a && a.optional ) ).map( a => a.id );
  if ( final && required.length ) throw new Error( `--final: missing ${required.join( ', ' )}; not rendering a cut with placeholders` );
  const paced = join( root, 'out', 'edu', 'paced', audio.pacing ?? '' );
  for ( const c of audio.clips ) stage( c.file, readFileSync( join( paced, c.file.split( '/' ).pop()! ) ) );
  if ( tiktok ) {
    // 70 s of 8 kHz mono silence (as in the Taipei 101 edition): Layers keeps its music track, it just carries nothing.
    const rate = 8000, n = rate * 70, wav = Buffer.alloc( 44 + n * 2 );
    wav.write( 'RIFF', 0 ); wav.writeUInt32LE( 36 + n * 2, 4 ); wav.write( 'WAVEfmt ', 8 ); wav.writeUInt32LE( 16, 16 );
    wav.writeUInt16LE( 1, 20 ); wav.writeUInt16LE( 1, 22 ); wav.writeUInt32LE( rate, 24 ); wav.writeUInt32LE( rate * 2, 28 );
    wav.writeUInt16LE( 2, 32 ); wav.writeUInt16LE( 16, 34 ); wav.write( 'data', 36 ); wav.writeUInt32LE( n * 2, 40 );
    stage( SILENCE, wav );
  } else stage( audio.musicFile, readFileSync( join( root, 'assets', audio.musicFile ) ) );
  stage( SFX_FILES.rumble, wavBytes( rumble() ) );
  stage( SFX_FILES.boom, wavBytes( boom() ) );
  for ( const e of Object.values( EXTRA_SFX ) ) stage( e.file, wavBytes( e.make() ) );
  const propsFile = join( out, `${name}.props.json` );
  writeFileSync( propsFile, JSON.stringify( { present, audio: tiktok ? { ...audio, musicFile: SILENCE, musicCredit: 'No music.' } : audio, ...( ui ? { simulateUi: true } : {} ) } ) );
  const target = still ? [ 'still', join( out, `${name}-still-${still}.png` ), `--frame=${Math.round( Number( still ) * 30 )}` ] : [ 'render', join( out, `${name}.mp4` ) ];
  // --gl=angle: the Pawnee beat is a live MapLibre map.
  const args = [ 'remotion', target[0], join( here, 'index.ts' ), tiktok ? 'OilDrillingTikTok' : 'OilDrillingCinematic', ...target.slice( 1 ), '--gl=angle', `--props=${propsFile}`, '--public-dir=' + join( root, 'public' ), '--overwrite' ];
  const log = still ? undefined : openSync( join( out, `${name}.log` ), 'w' );
  const r = spawnSync( 'npx', args, { cwd: root, stdio: log === undefined ? 'inherit' : [ 'ignore', log, log ] } );
  if ( log !== undefined ) closeSync( log );
  if ( r.status !== 0 ) throw new Error( `render failed (${r.status})${log !== undefined ? `; see out/${name}.log` : ''}` );
  console.log( `wrote ${target[1]}` );
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
  const dir = join( root, 'public', dirname( ASSETS.ai1.staged ) );
  if ( existsSync( dir ) && readdirSync( dir ).length === 0 ) rmSync( dir, { recursive: true } );
}
