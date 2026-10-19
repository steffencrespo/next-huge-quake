import { describe, expect, it } from 'vitest';
import { scopesSatisfy, READ_SCOPES, WRITE_SCOPES } from './auth.js';
import { composeDescription, contentHash, isApproved, loadManifest, validateManifest, type Manifest } from './manifest.js';
import { assertAuthorizedChannel, likelyDuplicates, schedulePreflight, uploadPreflight } from './publish.js';
import { isEditorialSlot, localToUtc, proposeSlots, toApiTimestamp } from './schedule.js';
import type { VideoInfo } from './youtube.js';

/** The committed manifests are already approved; tests start from the unapproved form. */
const m = (): Manifest => ( { ...loadManifest( 'chile1960' ), approval: undefined } );
const video = ( over: Partial<VideoInfo> ): VideoInfo => ( { id: 'v', title: 't', description: '', tags: [], ...over } );
const approved = ( x: Manifest ): Manifest => ( { ...x, approval: { status: 'approved', approvedAt: 'now', contentHash: contentHash( x ) } } );

describe( 'scopes', () => {
  it( 'read-only token does not satisfy write; write token satisfies read', () => {
    expect( scopesSatisfy( READ_SCOPES.join( ' ' ), WRITE_SCOPES ) ).toBe( false );
    expect( scopesSatisfy( WRITE_SCOPES.join( ' ' ), READ_SCOPES ) ).toBe( true );
  } );
} );

describe( 'schedule', () => {
  it( 'converts São Paulo wall-clock to UTC (UTC-3, no DST)', () => {
    expect( toApiTimestamp( localToUtc( '2026-10-27T18:00' ) ) ).toBe( '2026-10-27T21:00:00Z' );
    expect( toApiTimestamp( localToUtc( '2026-01-15T18:00' ) ) ).toBe( '2026-01-15T21:00:00Z' );
  } );
  it( 'recognises only Tue/Thu/Sat 18:00', () => {
    expect( isEditorialSlot( '2026-10-27T18:00' ) ).toBe( true ); // Tue
    expect( isEditorialSlot( '2026-10-28T18:00' ) ).toBe( false ); // Wed
    expect( isEditorialSlot( '2026-10-27T17:00' ) ).toBe( false );
  } );
  it( 'proposes slots after the lead time and skips booked ones', () => {
    const now = new Date( '2026-10-19T03:00:00Z' ); // Mon 00:00 São Paulo
    expect( proposeSlots( 3, [], now ) ).toEqual( [ '2026-10-20T18:00', '2026-10-22T18:00', '2026-10-24T18:00' ] );
    expect( proposeSlots( 2, [ localToUtc( '2026-10-20T18:00' ) ], now ) ).toEqual( [ '2026-10-22T18:00', '2026-10-24T18:00' ] );
    expect( proposeSlots( 1, [], new Date( '2026-10-20T10:00:00Z' ) ) ).toEqual( [ '2026-10-22T18:00' ] ); // Tue 07:00: <24h to 18:00
  } );
} );

describe( 'manifests', () => {
  it( 'the three real manifests are valid', () => {
    for ( const id of [ 'chile1960', 'japan2011', 'sanfrancisco1906' ] ) expect( validateManifest( loadManifest( id ) ) ).toEqual( [] );
  } );
  it( 'description carries the credits and the Output.ai block verbatim', () => {
    expect( composeDescription( m() ) ).toMatch( /Production Technology\nAutomated news and video production powered by Output\.ai\nhttps:\/\/output\.ai$/ );
  } );
  it( 'rejects missing audience declaration, unknown playlist, and bad title', () => {
    const bad = { ...m(), madeForKids: undefined as any, playlistId: 'PLother', approved: { ...m().approved, title: 'x'.repeat( 101 ) } };
    expect( validateManifest( bad ).length ).toBe( 3 );
  } );
  it( 'approval goes stale when the approved text changes', () => {
    const a = approved( m() );
    expect( isApproved( a ) ).toBe( true );
    expect( isApproved( { ...a, approved: { ...a.approved, title: 'changed' } } ) ).toBe( false );
  } );
} );

describe( 'safety checks', () => {
  it( 'refuses any channel but the authorized one', () => {
    expect( () => assertAuthorizedChannel( [ { id: 'UCother', title: 'x' } ] ) ).toThrow( /Refusing/ );
    expect( () => assertAuthorizedChannel( [ { id: 'UCgJzKvpcPvzQT-YtBsJb6eQ', title: 'x' }, { id: 'UCother', title: 'y' } ] ) ).toThrow();
    expect( () => assertAuthorizedChannel( [ { id: 'UCgJzKvpcPvzQT-YtBsJb6eQ', title: 'x' } ] ) ).not.toThrow();
  } );
  it( 'blocks unapproved, already-uploaded and duplicate-titled videos', () => {
    expect( uploadPreflight( m(), {}, [] ).problems.join() ).toMatch( /Not approved/ );
    expect( uploadPreflight( approved( m() ), {}, [] ).problems ).toEqual( [] );
    const state = { chile1960: { status: 'uploaded', videoId: 'abc', contentHash: 'h', fileSize: 1, updatedAt: '' } } as const;
    expect( uploadPreflight( approved( m() ), state, [] ).problems.join() ).toMatch( /Already uploaded/ );
    const dupe = video( { id: 'old', title: 'Chile 1960: the strongest earthquake ever recorded!' } );
    expect( likelyDuplicates( m(), [ dupe ] ) ).toHaveLength( 1 );
    expect( uploadPreflight( approved( m() ), {}, [ dupe ] ).problems.join() ).toMatch( /duplicate/ );
  } );
  it( 'an interrupted upload resumes instead of being refused or restarted', () => {
    const a = approved( m() );
    const state = { chile1960: { status: 'uploading', uploadUrl: 'u', contentHash: contentHash( a ), fileSize: 1, updatedAt: '' } } as const;
    const r = uploadPreflight( a, state, [] );
    expect( r.problems ).toEqual( [] );
    expect( r.warnings.join() ).toMatch( /RESUMED/ );
  } );
  it( 'schedule refuses booked slots, off-calendar times and unuploaded videos', () => {
    const a = approved( { ...m(), publishAtLocal: '2026-10-27T18:00' } );
    const state = { chile1960: { status: 'playlisted', videoId: 'me', contentHash: contentHash( a ), fileSize: 1, updatedAt: '' } } as const;
    const now = new Date( '2026-10-19T03:00:00Z' );
    expect( schedulePreflight( a, state, [], now ).problems ).toEqual( [] );
    const booked = video( { id: 'other', publishAt: '2026-10-27T21:00:00Z' } );
    expect( schedulePreflight( a, state, [ booked ], now ).problems.join() ).toMatch( /already booked/ );
    expect( schedulePreflight( approved( { ...a, publishAtLocal: '2026-10-28T18:00' } ), state, [], now ).problems.join() ).toMatch( /not a Tue/ );
    expect( schedulePreflight( a, {}, [], now ).problems.join() ).toMatch( /not uploaded/ );
  } );
  it( 'a scheduleException relaxes cadence and lead only for the manifest that carries it', () => {
    const now = new Date( '2026-10-19T03:00:00Z' );
    const plain = approved( { ...m(), publishAtLocal: '2026-10-19T03:55' } );
    const state = { chile1960: { status: 'playlisted', videoId: 'me', contentHash: contentHash( plain ), fileSize: 1, updatedAt: '' } } as const;
    expect( schedulePreflight( plain, state, [], now ).problems.join() ).toMatch( /not a Tue.*24 hours/s );
    const ex = approved( { ...plain, scheduleException: { reason: 'live API test', minLeadMinutes: 120 } } );
    const state2 = { chile1960: { ...state.chile1960, contentHash: contentHash( ex ) } };
    expect( schedulePreflight( ex, state2, [], new Date( '2026-10-19T03:00:00Z' ) ).problems ).toEqual( [] );
    expect( schedulePreflight( ex, state2, [], new Date( '2026-10-19T05:30:00Z' ) ).problems.join() ).toMatch( /120 minutes/ );
  } );
} );
