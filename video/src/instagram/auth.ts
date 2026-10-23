/**
 * Instagram Publisher v1: long-lived Instagram User access token (Instagram Login), generated in the Meta App Dashboard
 * ("API setup with Instagram login" > Generate token) and pasted once into `npm run instagram:connect`.
 *
 * Stored outside the repository in ~/.config/next-huge-quake/instagram/token.json (override: NHQ_INSTAGRAM_DIR), mode 0600.
 * Dashboard tokens last 60 days; a refresh (allowed once the token is >= 24 h old) extends that to 60 days from the refresh.
 * Nothing here prints the token.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { refreshToken } from './graph.js';

/** The only account this tool may act on. */
export const AUTHORIZED_USERNAME = 'nexthugequake';
const DAY = 24 * 3600 * 1000;
const TOKEN_LIFETIME_MS = 60 * DAY;
/** Refresh once the token is this old, so a weekly run keeps it alive without ever getting close to expiry. */
const REFRESH_AFTER_MS = 7 * DAY;

export class AuthError extends Error {}

export interface StoredToken { accessToken: string; userId: string; username: string; obtainedAt: string; expiresAt: number }

export const configDir = () => process.env.NHQ_INSTAGRAM_DIR ?? join( homedir(), '.config', 'next-huge-quake', 'instagram' );
const tokenPath = () => join( configDir(), 'token.json' );

export const loadToken = (): StoredToken | undefined => existsSync( tokenPath() ) ? JSON.parse( readFileSync( tokenPath(), 'utf8' ) ) as StoredToken : undefined;

export function saveToken( token: StoredToken ): void {
  mkdirSync( configDir(), { recursive: true, mode: 0o700 } );
  writeFileSync( tokenPath(), JSON.stringify( token, null, 2 ), { mode: 0o600 } );
  chmodSync( tokenPath(), 0o600 );
}

/** A token as pasted: trims whitespace and quotes; rejects anything that is obviously not a single token. Never echoes it. */
export function parsePastedToken( text: string ): string {
  const t = text.trim().replace( /^['"]|['"]$/g, '' );
  if ( !t ) throw new AuthError( 'No token given.' );
  if ( /\s/.test( t ) || t.length < 50 ) throw new AuthError( 'That does not look like an access token (expected one long string without spaces).' );
  return t;
}

/** Refuses anything but the authorized professional account. */
export function assertAuthorizedAccount( me: { username: string; accountType: string } ): void {
  if ( me.username !== AUTHORIZED_USERNAME ) throw new AuthError( `Token belongs to @${ me.username }, expected @${ AUTHORIZED_USERNAME }. Refusing.` );
  if ( ![ 'BUSINESS', 'MEDIA_CREATOR' ].includes( String( me.accountType ).toUpperCase() ) ) throw new AuthError( `@${ me.username } is a ${ me.accountType } account, not a professional account.` );
}

export const daysLeft = ( t: StoredToken, now = Date.now() ) => Math.floor( ( t.expiresAt - now ) / DAY );
export const newToken = ( accessToken: string, userId: string, username: string, now = Date.now(), lifetimeMs = TOKEN_LIFETIME_MS ): StoredToken =>
  ( { accessToken, userId, username, obtainedAt: new Date( now ).toISOString(), expiresAt: now + lifetimeMs } );

/** The stored token, refreshed first when it is older than a week. Never prompts. */
export async function getAccessToken( log: ( line: string ) => void ): Promise<StoredToken> {
  const t = loadToken();
  if ( !t ) throw new AuthError( 'No stored Instagram token. Run "npm run instagram:connect" first.' );
  if ( t.expiresAt <= Date.now() ) throw new AuthError( 'The stored Instagram token has expired. Generate a new one in the App Dashboard and run "npm run instagram:connect".' );
  if ( Date.now() - Date.parse( t.obtainedAt ) < REFRESH_AFTER_MS ) return t;
  const r = await refreshToken( t.accessToken );
  const next = newToken( r.accessToken, t.userId, t.username, Date.now(), ( r.expiresIn ?? TOKEN_LIFETIME_MS / 1000 ) * 1000 );
  saveToken( next );
  log( `Instagram token refreshed; valid for ${ daysLeft( next ) } more days.` );
  return next;
}
