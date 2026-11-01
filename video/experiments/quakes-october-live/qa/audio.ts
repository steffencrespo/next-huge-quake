/** tsx experiments/quakes-october-live/qa/audio.ts <mp4> : decodes the mix with Remotion's ffmpeg to 16-bit WAV, then measures in Node:
 * peak, clipped samples, per-narration-clip RMS in the mix, music-only RMS, and the loop seam (level and sample jump). Plus ffmpeg loudnorm (integrated LUFS, true peak). */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
const here = dirname( new URL( import.meta.url ).pathname );
const root = join( here, '..', '..', '..' );
const mp4 = process.argv[2];
const ff = join( root, 'node_modules', '@remotion', 'compositor-darwin-x64' );
const wav = join( here, 'mix.wav' );
execFileSync( './ffmpeg', [ '-y', '-v', 'error', '-i', mp4, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', wav ], { cwd: ff } );
const buf = readFileSync( wav ); rmSync( wav );
const data = buf.indexOf( 'data' ); const pcm = buf.subarray( data + 8 );
const n = pcm.length / 4; const SR = 48000;
const L = ( i: number ) => pcm.readInt16LE( i * 4 ) / 32768, R = ( i: number ) => pcm.readInt16LE( i * 4 + 2 ) / 32768;
let peak = 0, clipped = 0;
for ( let i = 0; i < n; i++ ) { const a = Math.max( Math.abs( L( i ) ), Math.abs( R( i ) ) ); peak = Math.max( peak, a ); if ( a >= 0.999 ) clipped++; }
const rms = ( t0: number, t1: number ) => { let s = 0, c = 0; for ( let i = Math.max( 0, Math.floor( t0 * SR ) ); i < Math.min( n, Math.floor( t1 * SR ) ); i++ ) { s += L( i ) ** 2 + R( i ) ** 2; c += 2; } return 10 * Math.log10( s / Math.max( 1, c ) + 1e-12 ); };
const db = ( x: number ) => ( 20 * Math.log10( x ) ).toFixed( 2 );
const audio = JSON.parse( readFileSync( join( here, '..', 'audio-final.json' ), 'utf8' ) );
const dur = n / SR;
console.log( `audio ${dur.toFixed( 3 )} s, peak ${db( peak )} dBFS, clipped samples ${clipped}` );
const clipRms = audio.clips.map( ( c: any ) => ( { id: c.id, start: c.start, end: c.start + c.duration, rms: rms( c.start, c.start + c.duration ) } ) );
clipRms.forEach( ( c: any ) => console.log( `  ${c.id.padEnd( 6 )} ${c.start.toFixed( 2 )}-${c.end.toFixed( 2 )} RMS ${c.rms.toFixed( 2 )} dB${c.end > dur - 0.5 ? '  ** TOO CLOSE TO END' : ''}` ) );
const vals = clipRms.map( ( c: any ) => c.rms ); console.log( `narration RMS spread ${( Math.max( ...vals ) - Math.min( ...vals ) ).toFixed( 2 )} dB` );
// music-only stretches: gaps between clips longer than 1.5 s
const gaps: [ number, number ][] = []; let prev = 0;
audio.clips.forEach( ( c: any ) => { if ( c.start - prev > 1.5 ) gaps.push( [ prev + 0.3, c.start - 0.3 ] ); prev = c.start + c.duration; } ); if ( dur - prev > 1.5 ) gaps.push( [ prev + 0.3, dur ] );
gaps.forEach( ( [ a, z ] ) => console.log( `  music-only ${a.toFixed( 1 )}-${z.toFixed( 1 )} RMS ${rms( a, z ).toFixed( 2 )} dB` ) );
console.log( `seam: last 0.5 s RMS ${rms( dur - 0.5, dur ).toFixed( 2 )} dB, first 0.5 s RMS ${rms( 0, 0.5 ).toFixed( 2 )} dB, sample jump L ${Math.abs( L( n - 1 ) - L( 0 ) ).toFixed( 4 )} R ${Math.abs( R( n - 1 ) - R( 0 ) ).toFixed( 4 )}` );
const ln = spawnSync( './ffmpeg', [ '-hide_banner', '-i', mp4, '-vn', '-af', 'loudnorm=print_format=json', '-f', 'null', '-' ], { cwd: ff, encoding: 'utf8' } );
const j = ln.stderr.slice( ln.stderr.lastIndexOf( '{' ), ln.stderr.lastIndexOf( '}' ) + 1 );
const m = JSON.parse( j ); console.log( `loudnorm: integrated ${m.input_i} LUFS, true peak ${m.input_tp} dBTP, LRA ${m.input_lra}` );
