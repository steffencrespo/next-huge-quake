/**
 * Package-driven render (M2.4c): validates the generated artifacts of one event, stages its audio where Remotion's
 * staticFile() finds it, renders QuakeNews and writes the MP4 and its credits. Node-only; the composition is unchanged.
 *
 * Inputs: spec.json (VideoSpec v1), soundtrack.json (Soundtrack schema, from generate-narration), the narration MP3
 * (default: narration.mp3 next to soundtrack.json), the music MP3 under assets/ and the prepared terrain under
 * public/terrain/. Nothing is rendered until every input has been validated.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { mp3DurationSeconds } from '../../src/audio/mp3.js';
import { soundtrackSchema } from '../../src/audio/soundtrack.js';
import type { Soundtrack } from '../../src/audio/soundtrack.js';
import { END_MARGIN_SECONDS } from '../../src/audio/tts.js';
import { fullCredits } from '../../src/copy/credits.js';
import { missingTerrainTiles, needsTerrain, requiredTerrainTiles, terrainMissingMessage } from '../../src/map/terrainPreflight.js';
import { videoSpecSchema } from '../../src/spec/schema.js';
import type { VideoSpec } from '../../src/spec/schema.js';
import { totalFrames } from '../../src/spec/timeline.js';
import { runMeasured } from './render-process.js';

/** How far the MP3's measured length may differ from soundtrack.narrationDuration (seconds). */
export const DURATION_TOLERANCE = 0.1;
const AUDIO_PATH = /^audio\/[A-Za-z0-9._-]+\.mp3$/;

export type RenderInputs = {
  spec: VideoSpec;
  soundtrack: Soundtrack;
  /** Absolute source files and the public/ file each one is staged to. */
  audio: Array<{ role: 'narration' | 'music'; source: string; staged: string }>;
};

function readJson( file: string, problems: string[], label: string ): unknown {
  if ( !existsSync( file ) ) {
    problems.push( `${label} not found: ${file}` );
    return undefined;
  }
  try {
    return JSON.parse( readFileSync( file, 'utf8' ) );
  } catch {
    problems.push( `${label} is not valid JSON: ${file}` );
    return undefined;
  }
}

const issues = ( error: { issues: Array<{ path: PropertyKey[]; message: string }> } ) =>
  error.issues.slice( 0, 5 ).map( i => `${i.path.map( String ).join( '.' ) || '(root)'}: ${i.message}` ).join( '; ' );

/** Validates every input and returns what the render needs. Throws one error listing all problems found. */
export function resolveRenderInputs( { specFile, soundtrackFile, narrationFile, root }: {
  specFile: string; soundtrackFile: string; narrationFile?: string; root: string;
} ): RenderInputs {
  const problems: string[] = [];
  const rawSpec = readJson( specFile, problems, 'spec.json' );
  const rawSoundtrack = readJson( soundtrackFile, problems, 'soundtrack.json' );
  const specResult = rawSpec === undefined ? undefined : videoSpecSchema.safeParse( rawSpec );
  const soundtrackResult = rawSoundtrack === undefined ? undefined : soundtrackSchema.safeParse( rawSoundtrack );
  if ( specResult && !specResult.success ) {
    problems.push( `spec.json is not a valid VideoSpec v1: ${issues( specResult.error )}` );
  }
  if ( soundtrackResult && !soundtrackResult.success ) {
    problems.push( `soundtrack.json is not a valid Soundtrack: ${issues( soundtrackResult.error )}` );
  }
  const spec = specResult?.success ? specResult.data : undefined;
  const soundtrack = soundtrackResult?.success ? soundtrackResult.data : undefined;
  const narrationSource = resolve( narrationFile ?? join( dirname( soundtrackFile ), 'narration.mp3' ) );
  const musicSource = soundtrack ? join( root, 'assets', soundtrack.musicFile ) : '';

  if ( soundtrack ) {
    for ( const file of [ soundtrack.narrationFile, soundtrack.musicFile ] ) {
      if ( !AUDIO_PATH.test( file ) ) {
        problems.push( `soundtrack file name '${file}' must look like audio/<name>.mp3` );
      }
    }
    if ( !existsSync( musicSource ) ) {
      problems.push( `music file not found: ${musicSource} (licensed music is kept in assets/audio, not in git)` );
    }
    if ( !existsSync( narrationSource ) ) {
      problems.push( `narration MP3 not found: ${narrationSource}` );
    } else {
      try {
        const measured = mp3DurationSeconds( readFileSync( narrationSource ) );
        if ( Math.abs( measured - soundtrack.narrationDuration ) > DURATION_TOLERANCE ) {
          problems.push( `narration MP3 is ${measured.toFixed( 2 )} s but soundtrack.json says ${soundtrack.narrationDuration} s; regenerate the soundtrack` );
        }
      } catch ( error ) {
        problems.push( `narration MP3 is unreadable: ${error instanceof Error ? error.message : String( error )}` );
      }
    }
    const lastCaption = Math.max( ...soundtrack.captions.map( c => c.end ) );
    if ( lastCaption > soundtrack.narrationDuration + DURATION_TOLERANCE ) {
      problems.push( `captions run to ${lastCaption} s, past the narration (${soundtrack.narrationDuration} s)` );
    }
  }
  if ( spec && soundtrack ) {
    if ( basename( soundtrack.narrationFile ) !== `${spec.event.id}-narration.mp3` ) {
      problems.push( `soundtrack narration '${soundtrack.narrationFile}' does not belong to event ${spec.event.id} (expected audio/${spec.event.id}-narration.mp3)` );
    }
    const videoSeconds = totalFrames( spec ) / spec.format.fps;
    const limit = videoSeconds - soundtrack.narrationStart - END_MARGIN_SECONDS;
    if ( soundtrack.narrationDuration > limit ) {
      problems.push( `narration (${soundtrack.narrationDuration} s from ${soundtrack.narrationStart} s) leaves less than ${END_MARGIN_SECONDS} s before the end of the ${videoSeconds} s video` );
    }
  }
  if ( spec && needsTerrain( spec ) ) {
    const manifestFile = join( root, 'public', 'terrain', 'manifest.json' );
    if ( !existsSync( manifestFile ) ) {
      problems.push( 'terrain not prepared: public/terrain/manifest.json is missing; run: npm run prepare:terrain -- <path to spec JSON>' );
    } else {
      const missing = missingTerrainTiles( requiredTerrainTiles( spec ), JSON.parse( readFileSync( manifestFile, 'utf8' ) ) );
      if ( missing.length > 0 ) {
        problems.push( terrainMissingMessage( spec, missing ) );
      }
    }
  }
  if ( problems.length > 0 || !spec || !soundtrack ) {
    throw new Error( `cannot render:\n- ${problems.join( '\n- ' )}` );
  }
  return {
    spec,
    soundtrack,
    audio: [
      { role: 'narration', source: narrationSource, staged: join( root, 'public', soundtrack.narrationFile ) },
      { role: 'music', source: musicSource, staged: join( root, 'public', soundtrack.musicFile ) }
    ]
  };
}

/**
 * Copies the audio into public/audio/ (where staticFile() looks). A file that already exists is kept: identical
 * content is reused, different content is an error, never an overwrite. The returned cleanup removes only the files
 * this call created.
 */
export function stageAudio( audio: RenderInputs['audio'] ): () => void {
  const created: string[] = [];
  const cleanup = () => created.forEach( file => rmSync( file, { force: true } ) );
  try {
    for ( const { source, staged } of audio ) {
      if ( existsSync( staged ) ) {
        if ( !readFileSync( staged ).equals( readFileSync( source ) ) ) {
          throw new Error( `${staged} already exists with different content; remove it (a leftover from an interrupted render) and retry` );
        }
        continue;
      }
      mkdirSync( dirname( staged ), { recursive: true } );
      copyFileSync( source, staged );
      created.push( staged );
    }
  } catch ( error ) {
    cleanup();
    throw error;
  }
  return cleanup;
}

export type RenderResult = {
  eventId: string;
  mp4: string;
  credits: string;
  frames: number;
  seconds: number;
  wallMs: number;
  peakTreeRssMb: number;
};

/** Validates, stages audio, renders QuakeNews and writes <outDir>/{video.mp4, credits.txt, props.json, render.log, metrics.json}. */
export async function renderPackage( options: { specFile: string; soundtrackFile: string; narrationFile?: string; outDir?: string; root: string } ): Promise<RenderResult> {
  const { spec, soundtrack, audio } = resolveRenderInputs( options );
  const outDir = resolve( options.outDir ?? join( options.root, 'out', 'videos', spec.event.id ) );
  mkdirSync( outDir, { recursive: true } );
  const mp4 = join( outDir, 'video.mp4' );
  const credits = join( outDir, 'credits.txt' );
  const props = join( outDir, 'props.json' );
  writeFileSync( props, JSON.stringify( { spec, soundtrack }, null, 2 ) );
  writeFileSync( credits, `${fullCredits( 'terrain' )}\nMusic: ${soundtrack.musicCredit}\n` );

  const cleanup = stageAudio( audio );
  try {
    const result = await runMeasured(
      [ 'remotion', 'render', 'QuakeNews', mp4, '--gl=angle', `--props=${props}`, '--log=verbose', '--overwrite' ],
      options.root,
      join( outDir, 'render.log' )
    );
    if ( result.exitCode !== 0 ) {
      throw new Error( `render failed (exit ${result.exitCode}); see ${join( outDir, 'render.log' )}` );
    }
    const frames = totalFrames( spec );
    const summary: RenderResult = { eventId: spec.event.id, mp4, credits, frames, seconds: frames / spec.format.fps, wallMs: result.wallMs, peakTreeRssMb: result.peakTreeRssMb };
    writeFileSync( join( outDir, 'metrics.json' ), `${JSON.stringify( summary, null, 2 )}\n` );
    return summary;
  } finally {
    cleanup();
  }
}
