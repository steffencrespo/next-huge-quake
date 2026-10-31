/**
 * tsx experiments/taipei101-cinematic/render.ts [--still=<seconds>] [--preview] [--final] [--tiktok] [--ui] [--out=<name>]
 * --tiktok renders the TikTok edition (composition Taipei101TikTok, default name taipei101-tiktok-v1). --ui adds the mock TikTok
 * interface for diagnostic stills and is refused for a video render, so the simulation can never reach an exported MP4.
 * --no-music swaps the music bed for a silent WAV (narration, SFX, timing and captions unchanged), for TikTok uploads where the
 * owner adds licensed music in TikTok Studio.
 * --final refuses to render while any required still is missing (AI-2 is optional), so a review cut never carries a placeholder.
 * Local only: no network, no paid call, nothing uploaded or published. Stages into public/ every still in assets.ts that exists (missing ones
 * render as labelled placeholders) and, when audio.json exists and --preview is not given, the cached paced narration, the Deified music and
 * the synthesized SFX; renders, then removes what it staged. --preview renders a silent video on the storyboard timing in script.ts.
 * Outputs: out/<name>.mp4 (default name taipei101-cinematic-v1), out/<name>.props.json and .log.
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
const preview = process.argv.includes( '--preview' );
const final = process.argv.includes( '--final' );
const tiktok = process.argv.includes( '--tiktok' );
const ui = process.argv.includes( '--ui' );
if ( ui && ( !tiktok || !still ) ) throw new Error( '--ui is only for --tiktok --still diagnostic frames' );
const noMusic = process.argv.includes( '--no-music' );
const SILENCE = 'audio/taipei101-silence.wav';
const composition = tiktok ? 'Taipei101TikTok' : 'Taipei101Cinematic';
const name = flag( 'out' ) ?? ( tiktok ? 'taipei101-tiktok-v1' : 'taipei101-cinematic-v1' );
const audioJson = join( here, 'audio.json' );
const audio = !preview && existsSync( audioJson ) ? eduAudioSchema.parse( JSON.parse( readFileSync( audioJson, 'utf8' ) ) ) : undefined;
if ( !audio && !still && !preview ) throw new Error( 'no audio.json: pass --preview (silent, storyboard timing) or --still until the narration is built' );

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
  let props: Record<string, unknown> = ui ? { present, simulateUi: true } : { present };
  if ( audio ) {
    const library = join( root, 'assets', 'audio', 'edu', 'library' ), paced = join( root, 'out', 'edu', 'paced', audio.pacing ?? '' );
    for ( const c of audio.clips ) {
      const file = c.file.split( '/' ).pop()!;
      stage( c.file, readFileSync( audio.pacing && file.endsWith( `-${audio.pacing}.mp3` ) ? join( paced, file ) : join( library, file ) ) );
    }
    if ( noMusic ) {
      // 70 s of 8 kHz mono silence (as in out/tiktok/render-tiktok.mts): Layers keeps its music track, it just carries nothing.
      const rate = 8000, n = rate * 70, wav = Buffer.alloc( 44 + n * 2 );
      wav.write( 'RIFF', 0 ); wav.writeUInt32LE( 36 + n * 2, 4 ); wav.write( 'WAVEfmt ', 8 ); wav.writeUInt32LE( 16, 16 );
      wav.writeUInt16LE( 1, 20 ); wav.writeUInt16LE( 1, 22 ); wav.writeUInt32LE( rate, 24 ); wav.writeUInt32LE( rate * 2, 28 );
      wav.writeUInt16LE( 2, 32 ); wav.writeUInt16LE( 16, 34 ); wav.write( 'data', 36 ); wav.writeUInt32LE( n * 2, 40 );
      stage( SILENCE, wav );
    } else stage( audio.musicFile, readFileSync( join( root, 'assets', audio.musicFile ) ) );
    stage( SFX_FILES.rumble, wavBytes( rumble() ) );
    stage( SFX_FILES.boom, wavBytes( boom() ) );
    for ( const e of Object.values( EXTRA_SFX ) ) stage( e.file, wavBytes( e.make() ) );
    props = { ...props, audio: noMusic ? { ...audio, musicFile: SILENCE, musicCredit: 'No music.' } : audio };
  }
  const propsFile = join( out, `${name}.props.json` );
  writeFileSync( propsFile, JSON.stringify( props ) );
  const target = still ? [ 'still', join( out, `${name}-still-${still}.png` ), `--frame=${Math.round( Number( still ) * 30 )}` ] : [ 'render', join( out, `${name}${preview ? '-preview' : ''}.mp4` ) ];
  const args = [ 'remotion', target[0], join( here, 'index.ts' ), composition, ...target.slice( 1 ), `--props=${propsFile}`, '--public-dir=' + join( root, 'public' ), '--overwrite' ];
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
