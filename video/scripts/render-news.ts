/**
 * Renders complete QuakeNews videos from VideoSpecs (GPU, live map) and saves review stills.
 *
 * For each fixture: builds and validates the VideoSpec, writes it to out/news/<fixture>.spec.json, renders
 * out/news/<fixture>.mp4 with that spec as the only input (--props), records wall time and peak memory of the render
 * process tree (out/news/<fixture>.metrics.json; the verbose log with MAPDIAG lines goes to out/news/<fixture>.log),
 * then saves stills at representative frames into out/news/stills/[phone/].
 *
 * Usage: tsx scripts/render-news.ts [--stills-only] [fixture ...]   (default: noto kamchatka preliminaryTest)
 * Verify: tsx scripts/verify-render.ts --dir=news --frames=1050 --report=news-report noto kamchatka preliminaryTest
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fullCredits } from '../src/copy/credits.js';
import { DEMO_AS_OF_UTC, FIXTURES } from '../src/fixtures/index.js';
import type { FixtureKey } from '../src/fixtures/index.js';
import { buildVideoSpec } from '../src/spec/build.js';
import type { VideoSpec } from '../src/spec/schema.js';
import { sceneRanges, totalFrames } from '../src/spec/timeline.js';
import { pad3, runMeasured, saveFrame } from './lib/render-process.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const out = join( root, 'out', 'news' );
mkdirSync( join( out, 'stills', 'phone' ), { recursive: true } );

/** Representative frames, derived from the spec's scene ranges. */
function stillFrames( spec: VideoSpec ): { frame: number; label: string }[] {
  const [ hook, facts, context, closing ] = sceneRanges( spec );
  const cards = spec.scenes[2].items.length;
  const cardLength = Math.floor( context.durationInFrames / cards );
  return [
    { frame: hook.from, label: 'hook-open' },
    { frame: hook.from + 84, label: 'hook-compact' },
    { frame: hook.from + 150, label: 'hook-arrival' },
    { frame: facts.from + 200, label: 'facts' },
    ...Array.from( { length: cards }, ( _, i ) => ( { frame: context.from + i * cardLength + Math.round( cardLength / 2 ), label: `context-${i + 1}` } ) ),
    { frame: closing.from + 30, label: 'closing-entering' },
    { frame: closing.from + closing.durationInFrames - 1, label: 'closing-final' }
  ];
}

async function run( fixture: FixtureKey, stillsOnly: boolean ) {
  const spec = buildVideoSpec( FIXTURES[fixture], { asOfUtc: DEMO_AS_OF_UTC } );
  const propsFile = join( out, `${fixture}.spec.json` );
  writeFileSync( propsFile, JSON.stringify( { spec }, null, 2 ) );
  const mp4 = join( out, `${fixture}.mp4` );
  // The complete attribution for the public description (terrain map credits), next to the MP4.
  writeFileSync( join( out, `${fixture}.credits.txt` ), `${fullCredits( 'terrain' )}\n` );

  if ( !stillsOnly ) {
    const result = await runMeasured(
      [ 'remotion', 'render', 'QuakeNews', mp4, '--gl=angle', `--props=${propsFile}`, '--log=verbose', '--overwrite' ],
      root,
      join( out, `${fixture}.log` )
    );
    const metrics = { name: fixture, fixture, gl: 'angle', frames: totalFrames( spec ), concurrency: 4, ...result };
    writeFileSync( join( out, `${fixture}.metrics.json` ), JSON.stringify( metrics, null, 2 ) );
    console.log( JSON.stringify( metrics ) );
    if ( result.exitCode !== 0 ) {
      throw new Error( `${fixture} failed; see out/news/${fixture}.log` );
    }
  }

  for ( const { frame, label } of stillFrames( spec ) ) {
    const file = `${fixture}-f${pad3( frame )}-${label}.png`;
    saveFrame( root, mp4, frame, spec.format.fps, join( out, 'stills', file ), join( out, 'stills', 'phone', file ) );
  }
}

const stillsOnly = process.argv.includes( '--stills-only' );
const fixtures = process.argv.slice( 2 ).filter( a => !a.startsWith( '--' ) ) as FixtureKey[];
for ( const fixture of fixtures.length > 0 ? fixtures : [ 'noto', 'kamchatka', 'preliminaryTest' ] as FixtureKey[] ) {
  await run( fixture, stillsOnly );
}
