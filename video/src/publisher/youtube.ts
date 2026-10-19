/** Read-only YouTube Data API v3 calls for the M1 connection report. */
const API = 'https://www.googleapis.com/youtube/v3';

export interface Channel { id: string; title: string; customUrl?: string; videoCount?: string }
export interface Playlist { id: string; title: string; itemCount?: number; privacy?: string }

async function get( path: string, params: Record<string, string>, accessToken: string ): Promise<any> {
  const res = await fetch( `${ API }/${ path }?${ new URLSearchParams( params ) }`, { headers: { authorization: `Bearer ${ accessToken }` } } );
  const body: any = await res.json().catch( () => ( {} ) );
  if ( !res.ok ) throw new Error( `YouTube API ${ path } failed: ${ res.status } ${ body.error?.errors?.[ 0 ]?.reason ?? body.error?.status ?? '' }`.trim() );
  return body;
}

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
