import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runPoll } from '../workflows/quake_monitor/poll.js';
import { observe } from '../workflows/quake_monitor/selection.js';
import type { EventRecord } from '../workflows/quake_monitor/state.js';
import { NOW, collection, defaultConfig, fakeEnvironment, feature, minutesAgo } from '../workflows/quake_monitor/testing.js';
import { worstCaseEventUsd } from './budget.js';
import { loadFastTrackConfig } from './config.js';
import { ledgerStore } from './ledger.js';
import { fastTrackStart } from './start.js';

const prices = {
  FAST_TRACK_ENABLED: 'true', FAST_TRACK_PER_EVENT_BUDGET_USD: '1', FAST_TRACK_DAILY_BUDGET_USD: '2', FAST_TRACK_MONTHLY_BUDGET_USD: '20',
  FAST_TRACK_ANTHROPIC_INPUT_USD_PER_MTOK: '3', FAST_TRACK_ANTHROPIC_OUTPUT_USD_PER_MTOK: '15', FAST_TRACK_LLM_MAX_INPUT_TOKENS_PER_CALL: '4000',
  FAST_TRACK_ELEVENLABS_USD_PER_1K_CHARS: '0.3', FAST_TRACK_MAX_NARRATION_CHARS: '600'
};
const record = { firstSeen: '2026-10-18T11:50:00.000Z' } as EventRecord;
const obs = ( mag: number, alert: string | null = 'orange' ) => observe( feature( { id: `us${mag}`, mag, time: minutesAgo( 10 ), alert } ) );
const store = () => ledgerStore( mkdtempSync( join( tmpdir(), 'ft-' ) ) );

describe( 'fast-track start decision', () => {
  it( 'produces normally when off, paused, not a candidate, or without budget settings', () => {
    expect( fastTrackStart( obs( 7 ), record, NOW, loadFastTrackConfig( {} ), false, store() ) ).toEqual( { kind: 'normal', note: null } );
    expect( fastTrackStart( obs( 7 ), record, NOW, loadFastTrackConfig( prices ), true, store() ) ).toEqual( { kind: 'normal', note: null } );
    expect( fastTrackStart( obs( 5.8 ), record, NOW, loadFastTrackConfig( prices ), false, store() ) ).toEqual( { kind: 'normal', note: null } );
    expect( fastTrackStart( obs( 7, 'red' ), record, NOW, loadFastTrackConfig( prices ), false, store() ) ).toEqual( { kind: 'normal', note: null } );
    const noPrices = fastTrackStart( obs( 7 ), record, NOW, loadFastTrackConfig( { FAST_TRACK_ENABLED: 'true' } ), false, store() );
    expect( noPrices ).toMatchObject( { kind: 'normal', note: expect.stringContaining( 'budget not configured' ) } );
  } );

  it( 'reserves the worst case before the start and stops once a limit is spent', () => {
    const ledger = store();
    const config = loadFastTrackConfig( prices );
    expect( fastTrackStart( obs( 7 ), record, NOW, config, false, ledger ) ).toEqual( { kind: 'fast_track', detectedAtUtc: record.firstSeen } );
    expect( ledger.load().reservations.us7.usd ).toBe( worstCaseEventUsd( config.budget! ) );
    const tight = loadFastTrackConfig( { ...prices, FAST_TRACK_DAILY_BUDGET_USD: String( worstCaseEventUsd( config.budget! ) * 1.5 ) } );
    expect( fastTrackStart( obs( 6.5 ), record, NOW, tight, false, ledger ) ).toMatchObject( { kind: 'stop', reason: expect.stringContaining( 'daily limit' ) } );
  } );
} );

describe( 'monitor with the fast-track hook', () => {
  it( 'passes the fast-track flag to quake_video, and starts nothing when the budget says stop', async () => {
    const env = fakeEnvironment();
    env.setFeed( collection( feature( { id: 'us1', mag: 7, time: minutesAgo( 10 ), alert: 'orange' } ) ) );
    const inputs: unknown[] = [];
    const start = env.deps.api.start;
    env.deps.api.start = async ( id, input ) => { inputs.push( input ); return start( id, input ); };
    await runPoll( { ...env.deps, fastTrack: () => ( { kind: 'fast_track', detectedAtUtc: 'T0' } ) }, defaultConfig() );
    expect( inputs ).toEqual( [ { eventId: 'us1', asOfUtc: new Date( NOW ).toISOString(), fastTrack: { detectedAtUtc: 'T0' } } ] );

    const capped = fakeEnvironment();
    capped.setFeed( collection( feature( { id: 'us2', mag: 7, time: minutesAgo( 10 ), alert: 'orange' } ) ) );
    const summary = await runPoll( { ...capped.deps, fastTrack: () => ( { kind: 'stop', reason: 'daily limit $2 reached' } ) }, defaultConfig() );
    expect( summary.decision ).toBe( 'budget_capped' );
    expect( capped.started ).toEqual( [] );
    expect( capped.state().events.us2 ).toMatchObject( { state: 'observed', note: 'not started: daily limit $2 reached' } );
    expect( capped.state().startsByDay ).toEqual( {} );
  } );
} );
