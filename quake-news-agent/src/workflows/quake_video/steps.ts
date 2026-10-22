import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FatalError, step, z } from '@outputai/core';
import { loadFastTrackConfig } from '../../fast_track/config.js';
import { runVideoScript, videoDir } from '../../shared/run_cli.js';
import {
  buildSpecInputSchema,
  buildSpecOutputSchema,
  eventStepInputSchema,
  narrationOutputSchema,
  renderOutputSchema,
  stepResultSchema
} from './types.js';

/** Where each stage's artifacts go: video/out/<kind>/<eventId>/ (git-ignored), the CLIs' own defaults. */
export const eventPaths = ( eventId: string ) => {
  const out = join( videoDir(), 'out' );
  return {
    packageDir: join( out, 'packages', eventId ),
    audioDir: join( out, 'audio', eventId ),
    videoDir: join( out, 'videos', eventId )
  };
};

const sha256 = ( text: string ) => createHash( 'sha256' ).update( text ).digest( 'hex' );
const elapsed = ( since: number ) => Date.now() - since;
const fatal = ( error: unknown ) => new FatalError( error instanceof Error ? error.message : String( error ) );

export const clock = step( {
  name: 'clock',
  description: 'Current time in milliseconds, so stage durations can be measured outside deterministic workflow code',
  outputSchema: z.object( { ms: z.number() } ),
  fn: async () => ( { ms: Date.now() } ),
  options: { activityOptions: { startToCloseTimeout: '1m', retry: { maximumAttempts: 3 } } }
} );

export const buildSpec = step( {
  name: 'build_spec',
  description: 'Write the M2.4a video package and build the VideoSpec and review script with the existing CLI',
  inputSchema: buildSpecInputSchema,
  outputSchema: buildSpecOutputSchema,
  fn: async ( { videoPackage } ) => {
    const started = Date.now();
    const { packageDir } = eventPaths( videoPackage.event.id );
    mkdirSync( packageDir, { recursive: true } );
    const pkg = join( packageDir, 'package.json' );
    writeFileSync( pkg, JSON.stringify( videoPackage, null, 2 ) );
    try {
      await runVideoScript( 'scripts/build-from-package.ts', [ pkg ] );
    } catch ( error ) {
      throw fatal( error );
    }
    return { ms: elapsed( started ), detail: null, package: pkg, spec: join( packageDir, 'spec.json' ), script: join( packageDir, 'script.txt' ) };
  },
  options: { activityOptions: { startToCloseTimeout: '2m', retry: { maximumAttempts: 1 } } }
} );

/**
 * Paid step: one ElevenLabs request. A single attempt, and an artifact check first: if narration.mp3 and soundtrack.json
 * already exist for this exact text, they are reused and nothing is requested or charged.
 */
export const generateNarration = step( {
  name: 'generate_narration',
  description: 'Generate narration, alignment and timed captions with ElevenLabs (single attempt, reuses existing artifacts)',
  inputSchema: eventStepInputSchema.required( { narration: true } ),
  outputSchema: narrationOutputSchema,
  fn: async ( { eventId, narration } ) => {
    const started = Date.now();
    const { packageDir, audioDir } = eventPaths( eventId );
    const mp3 = join( audioDir, 'narration.mp3' );
    const soundtrack = join( audioDir, 'soundtrack.json' );
    const hashFile = join( audioDir, 'narration.sha256' );
    const hash = sha256( narration );
    if ( existsSync( mp3 ) && existsSync( soundtrack ) && existsSync( hashFile ) && readFileSync( hashFile, 'utf8' ).trim() === hash ) {
      return { ms: elapsed( started ), detail: 'reused existing narration (no ElevenLabs request)', narration: mp3, soundtrack };
    }
    try {
      await runVideoScript( 'scripts/generate-narration.ts', [ join( packageDir, 'package.json' ), '--generate' ] );
    } catch ( error ) {
      throw fatal( error );
    }
    writeFileSync( hashFile, `${hash}\n` );
    return { ms: elapsed( started ), detail: null, narration: mp3, soundtrack };
  },
  options: { activityOptions: { startToCloseTimeout: '5m', retry: { maximumAttempts: 1 } } }
} );

export const prepareTerrain = step( {
  name: 'prepare_terrain',
  description: 'Download and cache any missing terrain tiles for the event (already cached tiles are skipped)',
  inputSchema: eventStepInputSchema,
  outputSchema: stepResultSchema,
  fn: async ( { eventId } ) => {
    const started = Date.now();
    const output = await runVideoScript( 'scripts/prepare-terrain.ts', [ join( eventPaths( eventId ).packageDir, 'spec.json' ) ] );
    const summary = output.split( '\n' ).find( line => line.startsWith( 'cached ' ) ) ?? null;
    return { ms: elapsed( started ), detail: summary };
  },
  // A network failure is worth one more attempt; the script already retries each tile.
  options: { activityOptions: { startToCloseTimeout: '20m', retry: { maximumAttempts: 2 } } }
} );

/**
 * Serial by design: the renderer stages audio into the shared video/public/audio/. Run the worker with
 * TEMPORAL_MAX_CONCURRENT_ACTIVITY_TASK_EXECUTIONS=1 (npm run output:worker:host) so renders never overlap.
 */
export const renderVideo = step( {
  name: 'render_video',
  description: 'Render the 35 s MP4 and the full credits with the existing package render CLI',
  inputSchema: eventStepInputSchema,
  outputSchema: renderOutputSchema,
  fn: async ( { eventId } ) => {
    const started = Date.now();
    const { packageDir, audioDir } = eventPaths( eventId );
    let result: { mp4: string; credits: string };
    try {
      const output = await runVideoScript( 'scripts/render-package.ts', [ join( packageDir, 'spec.json' ), join( audioDir, 'soundtrack.json' ) ] );
      result = JSON.parse( output.trim().split( '\n' ).at( -1 ) ?? '' );
    } catch ( error ) {
      throw fatal( error );
    }
    return { ms: elapsed( started ), detail: null, mp4: result.mp4, credits: result.credits };
  },
  options: { activityOptions: { startToCloseTimeout: '30m', retry: { maximumAttempts: 1 } } }
} );

/**
 * Fast Track only: refuses (before the paid ElevenLabs request) a narration longer than the configured bound the
 * budget was reserved for, or any narration when the budget settings are incomplete.
 */
export const checkFastTrackNarration = step( {
  name: 'check_fast_track_narration',
  description: 'Fast Track: refuse a narration the reserved budget does not cover',
  inputSchema: eventStepInputSchema.required( { narration: true } ),
  outputSchema: z.object( { chars: z.number() } ),
  fn: async ( { narration } ) => {
    const { budget, budgetProblems } = loadFastTrackConfig( process.env );
    if ( !budget ) {
      throw new FatalError( `fast-track budget is not configured: ${budgetProblems.join( '; ' )}` );
    }
    if ( narration.length > budget.maxNarrationChars ) {
      throw new FatalError( `narration has ${narration.length} characters; the fast-track budget covers ${budget.maxNarrationChars}` );
    }
    return { chars: narration.length };
  },
  options: { activityOptions: { startToCloseTimeout: '1m', retry: { maximumAttempts: 1 } } }
} );
