/**
 * Simple luminance metrics for the terrain style review (M2.2b).
 *
 * For each map-only end-state still (frame 900) and style variant, reports mean luma and luma standard deviation in
 * fixed sample boxes: land, continental shelf and deep ocean for coastal targets, a relief box inland, and an open-ocean
 * box for the remote-ocean probe. Boxes sit outside the epicenter rings (radius up to about 470 px around 540, 665) and
 * the probe label, at the same pixels for every variant (identical cameras). Luma is Rec. 709 on 8-bit sRGB values.
 * PNGs are decoded with Remotion's bundled ffmpeg (image2pipe + rawvideo, as in verify-render.ts; no new dependencies).
 *
 * These numbers support the visual review; they do not replace it.
 *
 * Usage: tsx scripts/style-metrics.ts --dir=m2-2/b [variant ...]   (default: a1 b1-cool)
 * Writes out/<dir>/metrics.md and out/<dir>/metrics.json.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const WIDTH = 1080;
const HEIGHT = 1920;
type Box = [ x: number, y: number, w: number, h: number ];

/** Sample boxes per target, at the frame-900 camera. */
export const SAMPLE_BOXES: Record<string, Partial<Record<'land' | 'shelf' | 'deep' | 'inland' | 'ocean', Box>>> = {
  noto: { land: [ 180, 1310, 100, 80 ], shelf: [ 330, 1500, 100, 50 ], deep: [ 80, 1760, 180, 100 ] },
  kamchatka: { land: [ 60, 120, 200, 120 ], shelf: [ 60, 1060, 120, 70 ], deep: [ 700, 1700, 250, 150 ] },
  coastChile: { land: [ 750, 1300, 200, 150 ], shelf: [ 250, 1320, 100, 60 ], deep: [ 40, 1500, 150, 150 ] },
  highLatAlaska: { land: [ 850, 160, 200, 80 ], shelf: [ 300, 1450, 200, 100 ], deep: [ 700, 1650, 250, 150 ] },
  inlandMyanmar: { inland: [ 650, 1150, 250, 250 ] },
  remotePacific: { ocean: [ 100, 1200, 800, 500 ] }
};

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const dir = args.find( a => a.startsWith( '--dir=' ) )?.slice( 6 ) ?? 'm2-2/b';
const variants = args.filter( a => !a.startsWith( '--' ) );
const VARIANTS = variants.length > 0 ? variants : [ 'a1', 'b1-cool' ];

function decode( png: string ): Buffer {
  return execFileSync( 'npx', [ 'remotion', 'ffmpeg', '-loglevel', 'error', '-i', png, '-f', 'image2pipe', '-c:v', 'rawvideo', '-pix_fmt', 'rgb24', '-' ], { cwd: root, maxBuffer: WIDTH * HEIGHT * 3 + 1024 } );
}

function stats( rgb: Buffer, [ x0, y0, w, h ]: Box ) {
  let sum = 0;
  let sumSq = 0;
  for ( let y = y0; y < y0 + h; y++ ) {
    for ( let x = x0; x < x0 + w; x++ ) {
      const i = ( y * WIDTH + x ) * 3;
      const luma = 0.2126 * rgb[i] + 0.7152 * rgb[i + 1] + 0.0722 * rgb[i + 2];
      sum += luma;
      sumSq += luma * luma;
    }
  }
  const n = w * h;
  const mean = sum / n;
  return { mean: Number( mean.toFixed( 1 ) ), std: Number( Math.sqrt( Math.max( 0, sumSq / n - mean * mean ) ).toFixed( 2 ) ) };
}

type Result = Record<string, Record<string, Record<string, { mean: number; std: number }>>>;
const results: Result = {};
for ( const [ target, boxes ] of Object.entries( SAMPLE_BOXES ) ) {
  results[target] = {};
  for ( const variant of VARIANTS ) {
    const rgb = decode( join( root, 'out', dir, 'stills', `${target}-f900-${variant}.png` ) );
    results[target][variant] = Object.fromEntries( Object.entries( boxes ).map( ( [ name, box ] ) => [ name, stats( rgb, box! ) ] ) );
  }
}

const lines = [
  '# B1 style metrics (frame 900, map-only stills)', '',
  'Mean luma (0-255) and luma standard deviation in fixed sample boxes. Land - shelf > 0 means land reads lighter than the shelf.', '',
  '## Land / shelf / deep ocean', '',
  `| Target | Variant | Land | Shelf | Deep | Land - shelf | Shelf - deep |`,
  '|---|---|---|---|---|---|---|'
];
for ( const target of [ 'noto', 'kamchatka', 'coastChile', 'highLatAlaska' ] ) {
  for ( const variant of VARIANTS ) {
    const r = results[target][variant];
    lines.push( `| ${target} | ${variant} | ${r.land.mean} | ${r.shelf.mean} | ${r.deep.mean} | ${( r.land.mean - r.shelf.mean ).toFixed( 1 )} | ${( r.shelf.mean - r.deep.mean ).toFixed( 1 )} |` );
  }
}
lines.push( '', '## Inland relief (Myanmar probe) and open ocean (Pacific probe)', '', '| Variant | Inland mean | Inland std (relief texture) | Open-ocean mean | Open-ocean std (streaks, texture) |', '|---|---|---|---|---|' );
for ( const variant of VARIANTS ) {
  const inland = results.inlandMyanmar[variant].inland;
  const ocean = results.remotePacific[variant].ocean;
  lines.push( `| ${variant} | ${inland.mean} | ${inland.std} | ${ocean.mean} | ${ocean.std} |` );
}
lines.push( '', 'Boxes (x, y, w, h at 1080x1920):', '', ...Object.entries( SAMPLE_BOXES ).map( ( [ t, b ] ) => `- ${t}: ${Object.entries( b ).map( ( [ n, box ] ) => `${n} ${JSON.stringify( box )}` ).join( '; ' )}` ) );

writeFileSync( join( root, 'out', dir, 'metrics.md' ), lines.join( '\n' ) + '\n' );
writeFileSync( join( root, 'out', dir, 'metrics.json' ), JSON.stringify( results, null, 2 ) );
console.log( lines.join( '\n' ) );
