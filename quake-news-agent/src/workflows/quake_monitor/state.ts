import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from '@outputai/core';

/**
 * observed       seen, not started (may or may not be eligible yet; re-evaluated at every poll while in this state)
 * baseline       present at the very first poll and older than the grace period; never started
 * would_start    dry run chose it; still startable once real mode is on
 * starting       a start was recorded and may or may not have reached Temporal; blocks further starts
 * started        quake_video is running
 * ready_for_approval | rejected | no_candidate | failed    outcome of quake_video (no automatic restart)
 */
export const EVENT_STATES = [ 'observed', 'baseline', 'would_start', 'starting', 'started', 'ready_for_approval', 'rejected', 'no_candidate', 'failed' ] as const;
export type EventState = typeof EVENT_STATES[number];

export const STARTABLE: readonly EventState[] = [ 'observed', 'would_start' ];
export const IN_FLIGHT: readonly EventState[] = [ 'starting', 'started' ];

const eventRecordSchema = z.object( {
  id: z.string(),
  ids: z.array( z.string() ),
  firstSeen: z.string(),
  lastSeen: z.string(),
  state: z.enum( EVENT_STATES ),
  evaluation: z.object( { eligible: z.boolean(), reasons: z.array( z.string() ) } ),
  snapshot: z.object( {
    magnitude: z.number(),
    status: z.string(),
    alert: z.string().nullable(),
    sig: z.number().nullable(),
    updated: z.string().nullable()
  } ),
  workflowId: z.string().nullable(),
  startedAt: z.string().nullable(),
  startAttempts: z.number().int().nonnegative(),
  note: z.string().nullable()
} );

export const monitorStateSchema = z.object( {
  version: z.literal( 1 ),
  baselinedAt: z.string().nullable(),
  events: z.record( z.string(), eventRecordSchema ),
  /** Real workflow starts per UTC day (dry-run decisions are not counted). */
  startsByDay: z.record( z.string(), z.number().int().nonnegative() )
} );

export type EventRecord = z.infer<typeof eventRecordSchema>;
export type MonitorState = z.infer<typeof monitorStateSchema>;

export const emptyState = (): MonitorState => ( { version: 1, baselinedAt: null, events: {}, startsByDay: {} } );

/** The record for an event under any of its IDs, or undefined. */
export function findRecord( state: MonitorState, ids: string[] ): EventRecord | undefined {
  const wanted = new Set( ids );
  return Object.values( state.events ).find( record => record.ids.some( id => wanted.has( id ) ) );
}

export const utcDay = ( ms: number ): string => new Date( ms ).toISOString().slice( 0, 10 );

const KEEP_DAYS = 7;

/** Drops old finished records so the file stays small; in-flight records and recent ones are kept. */
export function prune( state: MonitorState, nowMs: number ): MonitorState {
  const cutoff = nowMs - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const events = Object.fromEntries( Object.entries( state.events )
    .filter( ( [ , record ] ) => ( IN_FLIGHT as readonly string[] ).includes( record.state ) || Date.parse( record.firstSeen ) >= cutoff ) );
  const startsByDay = Object.fromEntries( Object.entries( state.startsByDay ).filter( ( [ day ] ) => Date.parse( day ) >= cutoff - 24 * 60 * 60 * 1000 ) );
  return { ...state, events, startsByDay };
}

export type StateStore = { load(): MonitorState; save( state: MonitorState ): void };

/** Default location: quake-news-agent/state/ (found from this file, so the worker's cwd does not matter). */
export const defaultStateDir = (): string =>
  resolve( process.env.MONITOR_STATE_DIR ?? resolve( dirname( fileURLToPath( import.meta.url ) ), '../../../state' ) );

/**
 * JSON file store. save() writes a temporary file and renames it, so a crash never leaves a half-written state.
 * load() of a corrupt file throws instead of starting over, so a bad file can never cause old events to look new.
 */
export function fileStore( dir: string = defaultStateDir() ): StateStore {
  const file = join( dir, 'monitor.json' );
  return {
    load() {
      if ( !existsSync( file ) ) {
        return emptyState();
      }
      let raw: unknown;
      try {
        raw = JSON.parse( readFileSync( file, 'utf8' ) );
      } catch {
        throw new Error( `monitor state is not valid JSON: ${file} (fix or remove it; the monitor will not overwrite it)` );
      }
      const parsed = monitorStateSchema.safeParse( raw );
      if ( !parsed.success ) {
        throw new Error( `monitor state has an unexpected shape: ${file} (${z.prettifyError( parsed.error ).split( '\n' )[0]})` );
      }
      return parsed.data;
    },
    save( state ) {
      mkdirSync( dir, { recursive: true } );
      const temp = `${file}.tmp-${process.pid}`;
      writeFileSync( temp, `${JSON.stringify( state, null, 2 )}\n` );
      renameSync( temp, file );
    }
  };
}
