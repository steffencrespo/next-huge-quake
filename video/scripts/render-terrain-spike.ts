/**
 * Renders the M2.2a terrain spike evidence into out/m2-2/a/ (gitignored). Run scripts/prepare-terrain.ts first.
 *
 * - stills:  map-only PNG stills rendered directly (no MP4 compression; one-frame PNG sequences with verbose logs) through the same TerrainSpike composition for
 *            both styles ('m21' and 'terrain') at identical frames and camera states, for every fixture and probe,
 *            plus phone-size (360x640) copies and 2x coast close-ups of the end state.
 * - videos:  full 35 s news videos with the terrain map (scenes included) for Noto and Kamchatka, plus a Noto repeat
 *            for determinism, with logs (MAPDIAG and TILEREQ lines) and metrics.
 * - page:    a local comparison page, out/m2-2/a/index.html (not published anywhere).
 *
 * Usage: tsx scripts/render-terrain-spike.ts [--stills] [--videos] [--page]   (default: all three)
 *   --offline-sandbox   run every Remotion process under sandbox-exec with outbound network denied except localhost
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pad3, runMeasured } from './lib/render-process.js';
import { PROBE_FRAMES, SPIKE_FIXTURES, SPIKE_PROBES, STILL_FRAMES } from './lib/terrain-targets.js';
import { bundle, npxCommand, renderMapStill, stillDirs } from './lib/terrain-stills.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const out = join( root, 'out', 'm2-2', 'a' );
const dirs = stillDirs( out );
const stillsDir = dirs.stills;
const cropDir = dirs.coast;
const bundleDir = join( out, 'bundle' );

const args = process.argv.slice( 2 );
const all = ![ '--stills', '--videos', '--page' ].some( a => args.includes( a ) );
const sandboxed = args.includes( '--offline-sandbox' );
const npx = ( argv: string[] ) => npxCommand( argv, sandboxed );
const STYLES = [ 'm21', 'terrain' ] as const;

function renderStills() {
  bundle( root, bundleDir, sandboxed );
  const jobs = [
    ...SPIKE_FIXTURES.flatMap( fixture => STILL_FRAMES.map( frame => ( { name: fixture, props: { fixture }, frame } ) ) ),
    ...SPIKE_PROBES.flatMap( probe => PROBE_FRAMES.map( frame => ( { name: probe, props: { probe }, frame } ) ) )
  ];
  for ( const job of jobs ) {
    for ( const style of STYLES ) {
      renderMapStill( root, bundleDir, dirs, sandboxed, `${job.name}-f${pad3( job.frame )}-${style}.png`, job.frame, { ...job.props, style, chrome: false } );
    }
  }
}

async function renderVideos() {
  const jobs = [
    { name: 'terrain-noto', fixture: 'noto' },
    { name: 'terrain-kamchatka', fixture: 'kamchatka' },
    { name: 'terrain-noto-2', fixture: 'noto' }
  ];
  for ( const job of jobs ) {
    const props = JSON.stringify( { fixture: job.fixture, style: 'terrain', chrome: true } );
    const [ cmd, argv ] = npx( [ 'remotion', 'render', 'TerrainSpike', join( out, `${job.name}.mp4` ), '--gl=angle', `--props=${props}`, '--log=verbose', '--overwrite' ] );
    const result = await runMeasured( argv, root, join( out, `${job.name}.log` ), cmd );
    const metrics = { name: job.name, fixture: job.fixture, style: 'terrain', gl: 'angle', frames: 1050, concurrency: 4, sandboxed, ...result };
    writeFileSync( join( out, `${job.name}.metrics.json` ), JSON.stringify( metrics, null, 2 ) );
    console.log( JSON.stringify( metrics ) );
    if ( result.exitCode !== 0 ) {
      throw new Error( `${job.name} failed; see out/m2-2/a/${job.name}.log` );
    }
  }
}

function writePage() {
  const stills = readdirSync( stillsDir ).filter( f => f.endsWith( '-terrain.png' ) ).sort();
  const pair = ( file: string, dir: string ) => {
    const base = file.replace( /-terrain\.png$/, '' );
    return `<figure><div class="pair"><img src="${dir}${base}-m21.png" alt="M2.1"><img src="${dir}${base}-terrain.png" alt="terrain"></div><figcaption>${base} · left M2.1 · right terrain</figcaption></figure>`;
  };
  const section = ( title: string, files: string[], dir = 'stills/' ) => `<h2>${title}</h2><div class="grid">${files.map( f => pair( f, dir ) ).join( '' )}</div>`;
  const fixtures = stills.filter( f => SPIKE_FIXTURES.some( k => f.startsWith( `${k}-` ) ) );
  const probes = stills.filter( f => SPIKE_PROBES.some( k => f.startsWith( `${k}-` ) ) );
  const crops = existsSync( cropDir ) ? readdirSync( cropDir ).filter( f => f.endsWith( '-terrain.png' ) ).sort() : [];
  const videos = [ 'terrain-noto', 'terrain-kamchatka' ].filter( v => existsSync( join( out, `${v}.mp4` ) ) );
  const report = existsSync( join( out, 'report.md' ) ) ? readFileSync( join( out, 'report.md' ), 'utf8' ) : '';
  const escape = ( s: string ) => s.replace( /&/g, '&amp;' ).replace( /</g, '&lt;' );
  writeFileSync( join( out, 'index.html' ), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>M2.2a Terrain Spike</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; padding: 24px 16px 64px; background: #070B14; color: #E6ECF3; font: 15px/1.5 -apple-system, system-ui, sans-serif; }
h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 17px; margin: 32px 0 12px; color: #CBD3DF; }
p { color: #CBD3DF; max-width: 72ch; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.pair img, video { width: 100%; display: block; border-radius: 4px; background: #000; }
figure { margin: 0; } figcaption { font-size: 13px; color: #9AA7B8; margin-top: 4px; }
.videos { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 360px)); gap: 16px; }
pre { white-space: pre-wrap; background: #0E1522; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; }
</style></head><body>
<h1>M2.2a Terrain Spike, Gate A review</h1>
<p>Local review page (not published). Map-only stills are rendered directly as PNG through the same TerrainSpike composition for both styles, at identical frames and camera states. Probes are camera positions only, not earthquakes.</p>
<h2>Full videos with the terrain map</h2>
<div class="videos">${videos.map( v => `<figure><video src="${v}.mp4" controls preload="metadata"></video><figcaption>${v}.mp4</figcaption></figure>` ).join( '' )}</div>
${section( 'Fixtures along the camera path (M2.1 vs terrain)', fixtures )}
${section( 'Coast close-ups at the end state (2x)', crops, 'stills/coast/' )}
${section( 'Probes (camera positions only, not events)', probes )}
<h2>Report</h2><pre>${escape( report )}</pre>
</body></html>
` );
  console.log( `wrote ${join( out, 'index.html' )}` );
}

if ( all || args.includes( '--stills' ) ) {
  renderStills();
}
if ( all || args.includes( '--videos' ) ) {
  await renderVideos();
}
if ( all || args.includes( '--page' ) ) {
  writePage();
}
