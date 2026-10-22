/**
 * Crash recovery of the real publisher CLI (scripts/youtube-publish.ts) against an in-memory YouTube. Each case makes
 * a YouTube write succeed and then the local record fail to save (as a crash between the two would), runs the next
 * command again, and checks that YouTube ends with exactly one video, one playlist membership and the right privacy.
 *
 * What this shows: retries converge without duplicates when the saved upload session, the playlist lookup and the
 * video's privacy can be read back. It is not an exactly-once guarantee (see the README for the residual cases).
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted( () => ( {
  videos: new Map<string, any>(),
  sessions: new Map<string, { meta: any; videoId?: string }>(),
  items: [] as { id: string; videoId: string; playlistId: string }[],
  calls: { start: 0, insertItem: 0, publishNow: 0 },
  failSave: new Set<string>(),
  loseUploadResponse: false,
} ) );

vi.mock( './auth.js', () => ( {
  AuthError: class extends Error {}, READ_SCOPES: [], WRITE_SCOPES: [], loadClient: () => ( {} ), getAccessToken: async () => 'token',
} ) );

vi.mock( './state.js', async importOriginal => {
  const real = await importOriginal<typeof import( './state.js' )>();
  return {
    ...real,
    saveRecord: ( id: string, patch: any ) => {
      if ( fake.failSave.delete( patch.status ) ) throw new Error( `simulated crash before recording ${ patch.status }` );
      return real.saveRecord( id, patch );
    },
  };
} );

vi.mock( './youtube.js', () => {
  const info = ( v: any ) => ( { ...v } );
  const created = ( id: string ) => ( { id, status: { privacyStatus: fake.videos.get( id ).privacy } } );
  return {
    getMyChannels: async () => [ { id: 'UCgJzKvpcPvzQT-YtBsJb6eQ', title: 'NHQ' } ],
    listChannelVideos: async () => [ ...fake.videos.values() ].map( info ),
    getVideos: async ( ids: string[] ) => ids.filter( id => fake.videos.has( id ) ).map( id => info( fake.videos.get( id ) ) ),
    findPlaylistItems: async ( playlistId: string, videoId: string ) => fake.items.filter( i => i.playlistId === playlistId && i.videoId === videoId ),
    insertPlaylistItem: async ( playlistId: string, videoId: string ) => {
      fake.calls.insertItem++;
      const item = { id: `pi${ fake.items.length + 1 }`, videoId, playlistId };
      fake.items.push( item );
      return item;
    },
    startResumableUpload: async ( meta: any ) => {
      fake.calls.start++;
      const url = `session-${ fake.calls.start }`;
      fake.sessions.set( url, { meta } );
      return url;
    },
    sendUpload: async ( url: string ) => {
      const s = fake.sessions.get( url )!;
      const id = `vid${ fake.videos.size + 1 }`;
      fake.videos.set( id, { id, title: s.meta.title, description: s.meta.description, tags: s.meta.tags, categoryId: s.meta.categoryId, language: s.meta.language, madeForKids: s.meta.madeForKids, privacy: 'private', uploadStatus: 'processed' } );
      s.videoId = id;
      if ( fake.loseUploadResponse ) { fake.loseUploadResponse = false; throw new Error( 'socket hang up' ); }
      return { done: true, video: created( id ) };
    },
    queryUpload: async ( url: string ) => {
      const s = fake.sessions.get( url );
      if ( !s ) throw new Error( 'session expired' );
      return s.videoId ? { done: true, video: created( s.videoId ) } : { done: false, received: 0 };
    },
    publishNow: async ( id: string ) => {
      fake.calls.publishNow++;
      fake.videos.get( id ).privacy = 'public';
      return info( fake.videos.get( id ) );
    },
  };
} );

const ID = 'nagqu-china-m70-us6000u43g';
let root: string;
let exits: number[];

/** Runs one CLI command in-process; returns the exit code (0 when it did not call process.exit). */
async function cli( ...args: string[] ): Promise<number> {
  exits = [];
  process.argv = [ 'node', 'youtube-publish.ts', ...args ];
  vi.resetModules();
  const { finished } = await import( '../../scripts/youtube-publish.js' );
  await finished;
  return exits[ 0 ] ?? 0;
}
const state = () => JSON.parse( readFileSync( join( root, 'publish', 'state.json' ), 'utf8' ) )[ ID ];
const youtube = () => ( { videos: fake.videos.size, items: fake.items.length, privacy: [ ...fake.videos.values() ].map( v => v.privacy ) } );

beforeEach( async () => {
  root = mkdtempSync( join( tmpdir(), 'nhq-pub-' ) );
  process.env.NHQ_VIDEO_DIR = root;
  mkdirSync( join( root, 'publish' ) );
  mkdirSync( join( root, 'out', 'videos', 'us6000u43g' ), { recursive: true } );
  writeFileSync( join( root, 'out', 'videos', 'us6000u43g', 'video.mp4' ), Buffer.alloc( 1000, 1 ) );
  writeFileSync( join( root, 'out', 'videos', 'us6000u43g', 'publish-credits.txt' ),
    'Earthquake data: U.S. Geological Survey (USGS), earthquake.usgs.gov.\nSource: YouTube Audio Library.\n\n\nProduction Technology\nAutomated news and video production powered by Output.ai\nhttps://output.ai\n' );
  const text = { title: 'M7.0 Earthquake Strikes Near Nagqu, China', description: 'A magnitude 7.0 earthquake struck.', tags: [ 'earthquake' ] };
  writeFileSync( join( root, 'publish', `${ ID }.json` ), JSON.stringify( {
    id: ID, file: 'out/videos/us6000u43g/video.mp4', creditsFile: 'out/videos/us6000u43g/publish-credits.txt', generated: text, approved: text,
    categoryId: '25', language: 'en', madeForKids: false, playlistId: 'PLPsR74lIhWgI',
    fastTrack: { policy: 'fast-track@1', tier: 'A', signals: [ 'pager_orange' ], evaluatedAt: '2026-10-22T15:59:00Z', facts: { eventId: 'us6000u43g', magnitude: 7 } },
  } ) );
  fake.videos.clear(); fake.sessions.clear(); fake.items.length = 0; fake.failSave.clear(); fake.loseUploadResponse = false;
  Object.assign( fake.calls, { start: 0, insertItem: 0, publishNow: 0 } );
  vi.spyOn( process, 'exit' ).mockImplementation( ( code?: number | string | null ) => { exits.push( Number( code ?? 0 ) ); return undefined as never; } );
  vi.spyOn( console, 'log' ).mockImplementation( () => {} );
  vi.spyOn( console, 'error' ).mockImplementation( () => {} );
  expect( await cli( 'approve', ID, '--authority=fast-track@1' ) ).toBe( 0 );
} );
afterEach( () => { vi.restoreAllMocks(); delete process.env.NHQ_VIDEO_DIR; } );

describe( 'publisher crash recovery', () => {
  it( 'records the policy authority, and a repeated approve changes nothing', async () => {
    const manifest = () => JSON.parse( readFileSync( join( root, 'publish', `${ ID }.json` ), 'utf8' ) );
    const first = manifest().approval;
    expect( first ).toMatchObject( { status: 'approved', authority: 'fast-track@1' } );
    expect( await cli( 'approve', ID, '--authority=fast-track@1' ) ).toBe( 0 );
    expect( manifest().approval ).toEqual( first );
    expect( await cli( 'approve', ID, '--authority=fast-track@2' ) ).toBe( 1 );
  } );

  it( 'upload succeeded but the record was not saved: the retry resumes the saved session, no second video', async () => {
    fake.failSave.add( 'uploaded' );
    expect( await cli( 'upload', ID, '--confirm' ) ).toBe( 1 );
    expect( state() ).toMatchObject( { status: 'uploading', uploadUrl: 'session-1' } );
    expect( youtube() ).toEqual( { videos: 1, items: 0, privacy: [ 'private' ] } );

    expect( await cli( 'reconcile', ID ) ).toBe( 0 ); // the open session is not a conflict
    expect( await cli( 'upload', ID, '--confirm' ) ).toBe( 0 );
    expect( state() ).toMatchObject( { status: 'playlisted', videoId: 'vid1', playlistItemId: 'pi1', uploadedAt: expect.any( String ) } );
    expect( youtube() ).toEqual( { videos: 1, items: 1, privacy: [ 'private' ] } );
    expect( fake.calls.start ).toBe( 1 );
  } );

  it( 'upload response lost: the same command asks the session instead of uploading again', async () => {
    fake.loseUploadResponse = true;
    expect( await cli( 'upload', ID, '--confirm' ) ).toBe( 0 );
    expect( state() ).toMatchObject( { status: 'playlisted', videoId: 'vid1' } );
    expect( youtube() ).toEqual( { videos: 1, items: 1, privacy: [ 'private' ] } );
  } );

  it( 'playlist insert succeeded but the record was not saved: the retry finds the membership, no second insert', async () => {
    fake.failSave.add( 'playlisted' );
    expect( await cli( 'upload', ID, '--confirm' ) ).toBe( 1 );
    expect( state() ).toMatchObject( { status: 'uploaded', videoId: 'vid1' } );
    expect( youtube() ).toEqual( { videos: 1, items: 1, privacy: [ 'private' ] } );

    expect( await cli( 'upload', ID, '--confirm' ) ).toBe( 0 );
    expect( state() ).toMatchObject( { status: 'playlisted', playlistItemId: 'pi1' } );
    expect( fake.calls ).toMatchObject( { start: 1, insertItem: 1 } );
    expect( await cli( 'inspect', ID, '--strict', '--expect=private' ) ).toBe( 0 );
  } );

  it( 'publish-now succeeded but was not recorded: reconcile records it and a retry does not publish again', async () => {
    expect( await cli( 'upload', ID, '--confirm' ) ).toBe( 0 );
    fake.failSave.add( 'published' );
    expect( await cli( 'publish-now', ID, '--confirm' ) ).toBe( 1 );
    expect( state().status ).toBe( 'playlisted' );
    expect( youtube().privacy ).toEqual( [ 'public' ] );

    expect( await cli( 'reconcile', ID ) ).toBe( 0 );
    expect( state() ).toMatchObject( { status: 'published', publishedAt: expect.any( String ) } );
    expect( await cli( 'publish-now', ID, '--confirm' ) ).toBe( 0 ); // "Already public"
    expect( fake.calls.publishNow ).toBe( 1 );
    expect( await cli( 'inspect', ID, '--strict', '--expect=public' ) ).toBe( 0 );
  } );

  it( 'publish-now retried without reconcile repeats the privacy update (same effect) and records it', async () => {
    expect( await cli( 'upload', ID, '--confirm' ) ).toBe( 0 );
    fake.failSave.add( 'published' );
    expect( await cli( 'publish-now', ID, '--confirm' ) ).toBe( 1 );
    expect( await cli( 'publish-now', ID, '--confirm' ) ).toBe( 0 );
    expect( state().status ).toBe( 'published' );
    expect( fake.calls.publishNow ).toBe( 2 ); // at-least-once API call; idempotent result
    expect( youtube() ).toEqual( { videos: 1, items: 1, privacy: [ 'public' ] } );
  } );

  it( 'an expired upload session fails closed instead of starting a second upload', async () => {
    fake.failSave.add( 'uploaded' );
    expect( await cli( 'upload', ID, '--confirm' ) ).toBe( 1 );
    fake.sessions.clear();
    expect( await cli( 'upload', ID, '--confirm' ) ).toBe( 1 );
    expect( fake.calls.start ).toBe( 1 );
    expect( youtube().videos ).toBe( 1 );
  } );
} );
