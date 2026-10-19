/** YouTube Data API v3 calls: reads (M1, M2 queue/preview/inspect) and the few writes M2 needs (upload, playlist item, schedule). */
const API = 'https://www.googleapis.com/youtube/v3';

export interface Channel { id: string; title: string; customUrl?: string; videoCount?: string }
export interface Playlist { id: string; title: string; itemCount?: number; privacy?: string; channelId?: string }

export class ApiError extends Error { constructor( message: string, readonly status: number ) { super( message ); } }

async function call( method: 'GET' | 'POST' | 'PUT', path: string, params: Record<string, string>, accessToken: string, json?: unknown ): Promise<any> {
  const res = await fetch( `${ API }/${ path }?${ new URLSearchParams( params ) }`, {
    method,
    headers: { authorization: `Bearer ${ accessToken }`, ...( json ? { 'content-type': 'application/json' } : {} ) },
    body: json ? JSON.stringify( json ) : undefined,
  } );
  const body: any = await res.json().catch( () => ( {} ) );
  if ( !res.ok ) throw new ApiError( `YouTube API ${ method } ${ path } failed: ${ res.status } ${ body.error?.errors?.[ 0 ]?.reason ?? body.error?.status ?? '' }`.trim(), res.status );
  return body;
}
const get = ( path: string, params: Record<string, string>, accessToken: string ) => call( 'GET', path, params, accessToken );

export async function getMyChannels( accessToken: string ): Promise<Channel[]> {
  const body = await get( 'channels', { part: 'snippet,statistics', mine: 'true' }, accessToken );
  return ( body.items ?? [] ).map( ( c: any ) => ( { id: c.id, title: c.snippet?.title, customUrl: c.snippet?.customUrl, videoCount: c.statistics?.videoCount } ) );
}

export async function listMyPlaylists( accessToken: string ): Promise<Playlist[]> {
  const playlists: Playlist[] = [];
  let pageToken: string | undefined;
  do {
    const body = await get( 'playlists', { part: 'snippet,contentDetails,status', mine: 'true', maxResults: '50', ...( pageToken ? { pageToken } : {} ) }, accessToken );
    for ( const p of body.items ?? [] ) playlists.push( { id: p.id, title: p.snippet?.title, itemCount: p.contentDetails?.itemCount, privacy: p.status?.privacyStatus } );
    pageToken = body.nextPageToken;
  } while ( pageToken );
  return playlists;
}

// ---- M2 reads -------------------------------------------------------------------------------------------------------

export interface VideoInfo {
  id: string; title: string; description: string; tags: string[]; categoryId?: string; language?: string;
  privacy?: string; publishAt?: string; madeForKids?: boolean; uploadStatus?: string; durationIso?: string;
}
const toVideoInfo = ( v: any ): VideoInfo => ( {
  id: v.id, title: v.snippet?.title, description: v.snippet?.description ?? '', tags: v.snippet?.tags ?? [], categoryId: v.snippet?.categoryId,
  language: v.snippet?.defaultAudioLanguage ?? v.snippet?.defaultLanguage, privacy: v.status?.privacyStatus, publishAt: v.status?.publishAt,
  madeForKids: v.status?.selfDeclaredMadeForKids, uploadStatus: v.status?.uploadStatus, durationIso: v.contentDetails?.duration,
} );

export async function getVideos( ids: string[], accessToken: string ): Promise<VideoInfo[]> {
  const out: VideoInfo[] = [];
  for ( let i = 0; i < ids.length; i += 50 ) {
    const body = await get( 'videos', { part: 'snippet,status,contentDetails', id: ids.slice( i, i + 50 ).join( ',' ) }, accessToken );
    out.push( ...( body.items ?? [] ).map( toVideoInfo ) );
  }
  return out;
}

/** Every video on the authenticated channel (public, private, scheduled), via the uploads playlist. */
export async function listChannelVideos( accessToken: string ): Promise<VideoInfo[]> {
  const ch = await get( 'channels', { part: 'contentDetails', mine: 'true' }, accessToken );
  const uploads: string | undefined = ch.items?.[ 0 ]?.contentDetails?.relatedPlaylists?.uploads;
  if ( !uploads ) return [];
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const body = await get( 'playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: '50', ...( pageToken ? { pageToken } : {} ) }, accessToken );
    ids.push( ...( body.items ?? [] ).map( ( i: any ) => i.contentDetails.videoId ) );
    pageToken = body.nextPageToken;
  } while ( pageToken );
  return getVideos( ids, accessToken );
}

export async function getPlaylistsById( ids: string[], accessToken: string ): Promise<Playlist[]> {
  const body = await get( 'playlists', { part: 'snippet,contentDetails,status', id: ids.join( ',' ), maxResults: '50' }, accessToken );
  return ( body.items ?? [] ).map( ( p: any ) => ( { id: p.id, title: p.snippet?.title, itemCount: p.contentDetails?.itemCount, privacy: p.status?.privacyStatus, channelId: p.snippet?.channelId } ) );
}

/** Playlist items for one video in one playlist (empty when it is not a member). */
export async function findPlaylistItems( playlistId: string, videoId: string, accessToken: string ): Promise<{ id: string; videoId: string; playlistId: string }[]> {
  const body = await get( 'playlistItems', { part: 'snippet', playlistId, videoId, maxResults: '50' }, accessToken );
  return ( body.items ?? [] ).map( ( i: any ) => ( { id: i.id, videoId: i.snippet?.resourceId?.videoId, playlistId: i.snippet?.playlistId } ) );
}

// ---- M2 writes (each is called only behind the safety checks in the CLI) -----------------------------------------------

export interface UploadMetadata {
  title: string; description: string; tags: string[]; categoryId: string; language: string; madeForKids: boolean;
}
/** Always private. Nothing in this module can set a video public; the only way it becomes public is a scheduled publishAt. */
const insertBody = ( m: UploadMetadata ) => ( {
  snippet: { title: m.title, description: m.description, tags: m.tags, categoryId: m.categoryId, defaultLanguage: m.language, defaultAudioLanguage: m.language },
  status: { privacyStatus: 'private', selfDeclaredMadeForKids: m.madeForKids, embeddable: true },
} );

/** Opens a resumable session; returns the session URI (valid ~1 week). No bytes are sent yet. */
export async function startResumableUpload( m: UploadMetadata, size: number, accessToken: string ): Promise<string> {
  const res = await fetch( 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: { authorization: `Bearer ${ accessToken }`, 'content-type': 'application/json; charset=UTF-8', 'x-upload-content-length': String( size ), 'x-upload-content-type': 'video/mp4' },
    body: JSON.stringify( insertBody( m ) ),
  } );
  const location = res.headers.get( 'location' );
  if ( !res.ok || !location ) throw new ApiError( `Could not start upload session: ${ res.status }`, res.status );
  return location;
}

export type UploadOutcome = { done: true; video: any } | { done: false; received: number };

function parseOutcome( res: Response, body: any, size: number ): UploadOutcome {
  if ( res.status === 200 || res.status === 201 ) return { done: true, video: body };
  if ( res.status === 308 ) { const m = /bytes=0-(\d+)/.exec( res.headers.get( 'range' ) ?? '' ); return { done: false, received: m ? +m[ 1 ] + 1 : 0 }; }
  throw new ApiError( `Upload session returned ${ res.status }`, res.status );
}

/** Asks the session how much it has, without sending data. Safe to call any time; used when an earlier attempt's result is unknown. */
export async function queryUpload( uploadUrl: string, size: number, accessToken: string ): Promise<UploadOutcome> {
  const res = await fetch( uploadUrl, { method: 'PUT', headers: { authorization: `Bearer ${ accessToken }`, 'content-length': '0', 'content-range': `bytes */${ size }` } } );
  return parseOutcome( res, await res.json().catch( () => ( {} ) ), size );
}

/** Sends the bytes from `offset` to the end in one request. A thrown network error means the outcome is UNKNOWN: call queryUpload, do not restart. */
export async function sendUpload( uploadUrl: string, bytes: Buffer, offset: number, accessToken: string ): Promise<UploadOutcome> {
  const res = await fetch( uploadUrl, {
    method: 'PUT',
    headers: { authorization: `Bearer ${ accessToken }`, 'content-type': 'video/mp4', 'content-range': `bytes ${ offset }-${ bytes.length - 1 }/${ bytes.length }` },
    body: new Uint8Array( bytes.subarray( offset ) ),
  } );
  return parseOutcome( res, await res.json().catch( () => ( {} ) ), bytes.length );
}

export async function insertPlaylistItem( playlistId: string, videoId: string, accessToken: string ): Promise<{ id: string; videoId: string; playlistId: string }> {
  const body = await call( 'POST', 'playlistItems', { part: 'snippet' }, accessToken, { snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId } } } );
  return { id: body.id, videoId: body.snippet?.resourceId?.videoId, playlistId: body.snippet?.playlistId };
}

/** Sets publishAt on an existing private video. status is replaced wholesale by videos.update, so the current values are carried over. */
export async function scheduleVideo( videoId: string, publishAtIso: string, accessToken: string ): Promise<VideoInfo> {
  const current = await get( 'videos', { part: 'status', id: videoId }, accessToken );
  const status = current.items?.[ 0 ]?.status;
  if ( !status ) throw new Error( 'Video not found when scheduling.' );
  if ( status.privacyStatus !== 'private' ) throw new Error( `Refusing to schedule: video is ${ status.privacyStatus }, expected private.` );
  const body = await call( 'PUT', 'videos', { part: 'status' }, accessToken, { id: videoId, status: {
    privacyStatus: 'private', publishAt: publishAtIso, selfDeclaredMadeForKids: status.selfDeclaredMadeForKids, embeddable: status.embeddable, license: status.license, publicStatsViewable: status.publicStatsViewable,
  } } );
  return toVideoInfo( { id: videoId, status: body.status } );
}
