/**
 * Verifies spike renders in out/ and writes out/report.md, out/verification.json and stills.
 *
 * Remotion's bundled ffmpeg is a minimal build (no select/blackdetect/psnr/framemd5 filters), so this script
 * decodes every frame to raw RGB through it and computes the checks itself:
 * - stream checks via ffprobe (codec, size, frame rate, frame count)
 * - blank-frame and pop/flash detection (content share, frame-to-frame difference)
 * - per-frame md5 and PSNR between repeat renders and between GL modes
 * - per-frame map diagnostics (MAPDIAG lines logged by MapSpike during render)
 * - full-resolution stills and contact sheets (PNG written here with zlib)
 *
 * Usage: tsx scripts/verify-render.ts
 */
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deflateSync } from 'node:zlib';
import type { Readable } from 'node:stream';

const WIDTH = 1080;
const HEIGHT = 1920;
const FRAME_BYTES = WIDTH * HEIGHT * 3;
const EXPECTED_FRAMES = 300;
const STILL_FRAMES = [ 0, 30, 90, 150, 180, 240, 299 ];
const SHEET_SCALE = 4;
const CONTENT_LUMA = 14; // brighter than the ocean color, so "content" means land, lines, overlays or text
const BLANK_CONTENT_SHARE = 0.005;

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const out = join( root, 'out' );
const framesDir = join( out, 'frames' );
mkdirSync( framesDir, { recursive: true } );

// ---------- PNG writer (RGB, 8-bit) ----------
const CRC_TABLE = Array.from( { length: 256 }, ( _, n ) => {
  let c = n;
  for ( let k = 0; k < 8; k++ ) {
    c = c & 1 ? 0xedb88320 ^ ( c >>> 1 ) : c >>> 1;
  }
  return c >>> 0;
} );
const crc32 = ( buf: Buffer ) => {
  let c = 0xffffffff;
  for ( const byte of buf ) {
    c = CRC_TABLE[( c ^ byte ) & 0xff] ^ ( c >>> 8 );
  }
  return ( c ^ 0xffffffff ) >>> 0;
};
const chunk = ( type: string, data: Buffer ) => {
  const len = Buffer.alloc( 4 );
  len.writeUInt32BE( data.length );
  const body = Buffer.concat( [ Buffer.from( type ), data ] );
  const crc = Buffer.alloc( 4 );
  crc.writeUInt32BE( crc32( body ) );
  return Buffer.concat( [ len, body, crc ] );
};
function writePng( path: string, rgb: Buffer, width: number, height: number ) {
  const raw = Buffer.alloc( ( width * 3 + 1 ) * height );
  for ( let y = 0; y < height; y++ ) {
    raw[y * ( width * 3 + 1 )] = 0;
    rgb.copy( raw, y * ( width * 3 + 1 ) + 1, y * width * 3, ( y + 1 ) * width * 3 );
  }
  const header = Buffer.alloc( 13 );
  header.writeUInt32BE( width, 0 );
  header.writeUInt32BE( height, 4 );
  header.set( [ 8, 2, 0, 0, 0 ], 8 );
  writeFileSync( path, Buffer.concat( [
    Buffer.from( [ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ] ),
    chunk( 'IHDR', header ), chunk( 'IDAT', deflateSync( raw, { level: 6 } ) ), chunk( 'IEND', Buffer.alloc( 0 ) )
  ] ) );
}

function downscale( rgb: Buffer, factor: number ): Buffer {
  const w = WIDTH / factor;
  const h = HEIGHT / factor;
  const small = Buffer.alloc( w * h * 3 );
  for ( let y = 0; y < h; y++ ) {
    for ( let x = 0; x < w; x++ ) {
      for ( let c = 0; c < 3; c++ ) {
        let sum = 0;
        for ( let dy = 0; dy < factor; dy++ ) {
          for ( let dx = 0; dx < factor; dx++ ) {
            sum += rgb[( ( y * factor + dy ) * WIDTH + x * factor + dx ) * 3 + c];
          }
        }
        small[( y * w + x ) * 3 + c] = Math.round( sum / ( factor * factor ) );
      }
    }
  }
  return small;
}

function contactSheet( path: string, rows: Buffer[][] ) {
  const w = WIDTH / SHEET_SCALE;
  const h = HEIGHT / SHEET_SCALE;
  const gap = 6;
  const cols = Math.max( ...rows.map( r => r.length ) );
  const sheetW = cols * w + ( cols + 1 ) * gap;
  const sheetH = rows.length * h + ( rows.length + 1 ) * gap;
  const sheet = Buffer.alloc( sheetW * sheetH * 3, 40 );
  rows.forEach( ( row, r ) => row.forEach( ( img, c ) => {
    for ( let y = 0; y < h; y++ ) {
      img.copy( sheet, ( ( gap + r * ( h + gap ) + y ) * sheetW + gap + c * ( w + gap ) ) * 3, y * w * 3, ( y + 1 ) * w * 3 );
    }
  } ) );
  writePng( path, sheet, sheetW, sheetH );
}

// ---------- decoding ----------
async function* decodeFrames( file: string ): AsyncGenerator<Buffer> {
  const child = spawn( 'npx', [ 'remotion', 'ffmpeg', '-v', 'error', '-i', file, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgb24', '-' ], { cwd: root } );
  const stream: Readable = child.stdout;
  const chunks: Buffer[] = [];
  let buffered = 0;
  let ended = false;
  let wake: ( () => void ) | null = null;
  const notify = () => {
    wake?.();
    wake = null;
  };
  stream.on( 'data', ( data: Buffer ) => {
    chunks.push( data );
    buffered += data.length;
    if ( buffered >= 2 * FRAME_BYTES ) {
      stream.pause(); // backpressure: keep at most ~2 decoded frames in memory
    }
    notify();
  } );
  stream.on( 'end', () => {
    ended = true;
    notify();
  } );
  for ( ;; ) {
    if ( buffered >= FRAME_BYTES ) {
      const frame = Buffer.alloc( FRAME_BYTES );
      let filled = 0;
      while ( filled < FRAME_BYTES ) {
        const head = chunks[0];
        const take = Math.min( head.length, FRAME_BYTES - filled );
        head.copy( frame, filled, 0, take );
        filled += take;
        if ( take === head.length ) {
          chunks.shift();
        } else {
          chunks[0] = head.subarray( take );
        }
      }
      buffered -= FRAME_BYTES;
      if ( buffered < 2 * FRAME_BYTES ) {
        stream.resume();
      }
      yield frame;
      continue;
    }
    if ( ended ) {
      return;
    }
    await new Promise<void>( resolve => {
      wake = resolve;
    } );
  }
}

const luma = ( f: Buffer, i: number ) => 0.2126 * f[i] + 0.7152 * f[i + 1] + 0.0722 * f[i + 2];

function frameStats( f: Buffer, previous: Buffer | null ) {
  let content = 0;
  let sum = 0;
  let diff = 0;
  let samples = 0;
  for ( let i = 0; i < FRAME_BYTES; i += 3 * 7 ) { // every 7th pixel
    const l = luma( f, i );
    sum += l;
    if ( l > CONTENT_LUMA ) {
      content++;
    }
    if ( previous ) {
      diff += Math.abs( l - luma( previous, i ) );
    }
    samples++;
  }
  return { meanLuma: sum / samples, contentShare: content / samples, meanAbsDiff: previous ? diff / samples : 0 };
}

function psnr( a: Buffer, b: Buffer ): number {
  let se = 0;
  for ( let i = 0; i < FRAME_BYTES; i++ ) {
    const d = a[i] - b[i];
    se += d * d;
  }
  const mse = se / FRAME_BYTES;
  return mse === 0 ? Infinity : 10 * Math.log10( ( 255 * 255 ) / mse );
}

// ---------- per-render checks ----------
type Diag = { frame: number; waitMs: number; ready: boolean; contextLost: boolean; errors: string[]; camera: unknown; appliedCenter: number[]; appliedZoom: number; marker: number[]; markerDriftPx: number; roundTripErrorDeg: number };

function readDiagnostics( name: string ): Diag[] {
  const log = join( out, `${name}.log` );
  if ( !existsSync( log ) ) {
    return [];
  }
  const byFrame = new Map<number, Diag>();
  for ( const line of readFileSync( log, 'utf8' ).split( '\n' ) ) {
    const at = line.indexOf( 'MAPDIAG ' );
    if ( at >= 0 ) {
      const d = JSON.parse( line.slice( at + 8 ) ) as Diag;
      byFrame.set( d.frame, d ); // a frame rendered twice (e.g. retried) keeps its last diagnostics
    }
  }
  return [ ...byFrame.values() ].sort( ( a, b ) => a.frame - b.frame );
}

const percentile = ( values: number[], p: number ) => {
  const sorted = [ ...values ].sort( ( a, b ) => a - b );
  return sorted.length ? sorted[Math.min( sorted.length - 1, Math.floor( p * sorted.length ) )] : NaN;
};

function probe( file: string ) {
  const json = execFileSync( 'npx', [ 'remotion', 'ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_streams', '-show_format', '-of', 'json', file ], { cwd: root, encoding: 'utf8' } );
  const { streams, format } = JSON.parse( json );
  const s = streams[0];
  return { codec: s.codec_name, profile: s.profile, width: s.width, height: s.height, pixFmt: s.pix_fmt, frameRate: s.r_frame_rate, frames: Number( s.nb_read_frames ), durationS: Number( format.duration ), sizeMb: Number( format.size ) / 1e6 };
}

async function analyze( name: string ) {
  const file = join( out, `${name}.mp4` );
  const stream = probe( file );
  const dir = join( framesDir, name );
  mkdirSync( dir, { recursive: true } );
  const md5: string[] = [];
  const stats: ReturnType<typeof frameStats>[] = [];
  const sheet: Buffer[] = [];
  let previous: Buffer | null = null;
  let index = 0;
  for await ( const frame of decodeFrames( file ) ) {
    md5.push( createHash( 'md5' ).update( frame ).digest( 'hex' ) );
    stats.push( frameStats( frame, previous ) );
    if ( STILL_FRAMES.includes( index ) ) {
      writePng( join( dir, `frame-${String( index ).padStart( 3, '0' )}.png` ), frame, WIDTH, HEIGHT );
      sheet.push( downscale( frame, SHEET_SCALE ) );
    }
    previous = frame;
    index++;
  }
  const diffs = stats.slice( 1 ).map( s => s.meanAbsDiff );
  const medianDiff = percentile( diffs, 0.5 );
  const popThreshold = Math.max( 8, 6 * medianDiff );
  const blankFrames = stats.flatMap( ( s, i ) => s.contentShare < BLANK_CONTENT_SHARE ? [ i ] : [] );
  const popFrames = stats.flatMap( ( s, i ) => i > 0 && s.meanAbsDiff > popThreshold ? [ i ] : [] );

  const diag = readDiagnostics( name );
  const waits = diag.map( d => d.waitMs );
  const metricsPath = join( out, `${name}.metrics.json` );
  const metrics = existsSync( metricsPath ) ? JSON.parse( readFileSync( metricsPath, 'utf8' ) ) : null;
  return {
    name,
    stream,
    decodedFrames: index,
    md5,
    blankFrames,
    popFrames,
    maxMeanAbsDiff: Math.max( ...diffs ),
    medianMeanAbsDiff: medianDiff,
    minContentShare: Math.min( ...stats.map( s => s.contentShare ) ),
    sheet,
    diagnostics: {
      frames: diag.length,
      notReady: diag.filter( d => !d.ready ).length,
      withErrors: diag.filter( d => d.errors.length > 0 ).length,
      contextLost: diag.filter( d => d.contextLost ).length,
      waitP50: percentile( waits, 0.5 ),
      waitP95: percentile( waits, 0.95 ),
      waitMax: Math.max( ...waits ),
      maxMarkerDriftPx: Math.max( ...diag.map( d => d.markerDriftPx ) ),
      maxRoundTripErrorDeg: Math.max( ...diag.map( d => d.roundTripErrorDeg ) ),
      cameraTrace: diag.map( d => JSON.stringify( [ d.camera, d.appliedCenter, d.appliedZoom, d.marker ] ) )
    },
    metrics
  };
}

async function comparePair( a: string, b: string ) {
  const psnrs: number[] = [];
  const left = decodeFrames( join( out, `${a}.mp4` ) );
  const right = decodeFrames( join( out, `${b}.mp4` ) );
  for ( ;; ) {
    const [ x, y ] = await Promise.all( [ left.next(), right.next() ] );
    if ( x.done || y.done ) {
      break;
    }
    psnrs.push( psnr( x.value, y.value ) );
  }
  const finite = psnrs.filter( Number.isFinite );
  return {
    a, b,
    frames: psnrs.length,
    identicalFrames: psnrs.filter( p => p === Infinity ).length,
    minPsnr: psnrs.length ? Math.min( ...psnrs ) : NaN,
    meanFinitePsnr: finite.length ? finite.reduce( ( s, p ) => s + p, 0 ) / finite.length : Infinity,
    worstFrame: psnrs.indexOf( Math.min( ...psnrs ) )
  };
}

// ---------- main ----------
const names = readdirSync( out ).filter( f => f.endsWith( '.mp4' ) ).map( f => f.replace( /\.mp4$/, '' ) ).sort();
const results = [];
for ( const name of names ) {
  console.log( `analyzing ${name}` );
  results.push( await analyze( name ) );
}
const byName = new Map( results.map( r => [ r.name, r ] ) );

const pairs: Array<[ string, string, string ]> = [];
for ( const event of [ 'noto', 'kamchatka' ] ) {
  for ( const gl of [ 'angle', 'swangle' ] ) {
    pairs.push( [ 'repeat', `${event}-local-${gl}-1`, `${event}-local-${gl}-2` ] );
  }
  pairs.push( [ 'gl-mode', `${event}-local-angle-1`, `${event}-local-swangle-1` ] );
}
const comparisons = [];
for ( const [ kind, a, b ] of pairs ) {
  if ( byName.has( a ) && byName.has( b ) ) {
    console.log( `comparing ${a} vs ${b}` );
    const cmp = await comparePair( a, b );
    const traceA = byName.get( a )!.diagnostics.cameraTrace;
    const traceB = byName.get( b )!.diagnostics.cameraTrace;
    comparisons.push( { kind, ...cmp, md5IdenticalFrames: byName.get( a )!.md5.filter( ( h, i ) => h === byName.get( b )!.md5[i] ).length, cameraTraceIdentical: traceA.length === traceB.length && traceA.every( ( t, i ) => t === traceB[i] ) } );
  }
}

for ( const event of [ 'noto', 'kamchatka' ] ) {
  const rows = [ 'local-angle-1', 'local-swangle-1', 'remote-angle-1' ].map( v => byName.get( `${event}-${v}` )?.sheet ).filter( Boolean ) as Buffer[][];
  if ( rows.length ) {
    contactSheet( join( framesDir, `${event}-contact-sheet.png` ), rows );
  }
}

// ---------- report ----------
const fmt = ( n: number, d = 0 ) => Number.isFinite( n ) ? n.toFixed( d ) : '∞';
const rowsMd = results.map( r => {
  const s = r.stream;
  const streamOk = s.codec === 'h264' && s.width === 1080 && s.height === 1920 && s.frameRate === '30/1' && s.frames === EXPECTED_FRAMES && r.decodedFrames === EXPECTED_FRAMES;
  const d = r.diagnostics;
  const stable = d.frames === EXPECTED_FRAMES && d.notReady === 0 && d.withErrors === 0 && d.contextLost === 0 && r.blankFrames.length === 0;
  const m = r.metrics;
  return `| ${r.name} | ${streamOk ? 'pass' : 'FAIL'} (${s.codec} ${s.width}×${s.height} ${s.frameRate} ${s.frames}f ${fmt( s.durationS, 2 )}s) | ${stable ? 'pass' : 'FAIL'} | ${d.frames}/${d.notReady}/${d.withErrors}/${d.contextLost} | ${r.blankFrames.length} | ${r.popFrames.length ? r.popFrames.join( ',' ) : 'none'} | ${fmt( d.waitP50 )}/${fmt( d.waitP95 )}/${fmt( d.waitMax )} | ${fmt( d.maxMarkerDriftPx, 3 )} | ${m ? fmt( m.wallMs / 1000, 1 ) : '-'} | ${m ? fmt( m.wallMs / EXPECTED_FRAMES ) : '-'} | ${m ? m.peakTreeRssMb : '-'} |`;
} );
const cmpMd = comparisons.map( c => `| ${c.kind} | ${c.a} vs ${c.b} | ${c.frames} | ${c.md5IdenticalFrames} | ${fmt( c.minPsnr, 1 )} (frame ${c.worstFrame}) | ${fmt( c.meanFinitePsnr, 1 )} | ${c.cameraTraceIdentical ? 'yes' : 'no'} |` );

const report = `# M2.0 map spike — verification report

Generated by \`scripts/verify-render.ts\`. Stills: \`out/frames/<render>/frame-NNN.png\`; contact sheets: \`out/frames/<event>-contact-sheet.png\` (rows: local/angle, local/swangle, remote/angle; columns: frames ${STILL_FRAMES.join( ', ' )}).

## Renders

Columns: stream check; stability (all 300 frames ready, no map errors, no context loss, no blank frames); diagnostics frames/notReady/errors/contextLost; blank frames (content share < ${BLANK_CONTENT_SHARE * 100}%); pop/flash candidates (frame-to-frame difference > max(8, 6× median)); readiness wait p50/p95/max in ms (after applying each frame's camera); max marker drift in px between the rendered overlay and \`map.project(epicenter)\` after readiness; wall time (s); ms per frame (wall time / 300, concurrency 4); peak RSS of the whole render process tree (MB).

| Render | Stream | Stable | Diag f/nr/err/ctx | Blank | Pops | Wait p50/p95/max | Drift px | Wall s | ms/frame | Peak MB |
|---|---|---|---|---|---|---|---|---|---|---|
${rowsMd.join( '\n' )}

## Consistency

PSNR over full-resolution RGB per frame (∞ = bit-identical). "Camera trace" compares the logged camera, applied center/zoom and marker position for every frame.

| Kind | Renders | Frames | md5-identical | Min PSNR dB | Mean finite PSNR dB | Camera trace identical |
|---|---|---|---|---|---|---|
${cmpMd.join( '\n' )}
`;
writeFileSync( join( out, 'report.md' ), report );
writeFileSync( join( out, 'verification.json' ), JSON.stringify( { results: results.map( ( { md5: _m, sheet: _s, diagnostics: { cameraTrace: _c, ...diagnostics }, ...rest } ) => ( { ...rest, diagnostics } ) ), comparisons }, null, 2 ) );
console.log( report );
