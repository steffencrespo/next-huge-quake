/**
 * M2.2b review renders into out/m2-2/b/ (gitignored). Run scripts/prepare-terrain.ts first (no new tiles are needed
 * for M2.2b: same source, same selection).
 *
 * - stills: map-only PNG stills rendered directly through TerrainSpike for 'a1' (the Gate A baseline) and 'b1-cool'
 *   (the chosen palette) at identical frames and camera states: Noto and Kamchatka at frames 120, 165 and 900, every
 *   probe at 900. Phone-size copies and 2x coast close-ups. (Checkpoint B1 also rendered the dropped 'b1-neutral'.)
 * - videos: full 35 s news videos with the b1-cool terrain map and terrain credits (Noto, Kamchatka, and a Noto
 *   repeat for determinism), with logs (MAPDIAG, TILEREQ) and metrics; frames with scenes at fixed times, next to the
 *   M2.1 baseline at the same frames; and credits.txt, the complete attribution for a video description.
 * - page: out/m2-2/b/index.html, a local comparison page (not published anywhere).
 *
 * Usage: tsx scripts/render-terrain-b.ts [--stills] [--videos] [--page] [--offline-sandbox]   (default: all three)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fullCredits } from '../src/copy/credits.js';
import { pad3, runMeasured, saveFrame } from './lib/render-process.js';
import { SPIKE_FIXTURES, SPIKE_PROBES } from './lib/terrain-targets.js';
import { bundle, npxCommand, renderMapStill, stillDirs } from './lib/terrain-stills.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const out = join( root, 'out', 'm2-2', 'b' );
const dirs = stillDirs( out );
const bundleDir = join( out, 'bundle' );
const framesDir = join( out, 'video-frames' );
const args = process.argv.slice( 2 );
const all = ![ '--stills', '--videos', '--page' ].some( a => args.includes( a ) );
const sandboxed = args.includes( '--offline-sandbox' );

const VARIANTS = [ 'a1', 'b1-cool' ] as const;
const CHOSEN = 'b1-cool';
const FIXTURE_FRAMES = [ 120, 165, 900 ];
const JOBS = [
  ...SPIKE_FIXTURES.flatMap( fixture => FIXTURE_FRAMES.map( frame => ( { name: fixture, props: { fixture }, frame } ) ) ),
  ...SPIKE_PROBES.map( probe => ( { name: probe, props: { probe }, frame: 900 } ) )
];
const VIDEOS = [
  { name: 'terrain-noto', fixture: 'noto' },
  { name: 'terrain-kamchatka', fixture: 'kamchatka' },
  { name: 'terrain-noto-2', fixture: 'noto' }
];
/** Frames with scenes: hook arrival, facts, context, closing (start and final). */
const VIDEO_FRAMES = [ { frame: 150, label: 'hook-arrival' }, { frame: 420, label: 'facts' }, { frame: 700, label: 'context' }, { frame: 930, label: 'closing-entering' }, { frame: 1049, label: 'closing-final' } ];
const fileOf = ( name: string, frame: number, variant: string ) => `${name}-f${pad3( frame )}-${variant}.png`;

function renderStills() {
  bundle( root, bundleDir, sandboxed );
  for ( const job of JOBS ) {
    for ( const variant of VARIANTS ) {
      renderMapStill( root, bundleDir, dirs, sandboxed, fileOf( job.name, job.frame, variant ), job.frame, { ...job.props, style: 'terrain', variant, chrome: false } );
    }
  }
}

async function renderVideos() {
  mkdirSync( join( framesDir, 'phone' ), { recursive: true } );
  for ( const job of VIDEOS ) {
    const props = JSON.stringify( { fixture: job.fixture, style: 'terrain', variant: CHOSEN, chrome: true } );
    const [ cmd, argv ] = npxCommand( [ 'remotion', 'render', 'TerrainSpike', join( out, `${job.name}.mp4` ), '--gl=angle', `--props=${props}`, '--log=verbose', '--overwrite' ], sandboxed );
    const result = await runMeasured( argv, root, join( out, `${job.name}.log` ), cmd );
    const metrics = { name: job.name, fixture: job.fixture, style: `terrain-${CHOSEN}`, gl: 'angle', frames: 1050, concurrency: 4, sandboxed, ...result };
    writeFileSync( join( out, `${job.name}.metrics.json` ), JSON.stringify( metrics, null, 2 ) );
    console.log( JSON.stringify( metrics ) );
    if ( result.exitCode !== 0 ) {
      throw new Error( `${job.name} failed; see out/m2-2/b/${job.name}.log` );
    }
  }
  for ( const fixture of SPIKE_FIXTURES ) {
    for ( const { frame, label } of VIDEO_FRAMES ) {
      const name = `f${pad3( frame )}-${label}.png`;
      saveFrame( root, join( out, `terrain-${fixture}.mp4` ), frame, 30, join( framesDir, `${fixture}-b2-${name}` ), join( framesDir, 'phone', `${fixture}-b2-${name}` ) );
      saveFrame( root, join( root, 'out', 'm2-2', 'a', 'baseline', `${fixture}.mp4` ), frame, 30, join( framesDir, `${fixture}-m21-${name}` ), join( framesDir, 'phone', `${fixture}-m21-${name}` ) );
    }
  }
  writeFileSync( join( out, 'credits.txt' ), `${fullCredits( 'terrain' )}\n` );
  console.log( 'wrote out/m2-2/b/credits.txt' );
}

function writePage() {
  const escape = ( s: string ) => s.replace( /&/g, '&amp;' ).replace( /</g, '&lt;' );
  const pair = ( left: string, right: string, leftLabel: string, rightLabel: string, caption: string ) =>
    `<figure><div class="pair"><div><img src="${left}" alt="${leftLabel}" loading="lazy"><span>${leftLabel}</span></div><div><img src="${right}" alt="${rightLabel}" loading="lazy"><span>${rightLabel}</span></div></div><figcaption>${caption}</figcaption></figure>`;
  const stillPair = ( name: string, frame: number, dir: string ) => pair( `${dir}${fileOf( name, frame, 'a1' )}`, `${dir}${fileOf( name, frame, CHOSEN )}`, 'a1 (Gate A)', `${CHOSEN} (M2.2b)`, `${name} · frame ${frame}` );
  const read = ( file: string, fallback: string ) => existsSync( join( out, file ) ) ? readFileSync( join( out, file ), 'utf8' ) : fallback;
  const videos = VIDEOS.slice( 0, 2 ).filter( v => existsSync( join( out, `${v.name}.mp4` ) ) );
  const scenes = SPIKE_FIXTURES.flatMap( fixture => VIDEO_FRAMES.map( ( { frame, label } ) => {
    const name = `f${pad3( frame )}-${label}.png`;
    return pair( `video-frames/phone/${fixture}-m21-${name}`, `video-frames/phone/${fixture}-b2-${name}`, 'M2.1 (production)', `${CHOSEN} + terrain credits`, `${fixture} · ${label} (frame ${frame}) · phone size` );
  } ) );
  writeFileSync( join( out, 'index.html' ), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>M2.2b Gate B</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; padding: 24px 16px 64px; background: #070B14; color: #E6ECF3; font: 15px/1.5 -apple-system, system-ui, sans-serif; }
h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 17px; margin: 32px 0 12px; color: #CBD3DF; }
p { color: #CBD3DF; max-width: 80ch; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.pair img, video { width: 100%; display: block; border-radius: 4px; background: #000; }
.pair span { display: block; font-size: 12px; color: #9AA7B8; text-align: center; margin-top: 2px; }
.videos { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 360px)); gap: 16px; }
figure { margin: 0; } figcaption { font-size: 13px; color: #CBD3DF; margin-top: 4px; }
pre { white-space: pre-wrap; background: #0E1522; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; }
</style></head><body>
<h1>M2.2b Gate B: style polish and terrain attribution</h1>
<p>Local review page (not published). Map-only stills are rendered directly as PNG through the same TerrainSpike composition at identical frames and camera states. Scene frames come from the M2.1 baseline video and the M2.2b video at the same frame numbers. Probes are camera positions only, not earthquakes. Click an image to open it at full size.</p>
<h2>Full videos (b1-cool terrain, terrain credits)</h2>
<div class="videos">${videos.map( v => `<figure><video src="${v.name}.mp4" controls preload="metadata"></video><figcaption>${v.name}.mp4</figcaption></figure>` ).join( '' )}</div>
<h2>With scenes: M2.1 production vs M2.2b</h2><div class="grid">${scenes.join( '' )}</div>
<h2>Map only: a1 (Gate A) vs ${CHOSEN}</h2><div class="grid">${JOBS.map( j => stillPair( j.name, j.frame, 'stills/' ) ).join( '' )}</div>
<h2>Coast close-ups at the end state (2x)</h2><div class="grid">${JOBS.filter( j => j.frame === 900 ).map( j => stillPair( j.name, 900, 'stills/coast/' ) ).join( '' )}</div>
<h2>Complete attribution (credits.txt, for the video description)</h2><pre>${escape( read( 'credits.txt', '(render videos first)' ) )}</pre>
<h2>Metrics</h2><pre>${escape( read( 'metrics.md', '(run scripts/style-metrics.ts)' ) )}</pre>
<h2>Report</h2><pre>${escape( read( 'report.md', '' ) )}</pre>
<script>document.querySelectorAll('img').forEach(i => i.addEventListener('click', () => window.open(i.src)));</script>
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
