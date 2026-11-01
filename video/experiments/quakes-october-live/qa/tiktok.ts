/** tsx experiments/quakes-october-live/qa/tiktok.ts : compares the TikTok (no music) MP4 with the YouTube Shorts MP4.
 * Checks: identical video bitstream and duration; no music (narration gaps are silent in TikTok but carry music in Shorts);
 * narration level per clip matches the Shorts mix; narration timing (envelope cross-correlation per clip, 5 ms hop); peak, clipping, loudness.
 * Temporary WAV/H.264 files go to the OS temp dir. Exits non-zero on failure. */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
const here = dirname( new URL( import.meta.url ).pathname );
const dir = join( here, '..' );
const ff = join( dir, '..', '..', 'node_modules', '@remotion', 'compositor-darwin-x64' );
const shorts = join( dir, 'out', 'earthquakes-october-2026-vertical-final.mp4' );
const tiktok = join( dir, 'out', 'earthquakes-october-2026-tiktok-final.mp4' );
const tmp = mkdtempSync( join( tmpdir(), 'tiktok-qa-' ) );
const run = ( args: string[] ) => execFileSync( './ffmpeg', [ '-y', '-v', 'error', ...args ], { cwd: ff } );
const fails: string[] = [];
const check = ( name: string, ok: boolean, detail: string ) => { console.log( `${ok ? 'OK  ' : 'FAIL'} ${name}: ${detail}` ); if ( !ok ) fails.push( name ); };
try {
  const probe = ( f: string ) => execFileSync( './ffprobe', [ '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,duration,sample_rate,channels', '-of', 'compact', f ], { cwd: ff, encoding: 'utf8' } ).trim();
  console.log( `tiktok streams:\n${probe( tiktok )}` );
  const hashVideo = ( f: string, name: string ) => { const o = join( tmp, `${name}.h264` ); run( [ '-i', f, '-map', '0:v', '-c:v', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'h264', o ] ); return createHash( 'sha256' ).update( readFileSync( o ) ).digest( 'hex' ); };
  const hv = [ hashVideo( shorts, 's' ), hashVideo( tiktok, 't' ) ];
  check( 'video bitstream identical to Shorts', hv[0] === hv[1], hv[1].slice( 0, 16 ) );
  // full decode of the TikTok file (video and audio), errors fatal
  run( [ '-xerror', '-i', tiktok, '-s', '90x160', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', join( tmp, 'decode.mp4' ) ] );
  check( 'full decode', true, 'no errors' );

  const pcm = ( f: string, name: string ) => { const o = join( tmp, `${name}.wav` ); run( [ '-i', f, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', o ] ); const b = readFileSync( o ); return b.subarray( b.indexOf( 'data' ) + 8 ); };
  const A = pcm( shorts, 's' ), B = pcm( tiktok, 't' );
  const SR = 48000;
  const mono = ( p: Buffer ) => { const n = p.length / 4, m = new Float32Array( n ); for ( let i = 0; i < n; i++ ) m[i] = ( p.readInt16LE( i * 4 ) + p.readInt16LE( i * 4 + 2 ) ) / 65536; return m; };
  const a = mono( A ), b = mono( B );
  const rms = ( x: Float32Array, t0: number, t1: number ) => { let s = 0, c = 0; for ( let i = Math.max( 0, Math.floor( t0 * SR ) ); i < Math.min( x.length, Math.floor( t1 * SR ) ); i++ ) { s += x[i] * x[i]; c++; } return 10 * Math.log10( s / Math.max( 1, c ) + 1e-12 ); };
  let peak = 0, clipped = 0;
  for ( let i = 0; i < B.length / 2; i++ ) { const v = Math.abs( B.readInt16LE( i * 2 ) ) / 32768; peak = Math.max( peak, v ); if ( v >= 0.999 ) clipped++; }
  check( 'duration', Math.abs( b.length / SR - a.length / SR ) < 0.05, `tiktok ${( b.length / SR ).toFixed( 3 )} s, shorts ${( a.length / SR ).toFixed( 3 )} s` );
  check( 'no clipping', clipped === 0, `peak ${( 20 * Math.log10( peak ) ).toFixed( 2 )} dBFS, ${clipped} clipped samples` );

  const audio = JSON.parse( readFileSync( join( dir, 'audio-vertical.json' ), 'utf8' ) );
  const clips = audio.clips as { id: string; start: number; duration: number }[];
  // music-free check: every gap between narration clips (and head/tail) must be silent in TikTok while the Shorts mix carries music there
  const gaps: [ number, number ][] = []; let prev = 0;
  clips.forEach( c => { if ( c.start - prev > 0.4 ) gaps.push( [ prev + 0.12, c.start - 0.12 ] ); prev = c.start + c.duration; } );
  gaps.push( [ prev + 0.12, b.length / SR - 0.05 ] );
  gaps.forEach( ( [ t0, t1 ] ) => { const rt = rms( b, t0, t1 ), rs = rms( a, t0, t1 ); check( `silent gap ${t0.toFixed( 2 )}-${t1.toFixed( 2 )}`, rt < -60 && rs > -40, `tiktok ${rt.toFixed( 1 )} dB vs shorts ${rs.toFixed( 1 )} dB (music)` ); } );

  // envelopes at 5 ms for timing
  const HOP = 240;
  const env = ( x: Float32Array ) => { const e = new Float32Array( Math.floor( x.length / HOP ) ); for ( let k = 0; k < e.length; k++ ) { let s = 0; for ( let i = 0; i < HOP; i++ ) s += x[k * HOP + i] ** 2; e[k] = Math.sqrt( s / HOP ); } return e; };
  const ea = env( a ), eb = env( b );
  clips.forEach( c => {
    const rt = rms( b, c.start, c.start + c.duration ), rs = rms( a, c.start, c.start + c.duration );
    const k0 = Math.floor( c.start * SR / HOP ), k1 = Math.floor( ( c.start + c.duration ) * SR / HOP );
    let best = 0, bestLag = 0;
    for ( let lag = -40; lag <= 40; lag++ ) { let s = 0; for ( let k = k0; k < k1; k++ ) s += ( ea[k] ?? 0 ) * ( eb[k + lag] ?? 0 ); if ( s > best ) { best = s; bestLag = lag; } }
    const lagMs = bestLag * HOP / SR * 1000;
    check( `clip ${c.id.padEnd( 5 )}`, Math.abs( lagMs ) <= 15 && rt - rs > -1.0 && rt - rs < 0.3, `RMS tiktok ${rt.toFixed( 2 )} vs shorts ${rs.toFixed( 2 )} dB (music adds a little to Shorts), offset ${lagMs.toFixed( 0 )} ms` );
  } );

  const ln = spawnSync( './ffmpeg', [ '-hide_banner', '-i', tiktok, '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-' ], { cwd: ff, encoding: 'utf8' } );
  const m = JSON.parse( ln.stderr.slice( ln.stderr.lastIndexOf( '{' ), ln.stderr.lastIndexOf( '}' ) + 1 ) );
  console.log( `loudnorm (tiktok): integrated ${m.input_i} LUFS, true peak ${m.input_tp} dBTP, LRA ${m.input_lra}` );
} finally {
  rmSync( tmp, { recursive: true, force: true } );
}
console.log( fails.length ? `\n${fails.length} FAILURE(S)` : '\nALL TIKTOK CHECKS PASSED' );
process.exit( fails.length ? 1 : 0 );
