import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock( '../../shared/run_cli.js', () => ( { runVideoScript: vi.fn( async () => 'ok' ), videoDir: () => '/v' } ) );
const { assertNotStopped, GUARDED_COMMANDS } = await import( './steps.js' );

describe( 'emergency stop before every write', () => {
  const pauseFile = join( mkdtempSync( join( tmpdir(), 'ft-' ) ), 'PAUSED' );
  const on = { FAST_TRACK_ENABLED: 'true', FAST_TRACK_PAUSE_FILE: pauseFile };

  it( 'guards approve, upload and publish-now, never the read-only recovery commands', () => {
    expect( GUARDED_COMMANDS ).toEqual( [ 'approve', 'upload', 'publish-now' ] );
    for ( const cmd of GUARDED_COMMANDS ) {
      expect( () => assertNotStopped( [ cmd, 'm' ], on ) ).not.toThrow();
      expect( () => assertNotStopped( [ cmd, 'm' ], {} ) ).toThrow( `fast_track_stopped: fast_track_disabled (before ${cmd})` );
    }
    for ( const cmd of [ 'reconcile', 'inspect' ] ) {
      expect( () => assertNotStopped( [ cmd, 'm' ], {} ) ).not.toThrow();
    }
  } );

  it( 'reads the pause file on every call, so a pause takes effect between steps and retries', () => {
    expect( () => assertNotStopped( [ 'publish-now', 'm' ], on ) ).not.toThrow();
    writeFileSync( pauseFile, '' );
    expect( () => assertNotStopped( [ 'publish-now', 'm' ], on ) ).toThrow( 'fast_track_paused' );
    expect( () => assertNotStopped( [ 'reconcile', 'm' ], on ) ).not.toThrow();
  } );
} );
