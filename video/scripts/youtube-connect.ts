/**
 * YouTube Publisher M1: authenticates with the channel (read-only) and prints a connection report. Changes nothing on YouTube.
 *
 * Usage: tsx scripts/youtube-connect.ts [--credentials=<client_secret.json>] [--write]
 * --write upgrades the stored authorization to upload/manage scopes (M2). Consent only: still no write to YouTube happens here.
 * The credentials file is taken from --credentials, then YOUTUBE_CREDENTIALS_FILE, then the copy stored from an earlier run,
 * then a macOS file chooser, then a typed path. It is copied to ~/.config/next-huge-quake/youtube/ (outside Git).
 */
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { AuthError, READ_SCOPES, WRITE_SCOPES, configDir, getAccessToken, loadClient, loadToken } from '../src/publisher/auth.js';
import { getMyChannels, listMyPlaylists } from '../src/publisher/youtube.js';

function chooseFile(): string | undefined {
  if ( process.platform !== 'darwin' ) return undefined;
  try {
    return execFileSync( 'osascript', [ '-e', 'POSIX path of (choose file with prompt "Select the OAuth client JSON downloaded from Google Cloud")' ], { encoding: 'utf8' } ).trim() || undefined;
  } catch { return undefined; }
}

async function askPath(): Promise<string> {
  const rl = createInterface( { input: process.stdin, output: process.stdout } );
  try { return ( await rl.question( 'Path to the downloaded OAuth client JSON: ' ) ).trim().replace( /^['"]|['"]$/g, '' ); } finally { rl.close(); }
}

function openUrl( url: string ): void {
  try { execFileSync( process.platform === 'darwin' ? 'open' : 'xdg-open', [ url ] ); } catch { /* fall through to printing */ }
  console.log( `If the browser did not open, visit:\n${ url }\n` );
}

async function main() {
  const given = process.argv.slice( 2 ).find( a => a.startsWith( '--credentials=' ) )?.slice( 14 ) ?? process.env.YOUTUBE_CREDENTIALS_FILE;
  let client = loadClient( given );
  if ( !client ) {
    const path = chooseFile() ?? await askPath();
    if ( !path ) throw new AuthError( 'No credentials file selected.' );
    client = loadClient( path );
  }
  const write = process.argv.includes( '--write' );
  const accessToken = await getAccessToken( client!, { openUrl, log: console.log, scopes: write ? WRITE_SCOPES : READ_SCOPES } );

  const channels = await getMyChannels( accessToken );
  if ( channels.length === 0 ) throw new AuthError( 'This Google account has no YouTube channel. If the channel is a Brand Account, choose it on the consent screen.' );
  const playlists = await listMyPlaylists( accessToken );
  const token = loadToken();

  console.log( '\nYouTube connection report (reads only; changes nothing)' );
  for ( const c of channels ) {
    console.log( `  Channel:   ${ c.title }${ c.customUrl ? ` (${ c.customUrl })` : '' }` );
    console.log( `  Channel ID: ${ c.id }   videos: ${ c.videoCount ?? '?' }` );
  }
  console.log( `  Playlists: ${ playlists.length }` );
  for ( const p of playlists ) console.log( `    ${ p.id }  ${ p.title }  [${ p.itemCount ?? '?' } items, ${ p.privacy ?? '?' }]` );
  console.log( `  Scope:     ${ token?.scope.replaceAll( 'https://www.googleapis.com/auth/', '' ) }` );
  console.log( `  Stored in: ${ configDir() } (outside Git)` );
  if ( token ) console.log( `  Authorized ${ token.obtainedAt }. Testing-mode consent expires after 7 days: rerun this command (with --write if publishing) to renew.` );
}

main().catch( error => {
  console.error( `\nFailed: ${ error instanceof Error ? error.message : 'unknown error' }` );
  process.exit( 1 );
} );
