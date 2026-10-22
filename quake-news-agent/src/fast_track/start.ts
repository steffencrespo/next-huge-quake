import { reserve } from './budget.js';
import type { FastTrackConfig } from './config.js';
import type { LedgerStore } from './ledger.js';
import { isCandidate } from './policy.js';
import type { FastTrackStart } from '../workflows/quake_monitor/poll.js';
import type { Observation } from '../workflows/quake_monitor/selection.js';
import type { EventRecord } from '../workflows/quake_monitor/state.js';

/**
 * The monitor's fast-track decision before a paid start. Fast track off, paused, not a candidate, or without complete
 * budget settings: a normal start (the event ends at ready_for_approval, as before). A candidate whose worst-case cost
 * does not fit the per-event, daily or monthly limit: no start at all (hard stop). Otherwise the cost is reserved and
 * saved before the start, so a crash can never let the limits be exceeded.
 */
export function fastTrackStart( obs: Observation, record: EventRecord, nowMs: number, config: FastTrackConfig, paused: boolean, ledger: LedgerStore ): FastTrackStart {
  if ( !config.enabled || paused || !isCandidate( obs.facts, obs.type ) ) {
    return { kind: 'normal', note: null };
  }
  if ( !config.budget ) {
    return { kind: 'normal', note: `fast track unavailable (budget not configured: ${config.budgetProblems.join( '; ' )})` };
  }
  const book = ledger.load();
  const reservation = reserve( book, obs.facts.id, config.budget, new Date( nowMs ).toISOString() );
  if ( !reservation.ok ) {
    return { kind: 'stop', reason: reservation.reason };
  }
  if ( !reservation.existing ) {
    ledger.save( book );
  }
  return { kind: 'fast_track', detectedAtUtc: record.firstSeen };
}
