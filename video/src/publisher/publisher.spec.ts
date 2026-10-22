import { describe, expect, it } from 'vitest';
import { scopesSatisfy, READ_SCOPES, WRITE_SCOPES } from './auth.js';
import { composeDescription, contentHash, isApproved, loadManifest, validateManifest, type Manifest } from './manifest.js';
import { assertAuthorizedChannel, likelyDuplicates, reconcilePlan, schedulePreflight, strictInspection, uploadPreflight, uploadResume } from './publish.js';
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
    const unscheduled = { chile1960: { ...state.chile1960, status: 'playlisted' } } as const; // e.g. a video whose schedule was removed in Studio
    expect( uploadPreflight( approved( m() ), unscheduled, [] ).problems.join() ).toMatch( /Already playlisted/ );
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

describe( 'fast track', () => {
  const ft = (): Manifest => ( {
    ...loadManifest( 'tibet-m70-us6000u43g' ), approval: undefined,
    fastTrack: { policy: 'fast-track@1', tier: 'A', signals: [ 'pager_orange' ], evaluatedAt: '2026-10-22T15:59:00Z', facts: { eventId: 'us6000u43g', magnitude: 7, pagerAlert: 'orange' } },
  } );
  const rec = ( x: Manifest, over: object = {} ) => ( { status: 'playlisted', videoId: 'vid', contentHash: contentHash( x ), fileSize: 1, updatedAt: '', ...over } ) as const;
  const live = ( x: Manifest, over: Partial<VideoInfo> = {} ) => video( {
    id: 'vid', title: x.approved.title, description: composeDescription( x ), tags: x.approved.tags, categoryId: x.categoryId, language: x.language,
    madeForKids: false, privacy: 'private', uploadStatus: 'processed', ...over,
  } );
  const channels = [ { id: 'UCgJzKvpcPvzQT-YtBsJb6eQ', title: 'NHQ' } ];

  it( 'binds the approval to the facts snapshot and leaves existing hashes unchanged', () => {
    const plain = loadManifest( 'tibet-m70-us6000u43g' );
    expect( isApproved( plain ) ).toBe( true ); // the committed, human-approved manifest still verifies
    const a = approved( ft() );
    expect( isApproved( a ) ).toBe( true );
    expect( isApproved( { ...a, fastTrack: { ...a.fastTrack!, facts: { ...a.fastTrack!.facts, magnitude: 7.2 } } } ) ).toBe( false );
  } );

  it( 'never lets a fast-track manifest be scheduled or leave the Latest Earthquakes playlist', () => {
    expect( validateManifest( ft() ) ).toEqual( [] );
    expect( validateManifest( { ...ft(), publishAtLocal: '2026-10-27T18:00' } ).join() ).toMatch( /never scheduled/ );
    expect( validateManifest( { ...ft(), playlistId: 'PLDquHuxZZySw' } ).join() ).toMatch( /Latest Earthquakes/ );
    expect( validateManifest( { ...ft(), fastTrack: { ...ft().fastTrack!, policy: 'fast-track' } } ).join() ).toMatch( /versioned policy/ );
  } );

  it( 'strict inspection passes only when everything matches, and fails closed otherwise', () => {
    const a = approved( ft() );
    const base = { m: a, rec: rec( a ), channels, video: live( a ), playlistMemberships: 1, expect: 'private' as const };
    expect( strictInspection( base ) ).toEqual( [] );
    expect( strictInspection( { ...base, expect: 'public' } ).join() ).toMatch( /Privacy is private, expected public/ );
    expect( strictInspection( { ...base, expect: 'public', video: live( a, { privacy: 'public', uploadStatus: 'uploaded' } ) } ).join() ).toMatch( /expected processed/ );
    expect( strictInspection( { ...base, video: live( a, { title: 'other' } ) } ).join() ).toMatch( /title on YouTube differs/ );
    expect( strictInspection( { ...base, playlistMemberships: 0 } ).join() ).toMatch( /exactly one membership/ );
    expect( strictInspection( { ...base, channels: [ { id: 'UCother', title: 'x' } ] } ).join() ).toMatch( /Refusing/ );
    expect( strictInspection( { ...base, m: ft() } ).join() ).toMatch( /not approved/ );
    expect( strictInspection( { ...base, rec: rec( a, { contentHash: 'old' } ) } ).join() ).toMatch( /content hash/ );
    expect( strictInspection( { ...base, video: live( a, { publishAt: '2026-11-03T21:00:00Z' } ) } ).join() ).toMatch( /publishAt/ );
    expect( strictInspection( { ...base, rec: undefined } ).join() ).toMatch( /No uploaded video/ );
    expect( strictInspection( { ...base, video: undefined } ).join() ).toMatch( /not found/ );
  } );

  it( 'reconcile moves the record forward only to what YouTube shows', () => {
    const a = approved( ft() );
    const plan = ( over: object ) => reconcilePlan( { m: a, rec: rec( a ), video: live( a ), titleMatches: [], playlistItemIds: [ 'pi' ], ...over } );
    expect( plan( {} ) ).toMatchObject( { problems: [] } );
    expect( plan( { rec: rec( a, { status: 'uploaded' } ) } ).patch ).toEqual( { status: 'playlisted', playlistItemId: 'pi' } );
    expect( plan( { video: live( a, { privacy: 'public' } ) } ).patch ).toEqual( { status: 'published', playlistItemId: 'pi' } );
    expect( plan( { rec: rec( a, { status: 'published' } ) } ).problems.join() ).toMatch( /YouTube shows private/ );
    expect( plan( { video: undefined } ).problems.join() ).toMatch( /not on YouTube/ );
    expect( plan( { playlistItemIds: [ 'p1', 'p2' ] } ).problems.join() ).toMatch( /2 times/ );
    expect( plan( { rec: rec( a, { status: 'scheduled' } ) } ).problems.join() ).toMatch( /scheduled/ );
    expect( plan( { rec: undefined, titleMatches: [ live( a, { id: 'x' } ) ] } ).problems.join() ).toMatch( /Untracked/ );
    expect( plan( { rec: undefined } ) ).toEqual( { problems: [], notes: [ 'Nothing uploaded yet; nothing on the channel matches.' ] } );
    expect( plan( { rec: { ...rec( a ), status: 'uploading', videoId: undefined }, titleMatches: [ live( a, { id: 'x' } ) ] } ).problems.join() ).toMatch( /unconfirmed/ );
  } );

  it( 'upload resumes the playlist step after a crash and never uploads twice', () => {
    const a = approved( ft() );
    expect( uploadResume( a, undefined ) ).toBe( 'new' );
    expect( uploadResume( a, { ...rec( a ), status: 'uploading' } ) ).toBe( 'resume_session' );
    expect( uploadResume( a, rec( a, { status: 'uploaded' } ) ) ).toBe( 'resume_playlist' );
    expect( uploadResume( a, rec( a ) ) ).toBe( 'done' );
    expect( uploadResume( a, rec( a, { status: 'published' } ) ) ).toBe( 'done' );
    expect( uploadResume( a, rec( a, { status: 'scheduled' } ) ) ).toBe( 'refuse' );
    expect( uploadResume( a, rec( a, { contentHash: 'other' } ) ) ).toBe( 'refuse' );
  } );
} );
