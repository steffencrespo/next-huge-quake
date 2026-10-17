/**
 * M2.2c checkpoint C1 renders into out/m2-2/c/ (gitignored): map-only, b1-cool terrain, geographic labels.
 *
 * - plans:   the label selection for every target, camera (hold / original) and exclusion radius, computed with the
 *            same pure function and data the render uses (plans/*.json, selection.md with chosen and rejected labels).
 * - stills:  direct PNG renders. Labels with the camera hold at R = 240 for Noto and Kamchatka (frames 300, 600, 900)
 *            and the probes (900), each with a debug twin (allowed area, exclusion disk, estimated boxes); the original
 *            camera at the same frames (debug); and a radius sweep (R = 180 / 240 / 300, debug, frame 900).
 * - videos:  map-only Noto and Kamchatka with the camera hold and with the original camera (labels at R = 240), to
 *            compare motion; their logs feed scripts/check-labels.ts.
 * - check:   scripts/check-labels.ts over every render log (videos and stills), summarised in check-labels.md.
 * - page:    out/m2-2/c/index.html (local only).
 *
 * Usage: tsx scripts/render-terrain-c.ts [--plans] [--stills] [--videos] [--check] [--page] [--offline-sandbox]
 *        (default: all)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { LabelData } from '../src/map/labels/data.js';
import { LABEL_FRAMES, selectLabels } from '../src/map/labels/selectLabels.js';
import type { LabelPlan } from '../src/map/labels/selectLabels.js';
import { HOLD_CAMERA, newsCameraAt } from '../src/map/newsCamera.js';
import { pad3, runMeasured } from './lib/render-process.js';
import { SPIKE_FIXTURES, SPIKE_PROBES, terrainTarget } from './lib/terrain-targets.js';
import { bundle, npxCommand, renderMapStill, stillDirs } from './lib/terrain-stills.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const out = join( root, 'out', 'm2-2', 'c' );
const dirs = stillDirs( out );
const plansDir = join( out, 'plans' );
mkdirSync( plansDir, { recursive: true } );
const bundleDir = join( out, 'bundle' );
const args = process.argv.slice( 2 );
const all = ![ '--plans', '--stills', '--videos', '--check', '--page' ].some( a => args.includes( a ) );
const sandboxed = args.includes( '--offline-sandbox' );

const TARGETS = [ ...SPIKE_FIXTURES, ...SPIKE_PROBES ];
const RADII = [ 180, 240, 300 ];
const CAMERAS = [ 'hold', 'original' ] as const;
type Camera = typeof CAMERAS[number];
const BASE = { style: 'terrain', variant: 'b1-cool', chrome: false };
const targetProps = ( name: string ) => ( SPIKE_FIXTURES.includes( name as never ) ? { fixture: name } : { probe: name } );
const planKey = ( name: string, camera: Camera, radius: number ) => `${name}-${camera}-r${radius}`;

function computePlans() {
  const data = JSON.parse( readFileSync( join( root, 'public', 'geo', 'labels.json' ), 'utf8' ) ) as LabelData;
  const rows: string[] = [
    '# C1 label selection', '',
    'Selection on every frame from 300 to 900 (step 50), allowed area x 72-930, y 450-880, margin 16 px, gap 24 px. A label is kept only if it passes on every frame.', '',
    '## Availability by exclusion radius and camera', '',
    '| Target | Camera | R = 180 | R = 240 | R = 300 |', '|---|---|---|---|---|'
  ];
  const details: string[] = [ '', '## Chosen and rejected (camera hold, R = 240)', '' ];
  for ( const name of TARGETS ) {
    const { target } = terrainTarget( name );
    for ( const camera of CAMERAS ) {
      const cells = RADII.map( radius => {
        const plan = selectLabels( {
          epicenter: [ target.longitude, target.latitude ],
          cameraAt: f => newsCameraAt( f, target, camera === 'hold' ? HOLD_CAMERA : {} ),
          frames: LABEL_FRAMES,
          data,
          rules: { exclusionRadius: radius }
        } );
        writeFileSync( join( plansDir, `${planKey( name, camera, radius )}.json` ), JSON.stringify( plan, null, 2 ) );
        if ( camera === 'hold' && radius === 240 ) {
          details.push( `### ${name}`, '', `Epicenter: ${plan.epicenterCountry ?? `offshore (${plan.epicenterSea ?? 'no marine area'})`}`, '',
            ...plan.labels.map( l => `- **${l.kind}: ${l.lines.join( ' / ' )}** (${l.fontSize} px, ${l.align})` ),
            ...( plan.labels.length === 0 ? [ '- _(no label)_' ] : [] ),
            ...plan.rejected.filter( r => r.kind !== 'city' || !r.reason.startsWith( 'not eligible' ) ).slice( 0, 8 ).map( r => `- rejected ${r.kind} ${r.name}: ${r.reason}` ), '' );
        }
        return plan.labels.length === 0 ? '—' : plan.labels.map( l => `${l.kind}: ${l.name}` ).join( '<br>' );
      } );
      rows.push( `| ${name} | ${camera} | ${cells.join( ' | ' )} |` );
    }
  }
  writeFileSync( join( out, 'selection.md' ), [ ...rows, ...details ].join( '\n' ) + '\n' );
  console.log( 'wrote out/m2-2/c/selection.md and plans/' );
}

type StillJob = { file: string; frame: number; props: Record<string, unknown> };
function stillJobs(): StillJob[] {
  const jobs: StillJob[] = [];
  const add = ( name: string, frame: number, camera: Camera, radius: number, debug: boolean ) => jobs.push( {
    file: `${name}-f${pad3( frame )}-${camera}-r${radius}${debug ? '-debug' : ''}.png`,
    frame,
    props: { ...BASE, ...targetProps( name ), camera, labels: { exclusionRadius: radius, debug } }
  } );
  for ( const name of SPIKE_FIXTURES ) {
    for ( const frame of [ 300, 600, 900 ] ) {
      add( name, frame, 'hold', 240, false );
      add( name, frame, 'hold', 240, true );
      add( name, frame, 'original', 240, true );
    }
  }
  for ( const name of SPIKE_PROBES ) {
    add( name, 900, 'hold', 240, false );
  }
  for ( const name of TARGETS ) {
    for ( const radius of RADII ) {
      add( name, 900, 'hold', radius, true );
    }
  }
  return jobs.filter( ( j, i, a ) => a.findIndex( k => k.file === j.file ) === i );
}

function renderStills() {
  bundle( root, bundleDir, sandboxed );
  for ( const job of stillJobs() ) {
    renderMapStill( root, bundleDir, dirs, sandboxed, job.file, job.frame, job.props );
  }
}

async function renderVideos() {
  for ( const name of SPIKE_FIXTURES ) {
    for ( const camera of CAMERAS ) {
      const video = `${name}-${camera}-r240`;
      const props = JSON.stringify( { ...BASE, fixture: name, camera, labels: { exclusionRadius: 240 } } );
      const [ cmd, argv ] = npxCommand( [ 'remotion', 'render', 'TerrainSpike', join( out, `${video}.mp4` ), '--gl=angle', `--props=${props}`, '--log=verbose', '--overwrite' ], sandboxed );
      const result = await runMeasured( argv, root, join( out, `${video}.log` ), cmd );
      writeFileSync( join( out, `${video}.metrics.json` ), JSON.stringify( { name: video, frames: 1050, sandboxed, ...result }, null, 2 ) );
      console.log( JSON.stringify( { video, ...result } ) );
      if ( result.exitCode !== 0 ) {
        throw new Error( `${video} failed; see out/m2-2/c/${video}.log` );
      }
    }
  }
}

function checkLabels() {
  const pairs = SPIKE_FIXTURES.flatMap( n => CAMERAS.map( c => `${join( plansDir, `${planKey( n, c, 240 )}.json` )}=${join( out, `${n}-${c}-r240.log` )}` ) );
  for ( const file of readdirSync( dirs.logs ).sort() ) {
    const m = /^(.+)-f\d{3}-(hold|original)-r(\d+)(-debug)?\.log$/.exec( file );
    if ( m ) {
      pairs.push( `${join( plansDir, `${m[1]}-${m[2]}-r${m[3]}.json` )}=${join( dirs.logs, file )}` );
    }
  }
  const run = spawnSync( 'npx', [ 'tsx', 'scripts/check-labels.ts', `--out=${join( out, 'check-labels.json' )}`, ...pairs ], { cwd: root, encoding: 'utf8' } );
  const reports = JSON.parse( readFileSync( join( out, 'check-labels.json' ), 'utf8' ) ) as { log: string; labels: string[]; framesChecked: number; maxProjectionErrorPx: number; maxRenderedMinusEstimatePx: number | null; violations: string[] }[];
  const excess = reports.map( r => r.maxRenderedMinusEstimatePx ).filter( ( v ): v is number => v !== null );
  const lines = [
    '# C1 label check', '',
    `Result: **${run.status === 0 ? 'pass' : 'FAIL'}**. ${reports.length} render logs, ${reports.reduce( ( n, r ) => n + r.framesChecked, 0 )} labelled frames checked.`, '',
    `- Projection model vs MapLibre \`map.project\`: max error ${Math.max( ...reports.map( r => r.maxProjectionErrorPx ) ).toFixed( 2 )} px (limit 12 px)`,
    `- Rendered label size minus the deterministic estimate: max ${excess.length ? Math.max( ...excess ).toFixed( 1 ) : 'n/a'} px (must be <= 2 px; negative means the estimate is conservative)`,
    `- Rule violations (allowed area, exclusion disk, overlaps): ${reports.reduce( ( n, r ) => n + r.violations.length, 0 )}`, '',
    '| Render log | Labels | Frames | Max projection error (px) |', '|---|---|---|---|',
    ...reports.map( r => `| ${r.log.split( '/' ).pop()} | ${r.labels.join( ', ' ) || '—'} | ${r.framesChecked} | ${r.maxProjectionErrorPx} |` ),
    ...reports.flatMap( r => r.violations.slice( 0, 5 ).map( v => `- ${r.log.split( '/' ).pop()}: ${v}` ) )
  ];
  writeFileSync( join( out, 'check-labels.md' ), lines.join( '\n' ) + '\n' );
  console.log( lines.slice( 0, 6 ).join( '\n' ) );
  if ( run.status !== 0 ) {
    process.exitCode = 1;
  }
}

function writePage() {
  const escape = ( s: string ) => s.replace( /&/g, '&amp;' ).replace( /</g, '&lt;' );
  const read = ( file: string ) => ( existsSync( join( out, file ) ) ? readFileSync( join( out, file ), 'utf8' ) : '' );
  const img = ( file: string, caption: string ) => `<figure><img src="stills/${file}" alt="${caption}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
  const row = ( title: string, figures: string[] ) => `<h2>${title}</h2><div class="grid">${figures.join( '' )}</div>`;
  const videos = SPIKE_FIXTURES.flatMap( n => CAMERAS.map( c => `${n}-${c}-r240` ) ).filter( v => existsSync( join( out, `${v}.mp4` ) ) );
  writeFileSync( join( out, 'index.html' ), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>M2.2c C1 Labels</title>
<style>
:root { color-scheme: dark; }
body { margin: 0; padding: 24px 16px 64px; background: #070B14; color: #E6ECF3; font: 15px/1.5 -apple-system, system-ui, sans-serif; }
h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 17px; margin: 32px 0 12px; color: #CBD3DF; }
p { color: #CBD3DF; max-width: 80ch; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
img, video { width: 100%; display: block; border-radius: 4px; background: #000; }
.videos { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 300px)); gap: 16px; }
figure { margin: 0; } figcaption { font-size: 12px; color: #9AA7B8; margin-top: 4px; }
pre { white-space: pre-wrap; background: #0E1522; padding: 16px; border-radius: 6px; font-size: 13px; overflow-x: auto; }
</style></head><body>
<h1>M2.2c checkpoint C1: geographic labels</h1>
<p>Local review page (not published). Map-only renders with the b1-cool terrain. Debug stills show the allowed area (cyan), the exclusion disk (red) and each label's estimated box (yellow). Probes are camera positions only, not earthquakes. Click an image to open it at full size.</p>
<h2>Camera comparison (map-only videos, labels at R = 240)</h2>
<div class="videos">${videos.map( v => `<figure><video src="${v}.mp4" controls preload="metadata"></video><figcaption>${v}.mp4</figcaption></figure>` ).join( '' )}</div>
${SPIKE_FIXTURES.map( n => row( `${n}: camera hold vs original camera (frames 300, 600, 900)`, [ 300, 600, 900 ].flatMap( f => [
    img( `${n}-f${pad3( f )}-hold-r240.png`, `hold · f${f}` ),
    img( `${n}-f${pad3( f )}-hold-r240-debug.png`, `hold · f${f} · debug` ),
    img( `${n}-f${pad3( f )}-original-r240-debug.png`, `original · f${f} · debug` )
  ] ) ) ).join( '' )}
${row( 'Probes at the end state (camera hold, R = 240)', SPIKE_PROBES.map( p => img( `${p}-f900-hold-r240.png`, p ) ) )}
${TARGETS.map( t => row( `Exclusion radius sweep: ${t} (frame 900, camera hold)`, RADII.map( r => img( `${t}-f900-hold-r${r}-debug.png`, `R = ${r}` ) ) ) ).join( '' )}
<h2>Selection</h2><pre>${escape( read( 'selection.md' ) )}</pre>
<h2>Label check</h2><pre>${escape( read( 'check-labels.md' ) )}</pre>
<h2>Report</h2><pre>${escape( read( 'report.md' ) )}</pre>
<script>document.querySelectorAll('img').forEach(i => i.addEventListener('click', () => window.open(i.src)));</script>
</body></html>
` );
  console.log( `wrote ${join( out, 'index.html' )}` );
}

if ( all || args.includes( '--plans' ) ) {
  computePlans();
}
if ( all || args.includes( '--stills' ) ) {
  renderStills();
}
if ( all || args.includes( '--videos' ) ) {
  await renderVideos();
}
if ( all || args.includes( '--check' ) ) {
  checkLabels();
}
if ( all || args.includes( '--page' ) ) {
  writePage();
}
