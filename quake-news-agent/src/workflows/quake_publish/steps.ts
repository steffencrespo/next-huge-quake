import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FatalError, step, z } from '@outputai/core';
import { outputFetch } from '@outputai/http';
import { buildUsgsNearbyUrl, fetchUsgsJson, queryUsgs } from '../../clients/usgs.js';
import { FAST_TRACK_POLICY_VERSION, loadFastTrackConfig } from '../../fast_track/config.js';
import { publicationsOn } from '../../fast_track/budget.js';
import { checkVideoText } from '../../fast_track/guard.js';
import { parsePagerImpact, pagerUrls } from '../../fast_track/impact.js';
import type { PagerImpact } from '../../fast_track/impact.js';
import { isPaused, ledgerStore, updateLedgerEvent } from '../../fast_track/ledger.js';
import type { LedgerEvent } from '../../fast_track/ledger.js';
import { decide } from '../../fast_track/policy.js';
import { nearbyPublished, readPublishedEventIds } from '../../fast_track/published.js';
import { manifestIdFor, videoTextFor } from '../../fast_track/templates.js';
import { runVideoScript, videoDir } from '../../shared/run_cli.js';
import { observe } from '../quake_monitor/selection.js';
import { quakeFactsSchema } from '../quake_news/types.js';
import { gateOutputSchema, pagerImpactSchema } from './types.js';

const PRODUCTION_BLOCK = 'Production Technology\nAutomated news and video production powered by Output.ai\nhttps://output.ai';
const SEQUENCE_MIN_MAGNITUDE = 4.5;

async function fetchImpact( detail: unknown ): Promise<PagerImpact | null> {
  const urls = pagerUrls( detail );
  if ( !urls ) {
    return null;
  }
  const [ alerts, exposures ] = await Promise.all( [
    urls.alerts ? fetchUsgsJson( urls.alerts ) : null,
    urls.exposures ? fetchUsgsJson( urls.exposures ) : null
  ] );
  return parsePagerImpact( alerts, exposures, urls.maxMmi );
}

/**
 * The publication gate, evaluated on fresh USGS data after the video is rendered. Anything it cannot establish sends
 * the event to a person (fail closed): fast track off or paused, a USGS or sequence lookup that failed, a policy
 * exclusion, facts revised since production, or the daily publication cap.
 */
export const fastTrackGate = step( {
  name: 'fast_track_gate',
  description: 'Re-check USGS, PAGER, the sequence and the policy before a fast-track publication',
  inputSchema: z.object( { eventId: z.string(), produced: quakeFactsSchema } ),
  outputSchema: gateOutputSchema,
  fn: async ( { eventId, produced } ) => {
    const config = loadFastTrackConfig( process.env );
    const now = Date.now();
    const evaluatedAtUtc = new Date( now ).toISOString();
    const manual = ( reasons: string[] ) => ( {
      publish: false, tier: 'none', signals: [], reasons, finalPrivacy: config.finalPrivacy, facts: null, impact: null, evaluatedAtUtc
    } );
    if ( !config.enabled ) {
      return manual( [ 'fast_track_disabled' ] );
    }
    if ( isPaused( config.pauseFile ) ) {
      return manual( [ 'fast_track_paused' ] );
    }
    const lookup = await queryUsgs( { eventId } );
    if ( !lookup.found ) {
      return manual( [ 'usgs_event_not_found' ] );
    }
    const obs = observe( lookup.body );
    const impact = await fetchImpact( lookup.body );
    let nearby: string[] | null = null;
    try {
      const nearbyBody = await fetchUsgsJson( buildUsgsNearbyUrl( {
        latitude: obs.facts.latitude, longitude: obs.facts.longitude, radiusKm: config.sequenceRadiusKm,
        startTimeUtc: new Date( Date.parse( obs.facts.timeUtc ) - config.sequenceHours * 3_600_000 ).toISOString(),
        endTimeUtc: new Date( now ).toISOString(), minMagnitude: SEQUENCE_MIN_MAGNITUDE
      } ) );
      nearby = nearbyPublished( nearbyBody, readPublishedEventIds( videoDir() ), obs.ids );
    } catch {
      nearby = null; // sequence_check_unavailable: a person decides
    }
    const decision = decide( { facts: obs.facts, type: obs.type, sig: obs.sig, impact, nearbyPublished: nearby, produced, nowMs: now }, config );
    const reasons = [ ...decision.reasons ];
    if ( reasons.length === 0 && publicationsOn( ledgerStore().load(), evaluatedAtUtc ) >= config.maxPublishPerDay ) {
      reasons.push( 'daily_publication_cap' );
    }
    return {
      publish: reasons.length === 0, tier: decision.tier, signals: decision.signals, reasons, finalPrivacy: config.finalPrivacy,
      facts: obs.facts, impact, evaluatedAtUtc
    };
  },
  options: { activityOptions: { startToCloseTimeout: '3m', retry: { maximumAttempts: 3 } } }
} );

/**
 * Writes the publisher manifest (generated = approved = the deterministic template) and publish-credits.txt. The text
 * must pass the M1 fact check. If the publisher already holds a record for this manifest, the manifest on disk is kept
 * as it is: an uploaded video's approved content is never rewritten.
 */
export const buildFastTrackManifest = step( {
  name: 'build_fast_track_manifest',
  description: 'Write the deterministic publisher manifest and publication credits for a fast-track event',
  inputSchema: z.object( {
    eventId: z.string(), facts: quakeFactsSchema, impact: pagerImpactSchema.nullable(), narration: z.string(), credits: z.string(), mp4: z.string(),
    tier: z.string(), signals: z.array( z.string() ), evaluatedAtUtc: z.string()
  } ),
  outputSchema: z.object( { manifestId: z.string(), reused: z.boolean() } ),
  fn: async ( { eventId, facts, impact, narration, credits, mp4, tier, signals, evaluatedAtUtc } ) => {
    const root = videoDir();
    const manifestId = manifestIdFor( facts );
    const manifestPath = join( root, 'publish', `${manifestId}.json` );
    const statePath = join( root, 'publish', 'state.json' );
    const state = existsSync( statePath ) ? JSON.parse( readFileSync( statePath, 'utf8' ) ) as Record<string, unknown> : {};
    if ( state[manifestId] && existsSync( manifestPath ) ) {
      return { manifestId, reused: true };
    }
    const text = videoTextFor( facts, impact );
    const problems = checkVideoText( facts, text, narration );
    if ( problems.length ) {
      throw new FatalError( `fast-track text failed the fact check: ${problems.join( '; ' )}` );
    }
    const rel = ( abs: string ) => {
      if ( !abs.startsWith( `${root}/` ) ) {
        throw new FatalError( `${abs} is outside the video directory` );
      }
      return abs.slice( root.length + 1 );
    };
    const publishCredits = join( root, 'out', 'videos', eventId, 'publish-credits.txt' );
    writeFileSync( publishCredits, `${readFileSync( credits, 'utf8' ).trim()}\n\n\n${PRODUCTION_BLOCK}\n` );
    const manifest = {
      id: manifestId,
      file: rel( mp4 ),
      creditsFile: rel( publishCredits ),
      generated: text,
      approved: text,
      categoryId: '25',
      language: 'en',
      madeForKids: false,
      playlistId: 'PLPsR74lIhWgI',
      fastTrack: {
        policy: FAST_TRACK_POLICY_VERSION,
        tier,
        signals,
        evaluatedAt: evaluatedAtUtc,
        facts: {
          eventId, magnitude: facts.magnitude, magType: facts.magType, place: facts.place, timeUtc: facts.timeUtc, updatedUtc: facts.updatedUtc,
          status: facts.status, latitude: facts.latitude, longitude: facts.longitude, depthKm: facts.depthKm, tsunamiFlag: facts.tsunamiFlag,
          pagerAlert: facts.pagerAlert, fatalityLevel: impact?.fatalityLevel ?? null, economicLevel: impact?.economicLevel ?? null,
          exposedMmi6Plus: impact?.exposedMmi6Plus ?? null
        }
      }
    };
    writeFileSync( manifestPath, `${JSON.stringify( manifest, null, 2 )}\n` );
    return { manifestId, reused: false };
  },
  options: { activityOptions: { startToCloseTimeout: '1m', retry: { maximumAttempts: 1 } } }
} );

const publisherInput = z.object( { args: z.array( z.string() ) } );
const publisherOutput = z.object( { output: z.string() } );
const runPublisher = async ( { args }: { args: string[] } ) => ( { output: ( await runVideoScript( 'scripts/youtube-publish.ts', args ) ).trim() } );

/**
 * One publisher command (approve, reconcile, upload, publish-now). Every command is idempotent, so a retry after an
 * uncertain outcome is safe: upload resumes its saved session or playlist step and never uploads twice.
 */
export const publisherCommand = step( {
  name: 'publisher_command',
  description: 'Run one YouTube publisher command (approve, reconcile, upload, publish-now)',
  inputSchema: publisherInput,
  outputSchema: publisherOutput,
  fn: runPublisher,
  options: { activityOptions: { startToCloseTimeout: '20m', retry: { maximumAttempts: 3, initialInterval: '10s', backoffCoefficient: 2 } } }
} );

/** Strict read-back. Retried for up to about 20 minutes, which also waits for YouTube to finish processing. */
export const publisherVerify = step( {
  name: 'publisher_verify',
  description: 'Strict inspection of the uploaded video against the approved manifest (fails closed)',
  inputSchema: publisherInput,
  outputSchema: publisherOutput,
  fn: runPublisher,
  options: { activityOptions: { startToCloseTimeout: '2m', retry: { maximumAttempts: 12, initialInterval: '30s', backoffCoefficient: 1.5, maximumInterval: '3m' } } }
} );

/** Emergency stop re-checked right before the video is made public. */
export const fastTrackCheckpoint = step( {
  name: 'fast_track_checkpoint',
  description: 'Re-check the fast-track switch and pause file before publication',
  outputSchema: z.object( { proceed: z.boolean(), reason: z.string().nullable() } ),
  fn: async () => {
    const config = loadFastTrackConfig( process.env );
    if ( !config.enabled ) {
      return { proceed: false, reason: 'fast_track_disabled' };
    }
    return isPaused( config.pauseFile ) ? { proceed: false, reason: 'fast_track_paused' } : { proceed: true, reason: null };
  },
  options: { activityOptions: { startToCloseTimeout: '1m', retry: { maximumAttempts: 3 } } }
} );

/**
 * Records the outcome in the ledger (decision, video, timestamps) and notifies the operator when
 * FAST_TRACK_NOTIFY_URL is set. A failed notification never changes the outcome.
 */
export const recordFastTrack = step( {
  name: 'record_fast_track',
  description: 'Record the fast-track outcome and timestamps, and notify the operator',
  inputSchema: z.object( {
    eventId: z.string(), manifestId: z.string().nullable(), message: z.string(),
    patch: z.record( z.string(), z.union( [ z.string(), z.array( z.string() ), z.null() ] ) )
  } ),
  outputSchema: z.object( { videoId: z.string().nullable(), notified: z.boolean() } ),
  fn: async ( { eventId, manifestId, message, patch } ) => {
    const statePath = join( videoDir(), 'publish', 'state.json' );
    const state = existsSync( statePath ) ? JSON.parse( readFileSync( statePath, 'utf8' ) ) as Record<string, { videoId?: string }> : {};
    const videoId = manifestId ? state[manifestId]?.videoId ?? null : null;
    updateLedgerEvent( ledgerStore(), eventId, { ...( patch as Partial<LedgerEvent> ), manifestId, videoId } );
    const url = loadFastTrackConfig( process.env ).notifyUrl;
    let notified = false;
    if ( url ) {
      try {
        const response = await outputFetch( url, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify( { text: `${message}${videoId ? ` https://youtu.be/${videoId}` : ''}` } ), signal: AbortSignal.timeout( 15_000 )
        } );
        await response.body?.cancel();
        notified = response.ok;
      } catch {
        notified = false;
      }
    }
    return { videoId, notified };
  },
  options: { activityOptions: { startToCloseTimeout: '1m', retry: { maximumAttempts: 3 } } }
} );
