/** tsx experiments/quakes-october-live/export-tiktok.ts : FREE, local. TikTok version of the approved 9:16 edit with NO background music
 * (project rule: TikTok music is added manually in the app). The video stream is copied bit for bit from the YouTube Shorts MP4
 * (no re-render); the audio is re-mixed from the original paced narration stems only, with the same frame-rounded start times and gains
 * the composition uses (audio-vertical.json). Nothing is filtered out of the mixed track and no ElevenLabs call is made. */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { eduAudioSchema } from '../../src/edu/narration.js';

const here = dirname( new URL( import.meta.url ).pathname );
const root = join( here, '..', '..' );
const ff = join( root, 'node_modules', '@remotion', 'compositor-darwin-x64' );
const FPS = 30;
const shorts = join( here, 'out', 'earthquakes-october-2026-vertical-final.mp4' );
const out = join( here, 'out', 'earthquakes-october-2026-tiktok-final.mp4' );
const audio = eduAudioSchema.parse( JSON.parse( readFileSync( join( here, 'audio-vertical.json' ), 'utf8' ) ) );
const paced = join( root, 'out', 'edu', 'paced', audio.pacing ?? '' );
const stems = audio.clips.map( c => {
  const f = c.file.split( '/' ).pop()!;
  const p = audio.pacing && f.endsWith( `-${audio.pacing}.mp3` ) ? join( paced, f ) : join( root, 'assets', 'audio', 'edu', 'library', f );
  if ( !existsSync( p ) ) throw new Error( `missing narration stem ${p}` );
  return { ...c, path: p, delayMs: Math.round( Math.round( c.start * FPS ) / FPS * 1000 ) };
} );
const duration = Number( execFileSync( './ffprobe', [ '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=duration', '-of', 'csv=p=0', shorts ], { cwd: ff, encoding: 'utf8' } ).match( /[\d.]+/ )![0] );
const chains = stems.map( ( s, i ) => `[${i + 1}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${s.gain ?? 1},adelay=${s.delayMs}:all=1[n${i}]` );
const graph = `${chains.join( ';' )};${stems.map( ( _, i ) => `[n${i}]` ).join( '' )}amix=inputs=${stems.length}:normalize=0:duration=longest,apad,atrim=end=${duration}[mix]`;
execFileSync( './ffmpeg', [
  '-y', '-v', 'error', '-i', shorts, ...stems.flatMap( s => [ '-i', s.path ] ),
  '-filter_complex', graph, '-map', '0:v', '-c:v', 'copy', '-map', '[mix]', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', out
], { cwd: ff, stdio: 'inherit' } );
console.log( `wrote ${out}: video copied from the Shorts MP4, narration-only audio from ${stems.length} stems (${audio.pacing}), no music` );
