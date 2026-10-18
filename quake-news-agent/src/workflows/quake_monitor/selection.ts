import { normalizeFeature } from '../quake_news/normalize.js';
import type { QuakeFacts } from '../quake_news/types.js';
import type { MonitorConfig } from './config.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export type Observation = {
  facts: QuakeFacts;
  /** Every ID USGS lists for the event (the same earthquake can be reported under several network IDs). */
  ids: string[];
  type: string;
  sig: number | null;
};

export type Evaluation = { eligible: boolean; reasons: string[] };

/** Normalizes one USGS feature and adds what selection needs. Throws ValidationError for unusable features. */
export function observe( feature: unknown ): Observation {
  const facts = normalizeFeature( feature );
  const props = ( feature as { properties: Record<string, unknown> } ).properties;
  const listed = typeof props.ids === 'string' ? props.ids.split( ',' ).map( id => id.trim() ).filter( Boolean ) : [];
  const sig = typeof props.sig === 'number' && Number.isFinite( props.sig ) ? props.sig : null;
  return { facts, ids: [ ...new Set( [ facts.id, ...listed ] ) ], type: typeof props.type === 'string' ? props.type : 'unknown', sig };
}

/**
 * Deterministic eligibility. Reasons name every rule that fails; 'too_young' is temporary (the event becomes eligible
 * once it is old enough) and 'needs_pager_or_significance' clears if a later USGS update adds PAGER or raises the
 * significance. Preliminary (non-reviewed) data is accepted: M1 labels it and still validates the text.
 */
export function evaluate( { facts, type, sig }: Observation, config: MonitorConfig, nowMs: number ): Evaluation {
  const reasons: string[] = [];
  const ageMs = nowMs - Date.parse( facts.timeUtc );
  if ( type !== 'earthquake' ) {
    reasons.push( 'not_an_earthquake' );
  }
  if ( facts.status === 'deleted' ) {
    reasons.push( 'deleted' );
  }
  if ( facts.magnitude < config.minMagnitude ) {
    reasons.push( 'below_magnitude' );
  } else if ( facts.magnitude < config.strongMagnitude ) {
    const alerted = facts.pagerAlert !== null && facts.pagerAlert !== 'green';
    if ( !alerted && ( sig ?? 0 ) < config.significanceFloor ) {
      reasons.push( 'needs_pager_or_significance' );
    }
  }
  if ( ageMs < config.minAgeMinutes * MINUTE_MS ) {
    reasons.push( 'too_young' );
  }
  if ( ageMs > config.maxAgeHours * HOUR_MS ) {
    reasons.push( 'too_old' );
  }
  return { eligible: reasons.length === 0, reasons };
}

/** Highest priority first: USGS significance, then magnitude, then newest, then ID (a stable tie-break). */
export function byPriority( a: Observation, b: Observation ): number {
  return ( b.sig ?? 0 ) - ( a.sig ?? 0 ) ||
    b.facts.magnitude - a.facts.magnitude ||
    Date.parse( b.facts.timeUtc ) - Date.parse( a.facts.timeUtc ) ||
    a.facts.id.localeCompare( b.facts.id );
}
