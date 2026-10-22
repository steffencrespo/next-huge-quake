import { workflow } from '@outputai/core';
import { FAST_TRACK_POLICY_VERSION } from '../../fast_track/config.js';
import { latencyOf } from '../../fast_track/latency.js';
import { clock } from '../quake_video/steps.js';
import { buildFastTrackManifest, fastTrackCheckpoint, fastTrackGate, publisherCommand, publisherVerify, recordFastTrack } from './steps.js';
import { publishInputSchema, publishOutputSchema } from './types.js';
import type { PublishOutput } from './types.js';

const rootMessage = ( error: unknown ): string => {
  let current = error as { message?: string; cause?: unknown } | undefined;
  while ( current?.cause && typeof current.cause === 'object' ) {
    current = current.cause as { message?: string; cause?: unknown };
  }
  return current?.message ?? String( error );
};

/**
 * Breaking News Fast Track: a rendered quake_video -> policy gate on fresh USGS data -> deterministic manifest ->
 * policy approval (content hash + versioned authority + facts) -> reconcile -> private upload -> strict private
 * inspection -> pause check -> publish-now -> strict public inspection. Any refusal or failure leaves the video for a
 * person (private unless publication itself already happened) and is recorded and notified. It only ever touches the
 * manifest it built; scheduled videos and other manifests are never read for writing.
 *
 * Start it with workflowId `quake_publish-<eventId>` (quake_video does this as a child for fast-track runs).
 */
export default workflow( {
  name: 'quake_publish',
  description: 'Fast Track: publish a rendered breaking-news Short under the versioned policy, or hand it to a person',
  inputSchema: publishInputSchema,
  outputSchema: publishOutputSchema,
  fn: async ( input ): Promise<PublishOutput> => {
    const { eventId, timing } = input;
    const timestamps: Record<string, string | null> = {
      originUtc: input.produced.timeUtc, detectedAtUtc: timing.detectedAtUtc, productionStartedAtUtc: timing.productionStartedAtUtc,
      renderCompletedAtUtc: timing.renderCompletedAtUtc, uploadedAtUtc: null, publishedAtUtc: null, verifiedAtUtc: null
    };
    const now = async () => new Date( ( await clock() ).ms ).toISOString();
    let manifestId: string | null = null;
    let tier: string | null = null;

    const finish = async ( status: PublishOutput['status'], reasons: string[], message: string ): Promise<PublishOutput> => {
      const { videoId } = await recordFastTrack( {
        eventId, manifestId, message: `[${status}] ${eventId}: ${message}`,
        patch: { decision: status, tier, reasons, ...timestamps }
      } );
      return {
        status, eventId, manifestId, videoId, tier, reasons, timestamps,
        latency: latencyOf( {
          originUtc: timestamps.originUtc, detectedAtUtc: timestamps.detectedAtUtc, productionStartedAtUtc: timestamps.productionStartedAtUtc,
          renderCompletedAtUtc: timestamps.renderCompletedAtUtc, uploadedAtUtc: timestamps.uploadedAtUtc, publishedAtUtc: timestamps.publishedAtUtc
        } )
      };
    };

    let gate;
    try {
      gate = await fastTrackGate( { eventId, produced: input.produced } );
    } catch ( error ) {
      return finish( 'manual', [ 'gate_failed' ], `could not evaluate the policy (${rootMessage( error )}); ready for human approval` );
    }
    tier = gate.tier;
    if ( !gate.publish || !gate.facts ) {
      return finish( 'manual', gate.reasons, `not eligible for automatic publication (${gate.reasons.join( ', ' )}); ready for human approval` );
    }

    let stage = 'manifest';
    try {
      manifestId = ( await buildFastTrackManifest( {
        eventId, facts: gate.facts, impact: gate.impact, narration: input.narration, credits: input.credits, mp4: input.mp4,
        tier: gate.tier, signals: gate.signals, evaluatedAtUtc: gate.evaluatedAtUtc
      } ) ).manifestId;
      stage = 'approve';
      await publisherCommand( { args: [ 'approve', manifestId, `--authority=${FAST_TRACK_POLICY_VERSION}` ] } );
      stage = 'reconcile';
      await publisherCommand( { args: [ 'reconcile', manifestId ] } );
      stage = 'upload';
      await publisherCommand( { args: [ 'upload', manifestId, '--confirm' ] } );
      timestamps.uploadedAtUtc = await now();
      stage = 'inspect_private';
      await publisherVerify( { args: [ 'inspect', manifestId, '--strict', '--expect=private' ] } );
      if ( gate.finalPrivacy === 'private' ) {
        timestamps.verifiedAtUtc = await now();
        return finish( 'verified_private', [], 'uploaded and verified PRIVATE (FAST_TRACK_FINAL_PRIVACY=private); publish-now is up to a person' );
      }
      stage = 'checkpoint';
      const checkpoint = await fastTrackCheckpoint();
      if ( !checkpoint.proceed ) {
        return finish( 'manual', [ checkpoint.reason ?? 'stopped' ], 'stopped before publication; the video is uploaded and private' );
      }
      stage = 'publish';
      await publisherCommand( { args: [ 'publish-now', manifestId, '--confirm' ] } );
      timestamps.publishedAtUtc = await now();
      stage = 'inspect_public';
      await publisherVerify( { args: [ 'inspect', manifestId, '--strict', '--expect=public' ] } );
      timestamps.verifiedAtUtc = await now();
    } catch ( error ) {
      const where = [ 'publish', 'inspect_public' ].includes( stage ) ? 'at or after publication (the video may be public)' : 'before publication (the video is not public)';
      return finish( 'failed', [ `${stage}: ${rootMessage( error )}` ], `failed at ${stage} ${where}; run reconcile and inspect` );
    }
    return finish( 'published', [], `published (tier ${gate.tier})` );
  },
  options: { activityOptions: { retry: { maximumAttempts: 1 } } }
} );
