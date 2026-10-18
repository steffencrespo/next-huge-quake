import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadMonitorConfig } from '../workflows/quake_monitor/config.js';
import { NOW, feature, minutesAgo } from '../workflows/quake_monitor/testing.js';
import { discover, formatReport, loadProducedIds } from './discover.js';

const config = loadMonitorConfig( { MONITOR_MAX_AGE_HOURS: '48' } );
const hoursAgo = ( h: number ) => NOW - h * 3_600_000;
const run = ( features: unknown[], produced: string[] = [] ) => discover( features, new Set( produced ), config, NOW );
const byId = ( rows: ReturnType<typeof run> ) => Object.fromEntries( rows.map( r => [ r.id, r ] ) );

describe( 'discover', () => {
  const features = [
    feature( { id: 'remote', mag: 6.9, time: hoursAgo( 30 ), sig: 650, alert: 'green' } ),
    feature( { id: 'populated', mag: 5.7, time: hoursAgo( 20 ), sig: 800, alert: 'orange' } ),
    feature( { id: 'strong2', mag: 6.2, time: hoursAgo( 5 ), sig: 620, alert: 'green' } ),
    feature( { id: 'weak', mag: 5.9, time: hoursAgo( 10 ), sig: 536, alert: 'green' } ),
    feature( { id: 'young', mag: 6.5, time: minutesAgo( 1 ), sig: 700 } ),
    feature( { id: 'old', mag: 6.5, time: hoursAgo( 49 ), sig: 700 } )
  ];

  it( 'ranks by USGS significance and recommends at most the daily limit', () => {
    const rows = run( features );
    const verdicts = Object.fromEntries( rows.map( r => [ r.id, r.verdict ] ) );
    expect( verdicts ).toMatchObject( { populated: 'recommended', remote: 'recommended', strong2: 'eligible', weak: 'not_eligible', young: 'not_eligible', old: 'not_eligible' } );
    expect( rows.filter( r => r.verdict === 'recommended' ) ).toHaveLength( config.maxStartsPerDay );
    expect( rows[0].id ).toBe( 'populated' ); // highest significance first, so a moderate quake near people outranks a bigger remote one
  } );

  it( 'explains why an event is eligible or not', () => {
    const rows = byId( run( features ) );
    expect( rows.populated.why ).toBe( 'PAGER orange' );
    expect( rows.remote.why ).toBe( 'M6.9 >= M6' );
    expect( rows.strong2.why ).toContain( 'beyond the 2-per-day limit' );
    expect( rows.weak.why ).toContain( 'needs PAGER yellow or worse, or significance >= 600' );
    expect( rows.young.why ).toBe( 'younger than 2 min' );
    expect( rows.old.why ).toBe( 'older than 48 h' );
  } );

  it( 'never recommends an event that already has a video, including under an alias ID', () => {
    const rows = byId( run( [ feature( { id: 'us1', mag: 6.8, time: hoursAgo( 5 ), sig: 700, ids: ',us1,ak9,' } ), feature( { id: 'us2', mag: 6.1, time: hoursAgo( 6 ), sig: 650 } ) ], [ 'ak9' ] ) );
    expect( rows.us1.verdict ).toBe( 'produced' );
    expect( rows.us2.verdict ).toBe( 'recommended' );
  } );

  it( 'skips unusable features and handles an empty window', () => {
    expect( run( [ { type: 'Feature', properties: {}, geometry: {} } ] ) ).toEqual( [] );
    expect( formatReport( [], config, NOW ) ).toContain( 'No new event deserves a video right now.' );
  } );

  it( 'prints a readable shortlist with the next step but starts nothing', () => {
    const text = formatReport( run( features ), config, NOW );
    expect( text ).toContain( 'last 48 h' );
    expect( text ).toMatch( /RECOMMENDED\s+populated\s+M5\.7\s+2026-10-17 16:00 UTC\s+20\.0 h\s+orange\s+sig 800/ );
    expect( text ).toContain( 'Recommended: populated, remote.' );
    expect( text ).toContain( 'session -- produce populated' );
  } );
} );

describe( 'loadProducedIds', () => {
  let dir: string;
  beforeEach( () => { dir = mkdtempSync( join( tmpdir(), 'discover-' ) ); } );
  afterEach( () => rmSync( dir, { recursive: true, force: true } ) );

  it( 'reads video packages and the monitor state; tolerates missing files', () => {
    expect( loadProducedIds( { videoOutDir: join( dir, 'none' ), stateFile: join( dir, 'none.json' ) } ).size ).toBe( 0 );
    mkdirSync( join( dir, 'packages', 'us1' ), { recursive: true } );
    writeFileSync( join( dir, 'packages', 'us1', 'package.json' ), '{}' );
    mkdirSync( join( dir, 'packages', 'empty' ), { recursive: true } );
    writeFileSync( join( dir, 'monitor.json' ), JSON.stringify( { events: {
      a: { state: 'started', ids: [ 'a', 'a-alias' ] },
      b: { state: 'would_start', ids: [ 'b' ] },
      c: { state: 'failed', ids: [ 'c' ] }
    } } ) );
    expect( [ ...loadProducedIds( { videoOutDir: dir, stateFile: join( dir, 'monitor.json' ) } ) ].sort() ).toEqual( [ 'a', 'a-alias', 'c', 'us1' ] );
  } );
} );
