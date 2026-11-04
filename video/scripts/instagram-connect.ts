/**
 * Instagram Publisher v1: stores the long-lived token generated in the Meta App Dashboard and prints a connection report.
 * Reads only; changes nothing on Instagram.
 *
 * Usage:
 *   npm run instagram:connect             paste the token at the hidden prompt
 *   pbpaste | npm run instagram:connect   or pipe it in
 *   npm run instagram:connect -- --check  verify (and, when due, refresh) the stored token
 *
 * The token is stored in ~/.config/next-huge-quake/instagram/token.json (outside Git, mode 0600) and is never printed.
 */
import { createInterface } from 'node:readline/promises';
import { AuthError, assertAuthorizedAccount, configDir, daysLeft, getAccessToken, newToken, parsePastedToken, saveToken } from '../src/instagram/auth.js';
import { getMe } from '../src/instagram/graph.js';

async function readToken(): Promise<string> {
  if ( !process.stdin.isTTY ) {
    let text = '';
    for await ( const chunk of process.stdin ) text += chunk;
    return parsePastedToken( text );
  }
  const prompt = 'Paste the Instagram access token from the App Dashboard (input hidden): ';
  const rl = createInterface( { input: process.stdin, output: process.stdout, terminal: true } );
  // Echo the prompt only, never the typed characters.
  ( rl as any )._writeToOutput = ( s: string ) => { if ( s.includes( prompt ) ) process.stdout.write( prompt ); };
  try { return parsePastedToken( await rl.question( prompt ) ); } finally { rl.close(); process.stdout.write( '\n' ); }
}

async function main() {
  const check = process.argv.includes( '--check' );
  const existing = check ? await getAccessToken( console.log ) : undefined;
  const token = existing?.accessToken ?? await readToken();
  const me = await getMe( token );
  assertAuthorizedAccount( me );
  const stored = existing ?? newToken( token, me.userId, me.username );
  if ( stored.userId !== me.userId ) throw new AuthError( `Instagram user id changed (${ stored.userId } -> ${ me.userId }). Refusing.` );
  if ( !check ) saveToken( stored );

  console.log( '\nInstagram connection report (reads only; changes nothing)' );
  console.log( `  Account:      @${ me.username } (${ me.accountType })` );
  console.log( `  IG user id:   ${ me.userId }` );
  console.log( `  Token:        valid about ${ daysLeft( stored ) } more days${ check ? '' : ' (dashboard tokens last 60 days)' }; refreshed automatically by later commands after 7 days` );
  console.log( `  Stored in:    ${ configDir() } (outside Git)` );
}

main().catch( error => {
  console.error( `\nFailed: ${ error instanceof Error ? error.message : 'unknown error' }` );
  process.exit( 1 );
} );
