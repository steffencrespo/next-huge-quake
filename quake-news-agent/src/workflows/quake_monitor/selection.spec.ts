import { describe, expect, it } from 'vitest';
import { loadMonitorConfig } from './config.js';
import { byPriority, evaluate, observe } from './selection.js';
import { NOW, defaultConfig, feature, minutesAgo } from './testing.js';

const config = defaultConfig();
const ev = ( o: Parameters<typeof feature>[0] ) => evaluate( observe( feature( o ) ), config, NOW );

describe( 'evaluate', () => {
  it( 'accepts a fresh M6.0+ event even with preliminary data and no PAGER', () => {
    expect( ev( { id: 'us1', mag: 6.0, time: minutesAgo( 3 ), status: 'automatic' } ) ).toEqual( { eligible: true, reasons: [] } );
  } );

  it( 'needs PAGER yellow or worse, or significance >= 600, between M5.5 and M5.9', () => {
    expect( ev( { id: 'us2', mag: 5.7, time: minutesAgo( 10 ), alert: 'yellow', sig: 400 } ).eligible ).toBe( true );
    expect( ev( { id: 'us3', mag: 5.6, time: minutesAgo( 10 ), sig: 600 } ).eligible ).toBe( true );
    expect( ev( { id: 'us4', mag: 5.9, time: minutesAgo( 10 ), alert: 'green', sig: 536 } ).reasons ).toEqual( [ 'needs_pager_or_significance' ] );
    expect( ev( { id: 'us5', mag: 5.5, time: minutesAgo( 10 ), alert: null, sig: null as never } ).eligible ).toBe( false );
  } );

  it( 'applies the minimum and maximum age', () => {
    expect( ev( { id: 'us6', mag: 6.5, time: minutesAgo( 1 ) } ).reasons ).toEqual( [ 'too_young' ] );
    expect( ev( { id: 'us7', mag: 6.5, time: minutesAgo( 2 ) } ).eligible ).toBe( true );
    expect( ev( { id: 'us8', mag: 6.5, time: minutesAgo( 12 * 60 + 1 ) } ).reasons ).toEqual( [ 'too_old' ] );
  } );

  it( 'rejects other event types, deleted events and weak events', () => {
    expect( ev( { id: 'us9', mag: 7, time: minutesAgo( 10 ), type: 'explosion' } ).reasons ).toContain( 'not_an_earthquake' );
    expect( ev( { id: 'us10', mag: 7, time: minutesAgo( 10 ), status: 'deleted' } ).reasons ).toContain( 'deleted' );
    expect( ev( { id: 'us11', mag: 5.0, time: minutesAgo( 10 ) } ).reasons ).toContain( 'below_magnitude' );
  } );

  it( 'honors configured thresholds', () => {
    const strict = loadMonitorConfig( { MONITOR_STRONG_MAGNITUDE: '7', MONITOR_MIN_AGE_MINUTES: '20' } );
    expect( evaluate( observe( feature( { id: 'us12', mag: 6.5, time: minutesAgo( 10 ) } ) ), strict, NOW ).reasons ).toEqual( [ 'needs_pager_or_significance', 'too_young' ] );
    expect( () => loadMonitorConfig( { MONITOR_MAX_STARTS_PER_DAY: 'many' } ) ).toThrow( 'MONITOR_MAX_STARTS_PER_DAY' );
  } );

  it( 'is a dry run unless MONITOR_DRY_RUN is exactly "false"', () => {
    expect( loadMonitorConfig( {} ).dryRun ).toBe( true );
    expect( loadMonitorConfig( { MONITOR_DRY_RUN: 'no' } ).dryRun ).toBe( true );
    expect( loadMonitorConfig( { MONITOR_DRY_RUN: 'false' } ).dryRun ).toBe( false );
    expect( loadMonitorConfig( {} ).maxStartsPerDay ).toBe( 2 );
  } );
} );

describe( 'observe and priority', () => {
  it( 'collects every alias USGS lists', () => {
    expect( observe( feature( { id: 'us1', mag: 6, time: minutesAgo( 5 ), ids: ',ak2,us1,pt3,' } ) ).ids.sort() ).toEqual( [ 'ak2', 'pt3', 'us1' ] );
  } );

  it( 'ranks by significance first, so a moderate quake near people can outrank a larger remote one', () => {
    const remote = observe( feature( { id: 'remote', mag: 6.9, time: minutesAgo( 30 ), sig: 650, alert: 'green' } ) );
    const populated = observe( feature( { id: 'populated', mag: 5.7, time: minutesAgo( 30 ), sig: 800, alert: 'orange' } ) );
    expect( [ remote, populated ].sort( byPriority ).map( o => o.facts.id ) ).toEqual( [ 'populated', 'remote' ] );
    const tie = observe( feature( { id: 'tie', mag: 6.9, time: minutesAgo( 30 ), sig: 650 } ) );
    expect( [ tie, remote ].sort( byPriority ).map( o => o.facts.id ) ).toEqual( [ 'remote', 'tie' ] );
  } );
} );
