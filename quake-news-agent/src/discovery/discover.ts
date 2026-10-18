import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MonitorConfig } from '../workflows/quake_monitor/config.js';
import { byPriority, evaluate, observe } from '../workflows/quake_monitor/selection.js';
import type { Observation } from '../workflows/quake_monitor/selection.js';

/**
 * On-demand discovery: the same eligibility rules and ranking as the continuous monitor (quake_monitor), applied once
 * to a USGS list over a chosen window. It reads, prints and starts nothing, and needs no Temporal, Docker or worker.
 */
export type Verdict = 'recommended' | 'eligible' | 'produced' | 'not_eligible';

export type Row = {
  id: string;
  magnitude: number;
  place: string;
  timeUtc: string;
  ageHours: number;
  pager: string | null;
  sig: number | null;
  status: string;
  verdict: Verdict;
  /** Why it is eligible, or why not. */
  why: string;
};

const REASON_TEXT: Record<string, ( c: MonitorConfig ) => string> = {
  not_an_earthquake: () => 'not an earthquake',
  deleted: () => 'deleted by USGS',
  below_magnitude: c => `below M${c.minMagnitude}`,
  needs_pager_or_significance: c => `M${c.minMagnitude}-${c.strongMagnitude - 0.1} needs PAGER yellow or worse, or significance >= ${c.significanceFloor}`,
  too_young: c => `younger than ${c.minAgeMinutes} min`,
  too_old: c => `older than ${c.maxAgeHours} h`
};

const eligibleBecause = ( { facts, sig }: Observation, config: MonitorConfig ): string => {
  if ( facts.magnitude >= config.strongMagnitude ) {
    return `M${facts.magnitude} >= M${config.strongMagnitude}`;
  }
  if ( facts.pagerAlert !== null && facts.pagerAlert !== 'green' ) {
    return `PAGER ${facts.pagerAlert}`;
  }
  return `significance ${sig} >= ${config.significanceFloor}`;
};

/**
 * Ranks the feed's events (highest USGS significance first) and marks each one. The first `maxStartsPerDay` eligible
 * events that have no video yet are recommended; events with a video (by ID or any alias) are only listed as produced.
 */
export function discover( features: unknown[], producedIds: ReadonlySet<string>, config: MonitorConfig, nowMs: number ): Row[] {
  const observations: Observation[] = [];
  for ( const feature of features ) {
    try {
      observations.push( observe( feature ) );
    } catch {
      // An unusable feature is skipped, as in the monitor.
    }
  }
  let recommended = 0;
  return observations.sort( byPriority ).map( obs => {
    const evaluation = evaluate( obs, config, nowMs );
    const produced = obs.ids.some( id => producedIds.has( id ) );
    let verdict: Verdict;
    let why: string;
    if ( produced ) {
      verdict = 'produced';
      why = 'a video was already made or started for this event';
    } else if ( !evaluation.eligible ) {
      verdict = 'not_eligible';
      why = evaluation.reasons.map( r => REASON_TEXT[r]?.( config ) ?? r ).join( '; ' );
    } else {
      verdict = recommended < config.maxStartsPerDay ? 'recommended' : 'eligible';
      recommended += verdict === 'recommended' ? 1 : 0;
      why = eligibleBecause( obs, config ) + ( verdict === 'eligible' ? ` (beyond the ${config.maxStartsPerDay}-per-day limit)` : '' );
    }
    return {
      id: obs.facts.id,
      magnitude: obs.facts.magnitude,
      place: obs.facts.place,
      timeUtc: obs.facts.timeUtc,
      ageHours: ( nowMs - Date.parse( obs.facts.timeUtc ) ) / 3_600_000,
      pager: obs.facts.pagerAlert,
      sig: obs.sig,
      status: obs.facts.status,
      verdict,
      why
    };
  } );
}

const FINISHED_OR_STARTED = new Set( [ 'starting', 'started', 'ready_for_approval', 'rejected', 'no_candidate', 'failed' ] );

/**
 * Every event that already has a video package (video/out/packages/<id>/package.json) or that the continuous monitor
 * started, with the aliases the monitor recorded. Missing folders or files simply contribute nothing.
 */
export function loadProducedIds( { videoOutDir, stateFile }: { videoOutDir: string; stateFile: string } ): Set<string> {
  const ids = new Set<string>();
  const packages = join( videoOutDir, 'packages' );
  if ( existsSync( packages ) ) {
    for ( const name of readdirSync( packages ) ) {
      if ( existsSync( join( packages, name, 'package.json' ) ) ) {
        ids.add( name );
      }
    }
  }
  if ( existsSync( stateFile ) ) {
    const state = JSON.parse( readFileSync( stateFile, 'utf8' ) ) as { events?: Record<string, { state?: string; ids?: string[] }> };
    for ( const record of Object.values( state.events ?? {} ) ) {
      if ( record.state && FINISHED_OR_STARTED.has( record.state ) ) {
        ( record.ids ?? [] ).forEach( id => ids.add( id ) );
      }
    }
  }
  return ids;
}

const pad = ( text: string, width: number ) => text.length >= width ? text : text + ' '.repeat( width - text.length );
const LABEL: Record<Verdict, string> = { recommended: 'RECOMMENDED', eligible: 'eligible', produced: 'produced', not_eligible: '-' };

/** A short, readable shortlist. Events that are neither eligible nor produced are listed last and only briefly. */
export function formatReport( rows: Row[], config: MonitorConfig, nowMs: number ): string {
  const header = `USGS earthquakes M${config.minMagnitude}+ in the last ${config.maxAgeHours} h, as of ${new Date( nowMs ).toISOString().slice( 0, 16 ).replace( 'T', ' ' )} UTC (${rows.length} found)`;
  const rules = `Eligible: M${config.strongMagnitude}+, or M${config.minMagnitude}-${config.strongMagnitude - 0.1} with PAGER yellow or worse or significance >= ${config.significanceFloor}; at least ${config.minAgeMinutes} min old. Ranked by USGS significance.`;
  const lines = rows.map( row => [
    pad( LABEL[row.verdict], 12 ),
    pad( row.id, 15 ),
    pad( `M${row.magnitude}`, 5 ),
    pad( row.timeUtc.slice( 0, 16 ).replace( 'T', ' ' ) + ' UTC', 21 ),
    pad( `${row.ageHours.toFixed( 1 )} h`, 9 ),
    pad( row.pager ?? '-', 7 ),
    pad( `sig ${row.sig ?? '-'}`, 9 ),
    pad( row.status, 9 ),
    row.place
  ].join( '' ) + `\n${' '.repeat( 12 )}${row.why}` );
  const picks = rows.filter( r => r.verdict === 'recommended' );
  const next = picks.length === 0 ?
    'No new event deserves a video right now.' :
    `Recommended: ${picks.map( r => r.id ).join( ', ' )}. Nothing has been started. To produce one, see "Manual operation" in the README (npm run session -- produce ${picks[0].id}).`;
  return [ header, rules, '', ...( lines.length > 0 ? lines : [ '(no earthquakes in this window)' ] ), '', next ].join( '\n' );
}
