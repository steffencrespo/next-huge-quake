/**
 * Instagram Publisher v1: the few Instagram API (Instagram Login, graph.instagram.com) calls needed to authenticate and
 * stage a Reel container. There is deliberately no media_publish call in this module.
 *
 * The access token travels as the documented `access_token` parameter (form body for POST) or as `Authorization: OAuth`
 * for the rupload host. Errors are reduced to Meta's error type/code and a redacted message; URLs are never printed.
 */
export const GRAPH_VERSION = 'v26.0';
const GRAPH = `https://graph.instagram.com/${ GRAPH_VERSION }`;
const RUPLOAD = `https://rupload.facebook.com/ig-api-upload/${ GRAPH_VERSION }`;

export class GraphError extends Error { constructor( message: string, readonly status: number, readonly code?: number ) { super( message ); } }
/** The request may or may not have reached Meta (network failure, unparseable response). Never retried automatically. */
export class AmbiguousWriteError extends Error {}

/** Removes any occurrence of the token from text that is about to be printed. */
export const redact = ( text: string, token: string ) => token ? text.split( token ).join( '[REDACTED]' ) : text;

function graphError( what: string, res: Response, body: any, token: string ): GraphError {
  const e = body?.error ?? {};
  const detail = [ e.type, e.code && `code ${ e.code }`, e.error_subcode && `subcode ${ e.error_subcode }` ].filter( Boolean ).join( ', ' );
  const message = redact( String( e.error_user_msg ?? e.message ?? body?.debug_info?.message ?? '' ).slice( 0, 300 ), token );
  return new GraphError( `${ what } failed: HTTP ${ res.status }${ detail ? ` (${ detail })` : '' }${ message ? `: ${ message }` : '' }`, res.status, e.code );
}

async function get( path: string, params: Record<string, string>, token: string ): Promise<any> {
  const res = await fetch( `${ GRAPH }/${ path }?${ new URLSearchParams( { ...params, access_token: token } ) }` );
  const body: any = await res.json().catch( () => ( {} ) );
  if ( !res.ok ) throw graphError( `GET ${ path }`, res, body, token );
  return body;
}

/** A write. Any failure that leaves the outcome unknown is raised as AmbiguousWriteError. */
async function write( what: string, url: string, init: RequestInit, token: string ): Promise<any> {
  let res: Response;
  try { res = await fetch( url, init ); } catch ( e ) {
    throw new AmbiguousWriteError( `${ what }: no response (${ redact( ( e as Error ).message, token ) }). Outcome unknown.` );
  }
  const text = await res.text().catch( () => '' );
  let body: any;
  try { body = JSON.parse( text ); } catch {
    throw new AmbiguousWriteError( `${ what }: HTTP ${ res.status } with an unreadable response. Outcome unknown.` );
  }
  if ( !res.ok || body?.error ) throw graphError( what, res, body, token );
  return body;
}

export interface Me { appScopedId: string; userId: string; username: string; accountType: string }

export async function getMe( token: string ): Promise<Me> {
  const b = await get( 'me', { fields: 'id,user_id,username,account_type' }, token );
  return { appScopedId: b.id, userId: String( b.user_id ), username: b.username, accountType: b.account_type };
}

/** Long-lived token refresh (token must be >= 24 h old and still valid). Returns the new token and its lifetime in seconds. */
export async function refreshToken( token: string ): Promise<{ accessToken: string; expiresIn: number }> {
  const b = await get( 'refresh_access_token', { grant_type: 'ig_refresh_token' }, token );
  return { accessToken: b.access_token, expiresIn: b.expires_in };
}

export interface ReelOptions { caption: string; shareToFeed: boolean; thumbOffsetMs: number }

/** Creates a Reels container for a resumable (local file) upload. Not public; Meta expires it after 24 h unless published. */
export async function createResumableReelContainer( igUserId: string, o: ReelOptions, token: string ): Promise<{ id: string; uri?: string }> {
  const form = new URLSearchParams( {
    media_type: 'REELS', upload_type: 'resumable', caption: o.caption, share_to_feed: String( o.shareToFeed ), thumb_offset: String( o.thumbOffsetMs ),
    access_token: token,
  } );
  const b = await write( 'Create Reels container', `${ GRAPH }/${ igUserId }/media`, { method: 'POST', body: form }, token );
  if ( !b.id ) throw new AmbiguousWriteError( 'Create Reels container: response has no container id. Outcome unknown.' );
  return { id: String( b.id ), uri: b.uri };
}

/** The upload URL: the one Meta returned with the container, else the documented rupload URL. */
export const uploadUrl = ( containerId: string, uri?: string ) => uri ?? `${ RUPLOAD }/${ containerId }`;

/** Sends the whole file in one request (offset 0). */
export async function uploadVideo( url: string, bytes: Buffer, token: string ): Promise<void> {
  const b = await write( 'Video upload', url, {
    method: 'POST',
    headers: { authorization: `OAuth ${ token }`, offset: '0', file_size: String( bytes.length ), 'content-type': 'application/octet-stream' },
    body: new Uint8Array( bytes ),
  }, token );
  if ( b.success !== true ) throw new AmbiguousWriteError( `Video upload: response did not report success (${ redact( JSON.stringify( b ).slice( 0, 200 ), token ) }). Outcome unknown.` );
}

export type ContainerStatus = 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED';

export async function getContainer( id: string, token: string ): Promise<{ statusCode: ContainerStatus; status?: string }> {
  const b = await get( id, { fields: 'status_code,status' }, token );
  return { statusCode: b.status_code, status: b.status };
}
