/**
 * YouTube Publisher M1: OAuth 2.0 installed-app (loopback + PKCE) authentication, read-only scope.
 *
 * Secrets live outside the repository, in ~/.config/next-huge-quake/youtube/ (override: NHQ_YOUTUBE_DIR), mode 0600:
 *   client.json  the OAuth Desktop client JSON downloaded from Google Cloud (copied here once)
 *   token.json   access and refresh token
 * Nothing here logs a secret; errors are reduced to Google's error code before they are printed.
 */
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';

const READONLY_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly';
const UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
const MANAGE_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';

/** M1 connection: read-only. */
export const READ_SCOPES = [ READONLY_SCOPE ];
/** M2 publishing: upload videos (youtube.upload), and manage them, playlists and reads (youtube.force-ssl). Requires a fresh consent. */
export const WRITE_SCOPES = [ UPLOAD_SCOPE, MANAGE_SCOPE ];

/** True when the granted scopes cover every required one (force-ssl includes read access). */
export function scopesSatisfy( granted: string, required: string[] ): boolean {
  const have = new Set( granted.split( ' ' ).filter( Boolean ) );
  if ( have.has( MANAGE_SCOPE ) ) have.add( READONLY_SCOPE );
  return required.every( s => have.has( s ) );
}

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const FALLBACK_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

export class AuthError extends Error {}

export interface ClientCredentials { clientId: string; clientSecret: string; tokenUrl: string }
export interface StoredToken { accessToken: string; refreshToken?: string; expiresAt: number; scope: string; obtainedAt: string }

export function configDir(): string {
  return process.env.NHQ_YOUTUBE_DIR ?? join( homedir(), '.config', 'next-huge-quake', 'youtube' );
}
const clientPath = () => join( configDir(), 'client.json' );
const tokenPath = () => join( configDir(), 'token.json' );

function writeSecret( path: string, content: string ): void {
  mkdirSync( configDir(), { recursive: true, mode: 0o700 } );
  writeFileSync( path, content, { mode: 0o600 } );
  chmodSync( path, 0o600 );
}

/** Parses the Google "installed" client JSON. Throws without echoing file contents. */
export function parseClientJson( text: string ): ClientCredentials {
  let raw: any;
  try { raw = JSON.parse( text ); } catch { throw new AuthError( 'Credentials file is not valid JSON.' ); }
  const c = raw?.installed;
  if ( !c ) throw new AuthError( 'Credentials JSON has no "installed" section: create the client as type "Desktop app".' );
  if ( !c.client_id || !c.client_secret ) throw new AuthError( 'Credentials JSON is missing client_id or client_secret.' );
  return { clientId: c.client_id, clientSecret: c.client_secret, tokenUrl: c.token_uri ?? FALLBACK_TOKEN_URL };
}

/** Loads the stored client, or imports it from `sourcePath` (copied into the config directory). */
export function loadClient( sourcePath?: string ): ClientCredentials | undefined {
  if ( sourcePath ) {
    const text = readFileSync( sourcePath, 'utf8' );
    const client = parseClientJson( text );
    writeSecret( clientPath(), text );
    return client;
  }
  return existsSync( clientPath() ) ? parseClientJson( readFileSync( clientPath(), 'utf8' ) ) : undefined;
}

export function loadToken(): StoredToken | undefined {
  return existsSync( tokenPath() ) ? JSON.parse( readFileSync( tokenPath(), 'utf8' ) ) as StoredToken : undefined;
}
const saveToken = ( token: StoredToken ) => writeSecret( tokenPath(), JSON.stringify( token, null, 2 ) );

async function tokenRequest( client: ClientCredentials, params: Record<string, string> ): Promise<any> {
  const res = await fetch( client.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams( { client_id: client.clientId, client_secret: client.clientSecret, ...params } ),
  } );
  const body: any = await res.json().catch( () => ( {} ) );
  if ( !res.ok ) throw new AuthError( `Token request failed: ${ body.error ?? res.status }${ body.error_description ? ` (${ body.error_description })` : '' }` );
  return body;
}

function toStored( body: any, previous?: StoredToken ): StoredToken {
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? previous?.refreshToken,
    expiresAt: Date.now() + ( body.expires_in ?? 3600 ) * 1000,
    scope: body.scope ?? previous?.scope ?? '',
    // A refreshed access token keeps the original consent time: in Testing mode the refresh token dies 7 days after it.
    obtainedAt: body.refresh_token || !previous ? new Date().toISOString() : previous.obtainedAt,
  };
}

/** Browser consent through a loopback redirect on a random local port, with PKCE and a state check. */
async function authorizeInBrowser( client: ClientCredentials, scopes: string[], openUrl: ( url: string ) => void ): Promise<StoredToken> {
  const verifier = randomBytes( 32 ).toString( 'base64url' );
  const challenge = createHash( 'sha256' ).update( verifier ).digest( 'base64url' );
  const state = randomBytes( 16 ).toString( 'base64url' );

  const server = createServer();
  await new Promise<void>( ( resolve, reject ) => { server.once( 'error', reject ); server.listen( 0, '127.0.0.1', resolve ); } );
  const redirectUri = `http://127.0.0.1:${ ( server.address() as { port: number } ).port }`;

  const code = new Promise<string>( ( resolve, reject ) => {
    const timer = setTimeout( () => reject( new AuthError( 'Timed out waiting for browser authorization.' ) ), AUTH_TIMEOUT_MS );
    server.on( 'request', ( req, res ) => {
      const url = new URL( req.url ?? '/', redirectUri );
      if ( url.pathname !== '/' || ( !url.searchParams.has( 'code' ) && !url.searchParams.has( 'error' ) ) ) { res.writeHead( 404 ).end(); return; }
      const error = url.searchParams.get( 'error' );
      const ok = !error && url.searchParams.get( 'state' ) === state && url.searchParams.has( 'code' );
      res.writeHead( ok ? 200 : 400, { 'content-type': 'text/plain; charset=utf-8' } );
      res.end( ok ? 'Authorized. You can close this tab and return to the terminal.' : 'Authorization failed. Return to the terminal.' );
      clearTimeout( timer );
      if ( error ) reject( new AuthError( `Authorization denied: ${ error }` ) );
      else if ( !ok ) reject( new AuthError( 'Authorization response failed the state check.' ) );
      else resolve( url.searchParams.get( 'code' )! );
    } );
  } );
  code.catch( () => {} );

  const authUrl = `${ AUTH_URL }?${ new URLSearchParams( {
    client_id: client.clientId, redirect_uri: redirectUri, response_type: 'code', scope: scopes.join( ' ' ),
    code_challenge: challenge, code_challenge_method: 'S256', state, access_type: 'offline', prompt: 'consent',
  } ) }`;
  try {
    openUrl( authUrl );
    const authorizationCode = await code;
    return toStored( await tokenRequest( client, { code: authorizationCode, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirectUri } ) );
  } finally {
    server.close();
  }
}

export interface AccessOptions {
  openUrl: ( url: string ) => void;
  log: ( line: string ) => void;
  /** Scopes the caller needs; default read-only. */
  scopes?: string[];
  /** false: never open a browser; throw when a (re)authorization would be needed. Used by dry runs and every write command. */
  interactive?: boolean;
}

/**
 * Returns a valid access token: reuses the stored one, refreshes it, or runs the browser flow.
 * A stored token whose scopes do not cover `scopes` is never reused (scope upgrade = new consent), but it is only replaced
 * after the new consent succeeds, so a cancelled upgrade leaves the working read-only token in place.
 * A refresh token rejected with invalid_grant (Testing mode: 7 days; or revoked) requires a new consent.
 */
export async function getAccessToken( client: ClientCredentials, { openUrl, log, scopes = READ_SCOPES, interactive = true }: AccessOptions ): Promise<string> {
  const needConsent = ( why: string ): never => { throw new AuthError( `${ why } Run "npm run youtube:connect${ scopes === READ_SCOPES ? '' : ' -- --write' }" to authorize.` ); };
  let token = loadToken();
  if ( token && !scopesSatisfy( token.scope, scopes ) ) {
    if ( !interactive ) needConsent( 'The stored authorization lacks the required YouTube permissions.' );
    token = undefined;
  }
  if ( token && token.expiresAt - Date.now() > 60_000 ) return token.accessToken;
  if ( token?.refreshToken ) {
    try {
      token = toStored( await tokenRequest( client, { grant_type: 'refresh_token', refresh_token: token.refreshToken } ), token );
      saveToken( token );
      return token.accessToken;
    } catch ( error ) {
      if ( !( error instanceof AuthError ) || !error.message.includes( 'invalid_grant' ) ) throw error;
      if ( !interactive ) needConsent( 'Stored authorization expired or was revoked (Testing-mode refresh tokens last 7 days).' );
      log( 'Stored authorization expired or was revoked (Testing-mode refresh tokens last 7 days). Re-authorizing.' );
    }
  }
  if ( !interactive ) needConsent( 'No stored authorization.' );
  log( `Opening your browser for Google authorization (${ scopes === READ_SCOPES ? 'read-only' : 'upload and manage' } YouTube access)...` );
  token = await authorizeInBrowser( client, scopes, openUrl );
  saveToken( token );
  return token.accessToken;
}
