import type { QuakeFacts } from '../workflows/quake_news/types.js';
import type { FastTrackConfig } from './config.js';
import type { PagerImpact } from './impact.js';

/**
 * Fast Track policy v1 (pure, deterministic). It decides whether an event may be published without a human, never
 * whether it may be produced: anything it refuses still ends at ready_for_approval for the editor.
 *
 *   Tier A  M7.0+ with at least one sign that people are affected (PAGER yellow/orange, significance >= 600, or people
 *           at intensity VI+); magnitude alone is not enough.
 *   Tier B  M6.0-6.9 with a populated-area or impact signal: PAGER yellow/orange, significance >= 600, or at least
 *           10,000 people at intensity VI+.
 *   Tier C  M5.5-5.9 meeting the monitor's populated-area rule (PAGER yellow+ or significance >= 600). Recognized but
 *           manual in v1.
 *
 * Always manual: PAGER red, no PAGER product yet, an event near a recent publication (a sequence), a deleted or
 * non-earthquake event, an event older than the publication window, and facts that changed since production.
 */
export type Tier = 'A' | 'B' | 'C' | 'none';

export type PolicyInput = {
  facts: QuakeFacts;
  type: string;
  sig: number | null;
  /** null: USGS has no PAGER product for the event (yet). */
  impact: PagerImpact | null;
  /** IDs of already published or scheduled events nearby in the sequence window; null when that could not be checked. */
  nearbyPublished: string[] | null;
  /** The facts the video was produced from, when deciding after production. */
  produced?: QuakeFacts;
  nowMs: number;
};

export type PolicyDecision = { autoPublish: boolean; tier: Tier; signals: string[]; reasons: string[] };

const SIGNIFICANCE_FLOOR = 600;
const TIER_B_EXPOSURE = 10_000;
const TIER_A_EXPOSURE = 1_000;

const EARTH_RADIUS_KM = 6371;
const rad = ( deg: number ) => deg * Math.PI / 180;

/** Great-circle distance in km. */
export function distanceKm( a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number } ): number {
  const dLat = rad( b.latitude - a.latitude );
  const dLon = rad( b.longitude - a.longitude );
  const h = Math.sin( dLat / 2 ) ** 2 + Math.cos( rad( a.latitude ) ) * Math.cos( rad( b.latitude ) ) * Math.sin( dLon / 2 ) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin( Math.sqrt( h ) );
}

function impactSignals( { facts, sig, impact }: PolicyInput, exposureFloor: number ): string[] {
  const signals: string[] = [];
  const alert = impact ? ( facts.pagerAlert ?? null ) : null;
  if ( alert === 'yellow' || alert === 'orange' ) {
    signals.push( `pager_${alert}` );
  }
  if ( ( sig ?? 0 ) >= SIGNIFICANCE_FLOOR ) {
    signals.push( `significance_${sig}` );
  }
  if ( ( impact?.exposedMmi6Plus ?? 0 ) >= exposureFloor ) {
    signals.push( `exposed_mmi6_${Math.round( impact!.exposedMmi6Plus! )}` );
  }
  return signals;
}

export function tierOf( input: PolicyInput ): { tier: Tier; signals: string[] } {
  const m = input.facts.magnitude;
  if ( m >= 7 ) {
    const signals = impactSignals( input, TIER_A_EXPOSURE );
    return { tier: signals.length ? 'A' : 'none', signals };
  }
  if ( m >= 6 ) {
    const signals = impactSignals( input, TIER_B_EXPOSURE );
    return { tier: signals.length ? 'B' : 'none', signals };
  }
  if ( m >= 5.5 ) {
    const alert = input.facts.pagerAlert;
    const signals = [
      ...( alert && alert !== 'green' ? [ `pager_${alert}` ] : [] ),
      ...( ( input.sig ?? 0 ) >= SIGNIFICANCE_FLOOR ? [ `significance_${input.sig}` ] : [] )
    ];
    return { tier: signals.length ? 'C' : 'none', signals };
  }
  return { tier: 'none', signals: [] };
}

export function decide( input: PolicyInput, config: Pick<FastTrackConfig, 'maxAgeHours' | 'drift'> ): PolicyDecision {
  const { facts, produced } = input;
  const reasons: string[] = [];
  const { tier, signals } = tierOf( input );

  if ( input.type !== 'earthquake' ) {
    reasons.push( 'not_an_earthquake' );
  }
  if ( facts.status === 'deleted' ) {
    reasons.push( 'deleted' );
  }
  if ( input.nowMs - Date.parse( facts.timeUtc ) > config.maxAgeHours * 3_600_000 ) {
    reasons.push( 'too_old' );
  }
  if ( input.impact === null ) {
    reasons.push( 'pager_pending' );
  }
  if ( facts.pagerAlert === 'red' ) {
    reasons.push( 'pager_red' );
  }
  if ( input.nearbyPublished === null ) {
    reasons.push( 'sequence_check_unavailable' );
  } else if ( input.nearbyPublished.length > 0 ) {
    reasons.push( 'near_recent_publication' );
  }
  if ( tier === 'C' ) {
    reasons.push( 'tier_c_manual_in_v1' );
  } else if ( tier === 'none' ) {
    reasons.push( facts.magnitude >= 6 ? 'no_impact_signal' : 'below_fast_track_magnitude' );
  }
  if ( produced ) {
    if ( Math.abs( facts.magnitude - produced.magnitude ) >= config.drift.magnitude - 1e-9 ) {
      reasons.push( 'magnitude_revised' );
    }
    if ( facts.pagerAlert !== produced.pagerAlert ) {
      reasons.push( 'pager_revised' );
    }
    if ( distanceKm( facts, produced ) >= config.drift.distanceKm ) {
      reasons.push( 'location_revised' );
    }
  }
  return { autoPublish: reasons.length === 0, tier, signals, reasons };
}

/**
 * Before production (the monitor has only the feed): could this event qualify once PAGER and the sequence check are
 * known? Only such events are produced with the fast-track flag and count against the fast-track budget.
 */
export function isCandidate( facts: QuakeFacts, type: string ): boolean {
  return type === 'earthquake' && facts.status !== 'deleted' && facts.magnitude >= 6 && facts.pagerAlert !== 'red';
}
