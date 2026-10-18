import { describe, expect, it } from 'vitest';
import { runPoll } from './poll.js';
import { NOW, collection, defaultConfig, fakeEnvironment, feature, minutesAgo } from './testing.js';

const dry = defaultConfig( { MONITOR_DRY_RUN: 'true' } );
const real = defaultConfig();
const fresh = ( id: string, extra: Partial<Parameters<typeof feature>[0]> = {} ) => feature( { id, mag: 6.4, time: minutesAgo( 5 ), sig: 700, ...extra } );

describe( 'first start (baseline)', () => {
  it( 'records old events as baseline and never starts them, but still starts a fresh event', async () => {
    const env = fakeEnvironment();
    env.setFeed( collection( fresh( 'old1', { time: minutesAgo( 300 ) } ), fresh( 'new1' ) ) );
    const summary = await runPoll( env.deps, real );
    expect( env.state().events.old1.state ).toBe( 'baseline' );
    expect( env.state().baselinedAt ).not.toBeNull();
    expect( summary.decision ).toBe( 'started' );
    expect( env.started.map( s => s.eventId ) ).toEqual( [ 'new1' ] );
  } );

  it( 'does not start a baseline event later, even after a USGS update makes it look stronger', async () => {
    const env = fakeEnvironment();
    env.setFeed( collection( fresh( 'old1', { time: minutesAgo( 300 ), alert: null } ) ) );
    await runPoll( env.deps, real );
    env.setFeed( collection( fresh( 'old1', { time: minutesAgo( 300 ), alert: 'red', sig: 900 } ) ) );
    expect( ( await runPoll( env.deps, real ) ).decision ).toBe( 'none' );
    expect( env.started ).toEqual( [] );
  } );
} );

describe( 'updates before a start', () => {
  it( 'does not permanently exclude an event that lacked PAGER; it becomes eligible after an update', async () => {
    const env = fakeEnvironment( { version: 1, baselinedAt: '2026-10-18T00:00:00.000Z', events: {}, startsByDay: {} } );
    const weak = feature( { id: 'us5', mag: 5.7, time: minutesAgo( 10 ), sig: 450, alert: null } );
    env.setFeed( collection( weak ) );
    expect( ( await runPoll( env.deps, real ) ).decision ).toBe( 'none' );
    expect( env.state().events.us5.evaluation.reasons ).toEqual( [ 'needs_pager_or_significance' ] );
    env.setFeed( collection( feature( { id: 'us5', mag: 5.7, time: minutesAgo( 10 ), sig: 650, alert: 'yellow' } ) ) );
    env.setNow( NOW + 5 * 60_000 );
    const second = await runPoll( env.deps, real );
    expect( second.decision ).toBe( 'started' );
    expect( env.started ).toHaveLength( 1 );
  } );

  it( 'becomes eligible when it is old enough (too_young is temporary)', async () => {
    const env = fakeEnvironment( { version: 1, baselinedAt: '2026-10-18T00:00:00.000Z', events: {}, startsByDay: {} } );
    env.setFeed( collection( fresh( 'us6', { time: minutesAgo( 1 ) } ) ) );
    expect( ( await runPoll( env.deps, real ) ).decision ).toBe( 'none' );
    env.setNow( NOW + 2 * 60_000 );
    expect( ( await runPoll( env.deps, real ) ).decision ).toBe( 'started' );
  } );

  it( 'never restarts an event whose workflow already started, whatever USGS updates', async () => {
    const env = fakeEnvironment( { version: 1, baselinedAt: '2026-10-18T00:00:00.000Z', events: {}, startsByDay: {} } );
    env.setFeed( collection( fresh( 'us7' ) ) );
    await runPoll( env.deps, real );
    env.workflows.set( 'quake_video-us7', { found: true, running: false, outcome: 'ready_for_approval' } );
    env.setFeed( collection( fresh( 'us7', { alert: 'red', sig: 999, updated: NOW + 1000 } ) ) );
    env.setNow( NOW + 10 * 60_000 );
    await runPoll( env.deps, real );
    expect( env.started ).toHaveLength( 1 );
    expect( env.state().events.us7.state ).toBe( 'ready_for_approval' );
  } );
} );

describe( 'deduplication', () => {
  it( 'treats an alias ID as the same event', async () => {
    const env = fakeEnvironment( { version: 1, baselinedAt: '2026-10-18T00:00:00.000Z', events: {}, startsByDay: {} } );
    env.setFeed( collection( fresh( 'us8', { ids: ',us8,ak99,' } ) ) );
    await runPoll( env.deps, real );
    env.workflows.set( 'quake_video-us8', { found: true, running: false, outcome: 'ready_for_approval' } );
    env.setFeed( collection( fresh( 'ak99', { ids: ',ak99,us8,' } ) ) );
    env.setNow( NOW + 6 * 60_000 );
    const summary = await runPoll( env.deps, real );
    expect( summary.newEvents ).toBe( 0 );
    expect( env.started ).toHaveLength( 1 );
  } );
} );

describe( 'dry run', () => {
  it( 'starts nothing and counts nothing, and its observations stay startable in real mode', async () => {
    const env = fakeEnvironment( { version: 1, baselinedAt: '2026-10-18T00:00:00.000Z', events: {}, startsByDay: {} } );
    env.setFeed( collection( fresh( 'us9' ) ) );
    const summary = await runPoll( env.deps, dry );
    expect( summary ).toMatchObject( { decision: 'dry_run_would_start', eventId: 'us9', startsToday: 0 } );
    expect( env.started ).toEqual( [] );
    expect( env.state().events.us9.state ).toBe( 'would_start' );
    env.setNow( NOW + 5 * 60_000 );
    expect( ( await runPoll( env.deps, real ) ).decision ).toBe( 'started' );
    expect( env.started.map( s => s.eventId ) ).toEqual( [ 'us9' ] );
  } );
} );

describe( 'spending and concurrency', () => {
  const base = () => fakeEnvironment( { version: 1, baselinedAt: '2026-10-18T00:00:00.000Z', events: {}, startsByDay: {} } );

  it( 'stops at the daily limit', async () => {
    const env = base();
    for ( const [ i, id ] of [ 'a1', 'a2', 'a3' ].entries() ) {
      env.setFeed( collection( fresh( id, { sig: 700 + i } ) ) );
      env.setNow( NOW + i * 5 * 60_000 );
      const summary = await runPoll( env.deps, real );
      if ( summary.eventId === id && summary.decision === 'started' ) {
        env.workflows.set( `quake_video-${id}`, { found: true, running: false, outcome: 'ready_for_approval' } );
      }
    }
    expect( env.started.map( s => s.eventId ) ).toEqual( [ 'a1', 'a2' ] );
    expect( env.state().startsByDay[ '2026-10-18' ] ).toBe( 2 );
    expect( env.state().events.a3.state ).toBe( 'observed' );
  } );

  it( 'never starts a second workflow while one is running', async () => {
    const env = base();
    env.setFeed( collection( fresh( 'b1' ), fresh( 'b2', { sig: 650 } ) ) );
    expect( ( await runPoll( env.deps, real ) ).eventId ).toBe( 'b1' );
    env.setNow( NOW + 5 * 60_000 );
    const second = await runPoll( env.deps, real );
    expect( second ).toMatchObject( { decision: 'busy', inFlight: 1 } );
    expect( env.started ).toHaveLength( 1 );
  } );

  it( 'picks the highest-significance event first', async () => {
    const env = base();
    env.setFeed( collection( fresh( 'low', { sig: 610 } ), fresh( 'high', { sig: 800 } ) ) );
    await runPoll( env.deps, real );
    expect( env.started.map( s => s.eventId ) ).toEqual( [ 'high' ] );
  } );

  it( 'does not restart a failed workflow', async () => {
    const env = base();
    env.setFeed( collection( fresh( 'c1' ) ) );
    await runPoll( env.deps, real );
    env.workflows.set( 'quake_video-c1', { found: true, running: false, outcome: 'failed' } );
    env.setNow( NOW + 5 * 60_000 );
    await runPoll( env.deps, real );
    expect( env.state().events.c1.state ).toBe( 'failed' );
    expect( env.started ).toHaveLength( 1 );
  } );
} );

describe( 'ambiguous starts and failures', () => {
  const base = () => fakeEnvironment( { version: 1, baselinedAt: '2026-10-18T00:00:00.000Z', events: {}, startsByDay: {} } );

  it( 'persists the intent before calling the API', async () => {
    const env = base();
    env.setFeed( collection( fresh( 'd1' ) ) );
    let stateAtStart: string | undefined;
    const original = env.deps.api.start;
    env.deps.api.start = async ( id, input ) => { stateAtStart = env.state().events.d1?.state; return original( id, input ); };
    await runPoll( env.deps, real );
    expect( stateAtStart ).toBe( 'starting' );
  } );

  it( 'treats a lost response as started when the workflow exists (no second start)', async () => {
    const env = base();
    env.failStart.mode = 'after_created';
    env.setFeed( collection( fresh( 'e1' ) ) );
    expect( ( await runPoll( env.deps, real ) ).decision ).toBe( 'started' );
    env.failStart.mode = null;
    env.setNow( NOW + 5 * 60_000 );
    await runPoll( env.deps, real );
    expect( env.started ).toHaveLength( 1 );
  } );

  it( 'retries only when no workflow exists, and gives up after the attempt limit', async () => {
    const env = base();
    env.failStart.mode = 'unknown';
    env.setFeed( collection( fresh( 'f1' ) ) );
    for ( let i = 0; i < 4; i++ ) {
      env.setNow( NOW + i * 5 * 60_000 );
      await runPoll( env.deps, real );
    }
    expect( env.started ).toEqual( [] );
    expect( env.state().events.f1.state ).toBe( 'failed' );
    expect( env.state().events.f1.startAttempts ).toBe( 3 );
    expect( env.state().startsByDay[ '2026-10-18' ] ).toBe( 0 );
  } );

  it( 'leaves state untouched when USGS fails, and never fabricates events', async () => {
    const env = base();
    env.setFeed( collection( fresh( 'g1' ) ) );
    await runPoll( env.deps, dry );
    const before = env.state();
    const saves = env.saves();
    env.setFeed( new Error( 'USGS request failed with HTTP 503' ) );
    const summary = await runPoll( env.deps, real );
    expect( summary ).toMatchObject( { ok: false, decision: 'poll_failed', nextPollSeconds: 60 } );
    expect( env.state() ).toEqual( before );
    expect( env.saves() ).toBe( saves );
  } );

  it( 'ignores unusable features and keeps going', async () => {
    const env = base();
    env.setFeed( collection( { type: 'Feature', properties: {}, geometry: {} }, fresh( 'h1' ) ) );
    const summary = await runPoll( env.deps, dry );
    expect( summary ).toMatchObject( { unusable: 1, fetched: 1, decision: 'dry_run_would_start' } );
  } );
} );
