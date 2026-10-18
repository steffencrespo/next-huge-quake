/** Test helpers: synthetic USGS features and a fake poll environment. Not imported by the workflow. */
import { loadMonitorConfig } from './config.js';
import type { Inspection, PollDeps } from './poll.js';
import { emptyState } from './state.js';
import type { MonitorState, StateStore } from './state.js';

export const NOW = Date.parse( '2026-10-18T12:00:00.000Z' );
export const minutesAgo = ( minutes: number ) => NOW - minutes * 60_000;

export type FeatureOptions = {
  id: string; mag: number; time: number; alert?: string | null; sig?: number; type?: string; status?: string; ids?: string; updated?: number;
};

export const feature = ( { id, mag, time, alert = null, sig = 500, type = 'earthquake', status = 'automatic', ids, updated }: FeatureOptions ) => ( {
  type: 'Feature',
  id,
  properties: { mag, magType: 'mww', place: `Somewhere near ${id}`, time, updated: updated ?? time, status, alert, tsunami: 0, felt: null, sig, type, ids: ids ?? `,${id},` },
  geometry: { type: 'Point', coordinates: [ 100, 10, 20 ] }
} );

export const collection = ( ...features: unknown[] ) => ( { type: 'FeatureCollection', features } );
export const defaultConfig = ( overrides: Record<string, string> = {} ) => loadMonitorConfig( { MONITOR_DRY_RUN: 'false', ...overrides } );

export type Fake = {
  deps: PollDeps;
  state: () => MonitorState;
  started: Array<{ workflowId: string; eventId: string }>;
  saves: () => number;
  setFeed: ( body: unknown | Error ) => void;
  setNow: ( ms: number ) => void;
  workflows: Map<string, Inspection>;
  failStart: { mode: null | 'unknown' | 'after_created' };
};

/** Fake USGS feed, state store and Output API. */
export function fakeEnvironment( initial: MonitorState = emptyState() ): Fake {
  let current: MonitorState = structuredClone( initial );
  let saves = 0;
  let feed: unknown | Error = collection();
  let now = NOW;
  const workflows = new Map<string, Inspection>();
  const started: Fake['started'] = [];
  const failStart: Fake['failStart'] = { mode: null };
  const store: StateStore = {
    load: () => structuredClone( current ),
    save: next => { current = structuredClone( next ); saves++; }
  };
  const deps: PollDeps = {
    now: () => now,
    fetchFeed: async () => { if ( feed instanceof Error ) throw feed; return feed; },
    store,
    api: {
      inspect: async id => workflows.get( id ) ?? { found: false },
      start: async ( workflowId, input ) => {
        if ( failStart.mode === 'unknown' ) throw new Error( 'socket hang up' );
        workflows.set( workflowId, { found: true, running: true, outcome: null } );
        started.push( { workflowId, eventId: input.eventId } );
        if ( failStart.mode === 'after_created' ) throw new Error( 'response lost' );
      }
    }
  };
  return { deps, state: () => structuredClone( current ), started, saves: () => saves, setFeed: b => { feed = b; }, setNow: ms => { now = ms; }, workflows, failStart };
}
