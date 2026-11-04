/**
 * EXPERIMENT: Instagram Reel of the published California Myth vs Fact Short. No network, no TTS.
 * Reuses the published render's props (narration clips, gains, timing) with: the closing "Like and subscribe" clip and its
 * captions removed, and the music replaced by silence (no track in the repo is demonstrably licensed for Instagram).
 * A silent stand-in keeps the closing beat (visuals fade on it) without any sound. Usage: [NHQ_MAIN_VIDEO=/path/to/main/video/] npx tsx experiments/instagram/build.mts
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL( '../../', import.meta.url ).pathname;
/** Checkout that holds the git-ignored published render, props and narration library (a worktree has none of them): NHQ_MAIN_VIDEO=<path>/video/, default this checkout. */
const main = process.env.NHQ_MAIN_VIDEO ?? root;
const src = JSON.parse( readFileSync( `${main}out/edu/final/california-deified.props.json`, 'utf8' ) ).audio;
const outDir = `${root}out/experiments/instagram`;
mkdirSync( outDir, { recursive: true } );

const wav = ( seconds: number ) => {
  const n = Math.round( 44100 * seconds ), b = Buffer.alloc( 44 + n * 2 );
  b.write( 'RIFF', 0 ); b.writeUInt32LE( 36 + n * 2, 4 ); b.write( 'WAVEfmt ', 8 ); b.writeUInt32LE( 16, 16 ); b.writeUInt16LE( 1, 20 ); b.writeUInt16LE( 1, 22 );
  b.writeUInt32LE( 44100, 24 ); b.writeUInt32LE( 88200, 28 ); b.writeUInt16LE( 2, 32 ); b.writeUInt16LE( 16, 34 ); b.write( 'data', 36 ); b.writeUInt32LE( n * 2, 40 );
  return b;
};
const how = src.clips.find( ( c: any ) => c.id === 'how' );
const ctaStart = Math.round( ( how.start + how.duration + 0.1 ) * 1000 ) / 1000;
const SILENCE = 'audio/exp-instagram-silence.wav';
const audio = {
  ...src,
  clips: [ ...src.clips.filter( ( c: any ) => c.id !== 'cta' ), { id: 'cta', file: SILENCE, start: ctaStart, duration: 0.1, gain: 1 } ],
  captions: src.captions.filter( ( c: any ) => c.start < ctaStart ),
  narrationEnd: how.start + how.duration,
  musicFile: SILENCE,
  musicCredit: 'No music.',
  pacing: 'instagram-trim' // label only (clips are untouched): lets the video end after the last word instead of the 40 s storyboard floor
};

const staged: string[] = [];
const stage = ( rel: string, from?: string, bytes?: Buffer ) => {
  const t = `${root}public/${rel}`;
  if ( existsSync( t ) ) return;
  mkdirSync( t.replace( /\/[^/]+$/, '' ), { recursive: true } );
  from ? copyFileSync( from, t ) : writeFileSync( t, bytes! );
  staged.push( t );
};
try {
  for ( const c of src.clips ) if ( c.id !== 'cta' ) stage( c.file, `${main}assets/audio/edu/library/${c.file.split( '/' ).pop()}` );
  stage( SILENCE, undefined, wav( 1 ) );
  // synthesized effects, same generators as the published render
  const { SFX_FILES, EXTRA_SFX, boom, rumble, wavBytes } = await import( "../../src/edu/sfx.js" );
  stage( SFX_FILES.rumble, undefined, wavBytes( rumble() ) );
  stage( SFX_FILES.boom, undefined, wavBytes( boom() ) );
  for ( const e of Object.values( EXTRA_SFX ) as any[] ) stage( e.file, undefined, wavBytes( e.make() ) );
  writeFileSync( `${outDir}/props.json`, JSON.stringify( { audio } ) );
  const r = spawnSync( 'npx', [ 'remotion', 'render', 'experiments/instagram/entry.tsx', 'CaliforniaReel', `${outDir}/california-reel.mp4`, `--props=${outDir}/props.json`, '--overwrite' ], { cwd: root, stdio: 'inherit' } );
  if ( r.status !== 0 ) throw new Error( `render failed ${r.status}` );
} finally {
  staged.forEach( f => rmSync( f, { force: true } ) );
}
