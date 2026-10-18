import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { emptyState, fileStore, findRecord, prune } from './state.js';
import type { EventRecord } from './state.js';

let dir: string;
beforeEach( () => { dir = mkdtempSync( join( tmpdir(), 'monitor-' ) ); } );
afterEach( () => rmSync( dir, { recursive: true, force: true } ) );

const record = ( id: string, overrides: Partial<EventRecord> = {} ): EventRecord => ( {
  id, ids: [ id ], firstSeen: '2026-10-18T10:00:00.000Z', lastSeen: '2026-10-18T10:00:00.000Z', state: 'observed',
  evaluation: { eligible: false, reasons: [] }, snapshot: { magnitude: 6, status: 'automatic', alert: null, sig: 500, updated: null },
  workflowId: null, startedAt: null, startAttempts: 0, note: null, ...overrides
} );

describe( 'fileStore', () => {
  it( 'starts empty, round-trips, and leaves no temporary file', () => {
    const store = fileStore( dir );
    expect( store.load() ).toEqual( emptyState() );
    const state = { ...emptyState(), baselinedAt: '2026-10-18T10:00:00.000Z', events: { a: record( 'a' ) } };
    store.save( state );
    expect( fileStore( dir ).load() ).toEqual( state ); // a new store instance = a worker restart
    expect( readdirSync( dir ) ).toEqual( [ 'monitor.json' ] );
  } );

  it( 'refuses a corrupt or unexpected file instead of starting over', () => {
    writeFileSync( join( dir, 'monitor.json' ), '{ broken' );
    expect( () => fileStore( dir ).load() ).toThrow( 'not valid JSON' );
    writeFileSync( join( dir, 'monitor.json' ), '{"version":2}' );
    expect( () => fileStore( dir ).load() ).toThrow( 'unexpected shape' );
    expect( existsSync( join( dir, 'monitor.json' ) ) ).toBe( true );
  } );
} );

describe( 'findRecord and prune', () => {
  it( 'finds an event under any of its IDs', () => {
    const state = { ...emptyState(), events: { a: record( 'a', { ids: [ 'a', 'b' ] } ) } };
    expect( findRecord( state, [ 'b', 'zzz' ] )?.id ).toBe( 'a' );
    expect( findRecord( state, [ 'zzz' ] ) ).toBeUndefined();
  } );

  it( 'drops old finished records but keeps in-flight ones', () => {
    const old = '2026-10-01T00:00:00.000Z';
    const state = { ...emptyState(), events: { a: record( 'a', { firstSeen: old } ), b: record( 'b', { firstSeen: old, state: 'started' } ), c: record( 'c' ) } };
    expect( Object.keys( prune( state, Date.parse( '2026-10-18T12:00:00.000Z' ) ).events ).sort() ).toEqual( [ 'b', 'c' ] );
  } );
} );
