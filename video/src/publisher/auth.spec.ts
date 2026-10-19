import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AuthError, loadClient, parseClientJson } from './auth.js';

const valid = JSON.stringify( { installed: { client_id: 'id', client_secret: 'secret', token_uri: 'https://oauth2.googleapis.com/token' } } );

describe( 'parseClientJson', () => {
  it( 'reads an installed-app client', () => {
    expect( parseClientJson( valid ) ).toEqual( { clientId: 'id', clientSecret: 'secret', tokenUrl: 'https://oauth2.googleapis.com/token' } );
  } );
  it( 'rejects web clients and bad JSON without echoing contents', () => {
    expect( () => parseClientJson( JSON.stringify( { web: { client_id: 'x', client_secret: 'topsecret' } } ) ) ).toThrow( AuthError );
    expect( () => parseClientJson( 'not json topsecret' ) ).toThrow( /^Credentials file is not valid JSON\.$/ );
  } );
} );

describe( 'loadClient', () => {
  it( 'copies the credentials to the config dir with mode 0600', () => {
    const dir = mkdtempSync( join( tmpdir(), 'nhq-yt-' ) );
    process.env.NHQ_YOUTUBE_DIR = join( dir, 'cfg' );
    const src = join( dir, 'src.json' );
    writeFileSync( src, valid );
    loadClient( src );
    expect( statSync( join( dir, 'cfg', 'client.json' ) ).mode & 0o777 ).toBe( 0o600 );
    expect( readFileSync( join( dir, 'cfg', 'client.json' ), 'utf8' ) ).toBe( valid );
    expect( loadClient()?.clientId ).toBe( 'id' );
  } );
} );
