import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The renderer must not depend on M1's Output.ai / Temporal runtime. */
const FORBIDDEN = /from\s+['"](@outputai\/|@temporalio\/|[./]*quake-news-agent)/;
const root = new URL( '.', import.meta.url ).pathname;

const sourceFiles = ( dir: string ): string[] => readdirSync( dir, { withFileTypes: true } ).flatMap( entry => {
  const path = join( dir, entry.name );
  return entry.isDirectory() ? sourceFiles( path ) : /\.tsx?$/.test( entry.name ) ? [ path ] : [];
} );

describe( 'independence', () => {
  it( 'no source file imports Output.ai, Temporal or the M1 package', () => {
    const offenders = sourceFiles( root ).filter( file => FORBIDDEN.test( readFileSync( file, 'utf8' ) ) );
    expect( offenders ).toEqual( [] );
  } );
} );
