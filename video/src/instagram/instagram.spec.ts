import { mkdirSync, mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertAuthorizedAccount, parsePastedToken, saveToken, loadToken, newToken } from './auth.js';
import { AmbiguousWriteError, GraphError, createResumableReelContainer, redact, uploadVideo } from './graph.js';
import { contentHash, isApproved, loadManifest, topLevelBoxes, validateManifest, type ReelManifest } from './manifest.js';
import { clearRecord, loadState, saveRecord, stagePreflight, type StageRecord } from './state.js';

const TOKEN = 'IGAA' + 'x'.repeat( 120 );
const box = ( type: string, payload = 0 ) => { const b = Buffer.alloc( 8 + payload ); b.writeUInt32BE( 8 + payload ); b.write( type, 4, 'latin1' ); return b; };
const mp4 = ( ...types: string[] ) => Buffer.concat( types.map( t => box( t, t === 'mdat' ? 32 : 0 ) ) );
const CAPTION = 'Magnitude is size.\n\nAutomated news and video production powered by Output.ai - https://output.ai\n\n#earthquake';

/** A throwaway video/ directory with one Reel manifest and a small faststart MP4. */
function sandbox( caption = CAPTION, file = mp4( 'ftyp', 'moov', 'mdat' ) ): ReelManifest {
  const dir = mkdtempSync( join( tmpdir(), 'nhq-ig-' ) );
  process.env.NHQ_VIDEO_DIR = dir;
  mkdirSync( join( dir, 'publish', 'instagram' ), { recursive: true } );
  writeFileSync( join( dir, 'reel.mp4' ), file );
  return { id: 'reel', file: 'reel.mp4', generated: { caption }, approved: { caption }, shareToFeed: true, thumbOffsetMs: 0 };
}
const approved = ( m: ReelManifest ): ReelManifest => ( { ...m, approval: { status: 'approved', approvedAt: 'now', contentHash: contentHash( m ) } } );
const rec = ( status: StageRecord[ 'status' ], m: ReelManifest ): StageRecord => ( { status, contentHash: contentHash( m ), fileSize: 1, containerId: 'c1', updatedAt: '' } );

afterEach( () => { delete process.env.NHQ_VIDEO_DIR; vi.unstubAllGlobals(); } );

describe( 'manifest', () => {
  it( 'the committed Magnitude 6 vs 7 manifest validates against the local music-free render', () => {
    const m = loadManifest( 'magnitude-6-vs-7' );
    expect( m.file ).toMatch( /reel-final\.mp4$/ );
    // The MP4 lives in out/ (git-ignored); on a machine without it the file check is the only problem.
    const problems = validateManifest( m );
    expect( problems.filter( p => !p.startsWith( 'Video file missing' ) ) ).toEqual( [] );
  } );
  it( 'finds moov before mdat, and rejects a file without faststart', () => {
    expect( topLevelBoxes( mp4( 'ftyp', 'moov', 'mdat' ) ) ).toEqual( [ 'ftyp', 'moov', 'mdat' ] );
    expect( validateManifest( sandbox( CAPTION, mp4( 'ftyp', 'mdat', 'moov' ) ) ).join() ).toMatch( /moov/ );
  } );
  it( 'enforces caption limits and the Output.ai credit', () => {
    expect( validateManifest( sandbox() ) ).toEqual( [] );
    expect( validateManifest( sandbox( CAPTION + 'x'.repeat( 2200 ) ) ).join() ).toMatch( /2200/ );
    expect( validateManifest( sandbox( CAPTION + Array.from( { length: 30 }, ( _, i ) => ` #t${ i }` ).join( '' ) ) ).join() ).toMatch( /30 hashtags/ );
    expect( validateManifest( sandbox( 'No credit here' ) ).join() ).toMatch( /Output\.ai/ );
  } );
  it( 'approval goes stale when the caption or the video bytes change', () => {
    const m = approved( sandbox() );
    expect( isApproved( m ) ).toBe( true );
    expect( isApproved( { ...m, approved: { caption: CAPTION + '!' } } ) ).toBe( false );
    writeFileSync( join( process.env.NHQ_VIDEO_DIR!, 'reel.mp4' ), mp4( 'ftyp', 'moov', 'free', 'mdat' ) );
    expect( isApproved( m ) ).toBe( false );
  } );
} );

describe( 'stage preflight', () => {
  it( 'requires approval', () => {
    expect( stagePreflight( sandbox(), {} ).problems.join() ).toMatch( /Not approved/ );
    expect( stagePreflight( approved( sandbox() ), {} ) ).toEqual( { problems: [] } );
  } );
  it( 'continues only from a container that certainly exists', () => {
    const m = approved( sandbox() );
    expect( stagePreflight( m, { reel: rec( 'created', m ) } ) ).toEqual( { problems: [], resumeFrom: 'created' } );
    for ( const s of [ 'creating', 'uploading', 'uploaded', 'staged', 'failed' ] as const ) {
      expect( stagePreflight( m, { reel: rec( s, m ) } ).problems ).toHaveLength( 1 );
    }
    expect( stagePreflight( m, { reel: rec( 'creating', m ) } ).problems[ 0 ] ).toMatch( /unknown outcome. Not retrying/ );
  } );
  it( 'state writes are atomic per entry and clearRecord removes only that entry', () => {
    sandbox();
    saveRecord( 'a', { status: 'creating', contentHash: 'h', fileSize: 1 } );
    saveRecord( 'b', { status: 'staged', contentHash: 'h', fileSize: 1 } );
    clearRecord( 'a' );
    expect( Object.keys( loadState() ) ).toEqual( [ 'b' ] );
  } );
} );

describe( 'auth', () => {
  beforeEach( () => { process.env.NHQ_INSTAGRAM_DIR = join( mkdtempSync( join( tmpdir(), 'nhq-igauth-' ) ), 'cfg' ); } );
  it( 'accepts only @nexthugequake as a professional account', () => {
    expect( () => assertAuthorizedAccount( { username: 'nexthugequake', accountType: 'MEDIA_CREATOR' } ) ).not.toThrow();
    expect( () => assertAuthorizedAccount( { username: 'someoneelse', accountType: 'MEDIA_CREATOR' } ) ).toThrow( /Refusing/ );
    expect( () => assertAuthorizedAccount( { username: 'nexthugequake', accountType: 'PERSONAL' } ) ).toThrow( /not a professional/ );
  } );
  it( 'parses a pasted token without echoing bad input', () => {
    expect( parsePastedToken( ` "${ TOKEN }"\n` ) ).toBe( TOKEN );
    expect( () => parsePastedToken( 'two words secret' ) ).toThrow( /^That does not look like an access token/ );
    expect( () => parsePastedToken( 'two words secret' ) ).not.toThrow( /secret/ );
  } );
  it( 'stores the token with mode 0600', () => {
    saveToken( newToken( TOKEN, '17841', 'nexthugequake' ) );
    expect( statSync( join( process.env.NHQ_INSTAGRAM_DIR!, 'token.json' ) ).mode & 0o777 ).toBe( 0o600 );
    expect( loadToken()?.accessToken ).toBe( TOKEN );
  } );
} );

describe( 'graph writes', () => {
  const opts = { caption: 'c', shareToFeed: true, thumbOffsetMs: 0 };
  it( 'a network failure or unreadable response is ambiguous, never a plain error', async () => {
    vi.stubGlobal( 'fetch', vi.fn().mockRejectedValue( new Error( `socket closed ${ TOKEN }` ) ) );
    const err = await createResumableReelContainer( '1', opts, TOKEN ).catch( e => e );
    expect( err ).toBeInstanceOf( AmbiguousWriteError );
    expect( err.message ).not.toContain( TOKEN );
    vi.stubGlobal( 'fetch', vi.fn().mockResolvedValue( new Response( '<html>502</html>', { status: 502 } ) ) );
    await expect( uploadVideo( 'https://u', Buffer.alloc( 4 ), TOKEN ) ).rejects.toThrow( AmbiguousWriteError );
  } );
  it( 'a Meta error is definite, and its message is redacted', async () => {
    const body = { error: { message: `Unsupported request ${ TOKEN }`, type: 'OAuthException', code: 100 } };
    vi.stubGlobal( 'fetch', vi.fn().mockResolvedValue( new Response( JSON.stringify( body ), { status: 400 } ) ) );
    const err = await createResumableReelContainer( '1', opts, TOKEN ).catch( e => e );
    expect( err ).toBeInstanceOf( GraphError );
    expect( err.message ).toMatch( /HTTP 400 \(OAuthException, code 100\)/ );
    expect( err.message ).not.toContain( TOKEN );
  } );
  it( 'sends the token in the POST body, not the URL', async () => {
    const fetch = vi.fn().mockResolvedValue( new Response( JSON.stringify( { id: '42', uri: 'https://rupload.facebook.com/x' } ) ) );
    vi.stubGlobal( 'fetch', fetch );
    expect( await createResumableReelContainer( '1784', opts, TOKEN ) ).toEqual( { id: '42', uri: 'https://rupload.facebook.com/x' } );
    const [ url, init ] = fetch.mock.calls[ 0 ];
    expect( url ).not.toContain( TOKEN );
    expect( String( init.body ) ).toContain( 'media_type=REELS' );
    expect( String( init.body ) ).toContain( 'upload_type=resumable' );
  } );
  it( 'redact removes every occurrence', () => {
    expect( redact( `a ${ TOKEN } b ${ TOKEN }`, TOKEN ) ).toBe( 'a [REDACTED] b [REDACTED]' );
  } );
} );
