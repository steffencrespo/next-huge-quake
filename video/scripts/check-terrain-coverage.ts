/**
 * Independent DEM coverage check for the terrain spike (M2.2a).
 *
 * Reads the TILEREQ lines LiveMap logs for every raster-DEM tile MapLibre requested during a render
 * (`remotion render ... --log=verbose`) and checks, per render log:
 * - every requested tile is listed in public/terrain/manifest.json and the file exists with the recorded hash;
 * - the estimate for the render's target (src/map/demTiles.ts) contains every requested tile;
 * - how much of the estimate was used (the over-fetch ratio).
 *
 * Usage: tsx scripts/check-terrain-coverage.ts [--manifest=off] [--out=path.json] <target>=<render.log> ...
 *   --manifest=off   only compare with the estimate (for discovery renders made before tiles were prepared)
 * Exits non-zero if any requested tile is missing from the manifest or from the estimate.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { countByZoom, sortTiles } from '../src/map/demTiles.js';
import { estimatedTiles, terrainTarget } from './lib/terrain-targets.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const args = process.argv.slice( 2 );
const option = ( name: string ) => args.find( a => a.startsWith( `--${name}=` ) )?.slice( name.length + 3 );
const useManifest = option( 'manifest' ) !== 'off';
const outFile = option( 'out' );
const pairs = args.filter( a => !a.startsWith( '--' ) ).map( a => a.split( '=' ) as [ string, string ] );

type Manifest = { tiles: Record<string, { bytes: number; sha256: string }> };
const manifest: Manifest | null = useManifest ? JSON.parse( readFileSync( join( root, 'public', 'terrain', 'manifest.json' ), 'utf8' ) ) : null;

function requestedTiles( log: string ): string[] {
  const keys = new Set<string>();
  for ( const line of readFileSync( log, 'utf8' ).split( '\n' ) ) {
    const match = /TILEREQ (\d+\/\d+\/\d+)/.exec( line );
    if ( match ) {
      keys.add( match[1] );
    }
  }
  return sortTiles( keys );
}

let failed = false;
const results = pairs.map( ( [ name, log ] ) => {
  const requested = requestedTiles( log );
  const estimate = new Set( estimatedTiles( terrainTarget( name ) ) );
  const notEstimated = requested.filter( k => !estimate.has( k ) );
  const notPrepared = manifest ? requested.filter( k => {
    const entry = manifest.tiles[k];
    const file = join( root, 'public', 'terrain', `${k}.png` );
    return !entry || !existsSync( file ) || createHash( 'sha256' ).update( readFileSync( file ) ).digest( 'hex' ) !== entry.sha256;
  } ) : [];
  const result = {
    target: name,
    log,
    requested: requested.length,
    requestedByZoom: countByZoom( requested ),
    estimated: estimate.size,
    estimatedByZoom: countByZoom( estimate ),
    usedShareOfEstimate: Number( ( requested.length / estimate.size ).toFixed( 3 ) ),
    notEstimated,
    notPrepared: manifest ? notPrepared : 'not checked'
  };
  if ( requested.length === 0 || notEstimated.length > 0 || notPrepared.length > 0 ) {
    failed = true;
  }
  console.log( JSON.stringify( { ...result, notEstimated: notEstimated.slice( 0, 20 ), notEstimatedCount: notEstimated.length } ) );
  return result;
} );

if ( outFile ) {
  writeFileSync( outFile, JSON.stringify( results, null, 2 ) );
}
if ( failed ) {
  console.error( 'coverage check FAILED (no requests logged, or tiles missing from the estimate or the manifest)' );
  process.exit( 1 );
}
console.log( 'coverage check passed' );
