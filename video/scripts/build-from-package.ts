/**
 * Builds the VideoSpec and the review script from an M1 video package. Does not render.
 *
 * Usage: tsx scripts/build-from-package.ts <package.json> [--out=<dir>]   (default: out/packages/<eventId>/)
 * Writes <dir>/spec.json and <dir>/script.txt.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { scriptText, specFromPackage } from '../src/spec/package.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const file = args.find( arg => !arg.startsWith( '--' ) );
if ( !file ) {
  console.error( 'usage: tsx scripts/build-from-package.ts <package.json> [--out=<dir>]' );
  process.exit( 2 );
}

try {
  const { pkg, spec } = specFromPackage( JSON.parse( readFileSync( file, 'utf8' ) ) );
  const outArg = args.find( arg => arg.startsWith( '--out=' ) )?.slice( '--out='.length );
  const out = outArg ? resolve( outArg ) : join( root, 'out', 'packages', pkg.event.id );
  mkdirSync( out, { recursive: true } );
  writeFileSync( join( out, 'spec.json' ), `${JSON.stringify( spec, null, 2 )}\n` );
  writeFileSync( join( out, 'script.txt' ), scriptText( pkg ) );
  console.log( `wrote ${join( out, 'spec.json' )}\nwrote ${join( out, 'script.txt' )}` );
} catch ( error ) {
  console.error( `invalid video package: ${error instanceof Error ? error.message : String( error )}` );
  process.exit( 1 );
}
