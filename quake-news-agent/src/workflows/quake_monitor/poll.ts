import type { MonitorConfig } from './config.js';
import { byPriority, evaluate, observe } from './selection.js';
import type { Observation } from './selection.js';
import { IN_FLIGHT, STARTABLE, findRecord, prune, utcDay } from './state.js';
import type { EventRecord, MonitorState, StateStore } from './state.js';

export type Outcome = 'ready_for_approval' | 'rejected' | 'no_candidate' | 'failed';
export type Inspection = { found: false } | { found: true; running: boolean; outcome: Outcome | null };

/** Everything outside the pure logic, injected so the poll can be tested without USGS, Temporal or the clock. */
export type PollDeps = {
  now: () => number;
  fetchFeed: ( startTimeUtc: string ) => Promise<unknown>;
  store: StateStore;
  api: {
    inspect: ( workflowId: string ) => Promise<Inspection>;
    /** Resolves when started or already started; throws when the outcome is unknown. */
    start: ( workflowId: string, input: StartInput ) => Promise<void>;
  };
  /**
   * Fast Track (optional): before a real start, decides whether the event is produced as a fast-track candidate (its
   * worst-case cost reserved against the budget), produced normally, or not started at all because a budget is spent.
   */
  fastTrack?: ( obs: Observation, record: EventRecord, nowMs: number ) => FastTrackStart;
};

export type StartInput = { eventId: string; asOfUtc: string; fastTrack?: { detectedAtUtc: string | null } };
export type FastTrackStart = { kind: 'fast_track'; detectedAtUtc: string } | { kind: 'normal'; note: string | null } | { kind: 'stop'; reason: string };

export type Decision = 'none' | 'dry_run_would_start' | 'started' | 'start_unconfirmed' | 'capped' | 'budget_capped' | 'busy' | 'attempts_exhausted' | 'poll_failed';

export type PollSummary = {
  ok: boolean;
  error: string | null;
  decision: Decision;
  eventId: string | null;
  dryRun: boolean;
  fetched: number;
  unusable: number;
  newEvents: number;
  eligible: number;
  inFlight: number;
  startsToday: number;
  nextPollSeconds: number;
};

const workflowIdFor = ( eventId: string ) => `quake_video-${eventId}`;
const iso = ( ms: number ) => new Date( ms ).toISOString();
const snapshotOf = ( { facts, sig }: Observation ): EventRecord['snapshot'] =>
  ( { magnitude: facts.magnitude, status: facts.status, alert: facts.pagerAlert, sig, updated: facts.updatedUtc } );

/**
 * One monitoring pass. Order matters for safety: the state is loaded first (a corrupt file aborts before anything
 * else), a failed USGS request returns without touching state, a start is written to the state file BEFORE the
 * workflow is started, and an unknown start result is checked against Temporal before anything is retried.
 */
export async function runPoll( deps: PollDeps, config: MonitorConfig ): Promise<PollSummary> {
  const nowMs = deps.now();
  const state: MonitorState = deps.store.load();
  const summary: PollSummary = {
    ok: true, error: null, decision: 'none', eventId: null, dryRun: config.dryRun, fetched: 0, unusable: 0,
    newEvents: 0, eligible: 0, inFlight: 0, startsToday: state.startsByDay[utcDay( nowMs )] ?? 0, nextPollSeconds: config.pollSeconds
  };

  let body: unknown;
  try {
    body = await deps.fetchFeed( iso( nowMs - config.maxAgeHours * 60 * 60 * 1000 ) );
  } catch ( error ) {
    return { ...summary, ok: false, error: error instanceof Error ? error.message : String( error ), decision: 'poll_failed', nextPollSeconds: Math.min( 60, config.pollSeconds ) };
  }
  const features = ( body as { features?: unknown[] } | null )?.features;
  if ( !Array.isArray( features ) ) {
    return { ...summary, ok: false, error: 'USGS response has no features array', decision: 'poll_failed', nextPollSeconds: Math.min( 60, config.pollSeconds ) };
  }

  const isFirstPoll = state.baselinedAt === null;
  const observations = new Map<string, Observation>();
  for ( const feature of features ) {
    try {
      const obs = observe( feature );
      observations.set( obs.facts.id, obs );
    } catch {
      summary.unusable++;
    }
  }
  summary.fetched = observations.size;

  // 1. Record or update every observed event. Started and finished events are only touched (lastSeen, snapshot).
  for ( const obs of observations.values() ) {
    const evaluation = evaluate( obs, config, nowMs );
    const existing = findRecord( state, obs.ids );
    if ( !existing ) {
      const old = nowMs - Date.parse( obs.facts.timeUtc ) > config.baselineGraceMinutes * 60 * 1000;
      state.events[obs.facts.id] = {
        id: obs.facts.id,
        ids: obs.ids,
        firstSeen: iso( nowMs ),
        lastSeen: iso( nowMs ),
        state: isFirstPoll && old ? 'baseline' : 'observed',
        evaluation,
        snapshot: snapshotOf( obs ),
        workflowId: null,
        startedAt: null,
        startAttempts: 0,
        note: isFirstPoll && old ? 'present at the first poll' : null
      };
      summary.newEvents++;
      continue;
    }
    existing.lastSeen = iso( nowMs );
    existing.ids = [ ...new Set( [ ...existing.ids, ...obs.ids ] ) ];
    existing.snapshot = snapshotOf( obs );
    if ( ( STARTABLE as readonly string[] ).includes( existing.state ) ) {
      existing.evaluation = evaluation;
    }
  }
  if ( isFirstPoll ) {
    state.baselinedAt = iso( nowMs );
  }

  // 2. Resolve events whose workflow was started earlier.
  for ( const record of Object.values( state.events ) ) {
    if ( !( IN_FLIGHT as readonly string[] ).includes( record.state ) || !record.workflowId ) {
      continue;
    }
    try {
      const inspection = await deps.api.inspect( record.workflowId );
      if ( !inspection.found ) {
        if ( record.state === 'starting' ) {
          // The start never reached Temporal: make the event startable again (bounded by startAttempts).
          record.state = 'observed';
          record.note = 'start was not confirmed and no workflow exists';
          state.startsByDay[utcDay( Date.parse( record.startedAt ?? iso( nowMs ) ) )] = Math.max( 0, ( state.startsByDay[utcDay( Date.parse( record.startedAt ?? iso( nowMs ) ) )] ?? 1 ) - 1 );
        }
      } else if ( inspection.running ) {
        record.state = 'started';
      } else {
        record.state = inspection.outcome ?? 'failed';
      }
    } catch {
      // Temporal API unreachable: keep the record as it is and look again next poll.
    }
  }
  summary.inFlight = Object.values( state.events ).filter( r => ( IN_FLIGHT as readonly string[] ).includes( r.state ) ).length;

  // 3. Choose at most one event.
  const candidates = Object.values( state.events )
    .filter( record => ( STARTABLE as readonly string[] ).includes( record.state ) && record.evaluation.eligible && observations.has( record.id ) )
    .map( record => ( { record, obs: observations.get( record.id )! } ) )
    .sort( ( a, b ) => byPriority( a.obs, b.obs ) );
  summary.eligible = candidates.length;
  const day = utcDay( nowMs );

  if ( candidates.length > 0 ) {
    const { record, obs } = candidates[0];
    summary.eventId = record.id;
    if ( config.dryRun ) {
      record.state = 'would_start';
      record.note = 'dry run: would start quake_video';
      summary.decision = 'dry_run_would_start';
    } else if ( summary.inFlight > 0 ) {
      summary.decision = 'busy';
    } else if ( ( state.startsByDay[day] ?? 0 ) >= config.maxStartsPerDay ) {
      summary.decision = 'capped';
    } else if ( record.startAttempts >= config.maxStartAttempts ) {
      record.state = 'failed';
      record.note = `start could not be confirmed after ${record.startAttempts} attempts`;
      summary.decision = 'attempts_exhausted';
    } else {
      const fast = deps.fastTrack?.( obs, record, nowMs ) ?? { kind: 'normal', note: null };
      if ( fast.kind === 'stop' ) {
        // Hard stop: a fast-track budget is spent, so nothing paid starts for this candidate.
        record.note = `not started: ${fast.reason}`;
        summary.decision = 'budget_capped';
        summary.startsToday = state.startsByDay[day] ?? 0;
        deps.store.save( prune( state, nowMs ) );
        return summary;
      }
      const startInput: StartInput = {
        eventId: record.id, asOfUtc: iso( nowMs ), ...( fast.kind === 'fast_track' ? { fastTrack: { detectedAtUtc: fast.detectedAtUtc } } : {} )
      };
      // Persist the intent first: a crash after this point can never cause a second paid start for the event.
      record.state = 'starting';
      record.workflowId = workflowIdFor( record.id );
      record.startedAt = iso( nowMs );
      record.startAttempts++;
      record.note = fast.kind === 'fast_track' ? 'fast-track candidate' : fast.note;
      state.startsByDay[day] = ( state.startsByDay[day] ?? 0 ) + 1;
      deps.store.save( state );
      try {
        await deps.api.start( record.workflowId, startInput );
        record.state = 'started';
        summary.decision = 'started';
      } catch ( error ) {
        // Ambiguous: check Temporal before doing anything else, and never retry blindly.
        summary.decision = 'start_unconfirmed';
        try {
          const inspection = await deps.api.inspect( record.workflowId );
          if ( inspection.found ) {
            record.state = 'started';
            summary.decision = 'started';
          } else {
            record.state = 'observed';
            record.note = `start failed (${error instanceof Error ? error.message : 'unknown error'}); no workflow exists`;
            state.startsByDay[day] = Math.max( 0, ( state.startsByDay[day] ?? 1 ) - 1 );
          }
        } catch {
          record.note = 'start result unknown; kept as starting until Temporal can be checked';
        }
      }
    }
  }

  summary.startsToday = state.startsByDay[day] ?? 0;
  deps.store.save( prune( state, nowMs ) );
  return summary;
}
