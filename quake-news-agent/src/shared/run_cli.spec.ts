import { basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { videoDir } from './run_cli.js';

afterEach( () => {
  vi.restoreAllMocks();
  delete process.env.VIDEO_DIR;
} );

describe( 'videoDir', () => {
  it( 'finds the sibling video/ package regardless of the working directory', () => {
    vi.spyOn( process, 'cwd' ).mockReturnValue( '/somewhere/node_modules/@outputai/core' );
    const dir = videoDir();
    expect( basename( dir ) ).toBe( 'video' );
    expect( existsSync( join( dir, 'scripts', 'render-package.ts' ) ) ).toBe( true );
  } );

  it( 'honors VIDEO_DIR', () => {
    process.env.VIDEO_DIR = '/custom/video';
    expect( videoDir() ).toBe( '/custom/video' );
  } );
} );
