/**
 * Prepares the DEM tiles for the terrain spike (M2.2a): AWS Terrain Tiles (Terrarium PNG), fetched once into a local
 * cache and copied into public/terrain/ (both gitignored), so renders never touch the network.
 *
 * For each target, the tile set is estimated from the news camera path (src/map/demTiles.ts): every frame for
 * fixtures, the still frames for probes. The estimate is checked against what MapLibre
 * actually requested during renders by scripts/check-terrain-coverage.ts.
 *
 * Usage: tsx scripts/prepare-terrain.ts [--plan] [--offline] [target ...]   (default: fixtures and probes)
 *   target      a fixture name, a probe name, or the path to a VideoSpec .json file (bare or `{ spec }`, e.g. out/news/<fixture>.spec.json)
 *   --plan      print tile counts per zoom and target and the expected download, fetch nothing
 *   --offline   never fetch; fail if any tile is not cached (proves the cache is complete)
 *
 * Writes public/terrain/{z}/{x}/{y}.png and public/terrain/manifest.json (tiles, hashes, sizes, sources, attribution).
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OGL_CANADA_URL, TERRAIN_DATASET, TERRAIN_REQUIRED_ATTRIBUTION, TERRAIN_SOURCES_AT_PREPARED_ZOOMS } from '../src/copy/credits.js';
import { countByZoom, DEM_MAX_ZOOM, sortTiles } from '../src/map/demTiles.js';
import { TERRAIN_TILES_REMOTE } from '../src/map/terrainStyle.js';
import { estimatedTiles, SPIKE_FIXTURES, SPIKE_PROBES, terrainTarget } from './lib/terrain-targets.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const cacheDir = join( root, 'cache', 'terrain' );
const publicDir = join( root, 'public', 'terrain' );
const CONCURRENCY = 4;
const RETRIES = 3;
/** Mean size of a sampled Terrarium tile (z3-z8), used only for the --plan estimate of uncached tiles. */
const ESTIMATED_TILE_BYTES = 95_000;
const PNG_SIGNATURE = Buffer.from( [ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ] );

/** Attribution record for the manifest, from the shared credits module (verified at Gates A and B). */
export const TERRAIN_ATTRIBUTION = {
  ...TERRAIN_DATASET,
  credit: 'Mapzen',
  requiredAttribution: TERRAIN_REQUIRED_ATTRIBUTION,
  oglCanada: OGL_CANADA_URL,
  sourcesAtPreparedZooms: TERRAIN_SOURCES_AT_PREPARED_ZOOMS,
  aboveDemMaxZoom: 'EU-DEM, 3DEP, ArcticDEM, UK, AT, AU, MX, NO, NZ sources (z9+) are not used while DEM_MAX_ZOOM <= 8; the exported credits still list the complete required attribution.'
};

const args = process.argv.slice( 2 );
const planOnly = args.includes( '--plan' );
const offline = args.includes( '--offline' );
const names = args.filter( a => !a.startsWith( '--' ) );
const targets = ( names.length > 0 ? names : [ ...SPIKE_FIXTURES, ...SPIKE_PROBES ] ).map( terrainTarget );

const cachePath = ( key: string ) => join( cacheDir, `${key}.png` );
const isPng = ( data: Buffer ) => data.length > PNG_SIGNATURE.length && data.subarray( 0, 8 ).equals( PNG_SIGNATURE );
const mb = ( bytes: number ) => ( bytes / 1e6 ).toFixed( 1 );

const perTarget = targets.map( t => ( { t, tiles: estimatedTiles( t ) } ) );
const union = sortTiles( new Set( perTarget.flatMap( p => p.tiles ) ) );
const cachedBytes = ( keys: string[] ) => keys.filter( k => existsSync( cachePath( k ) ) ).reduce( ( sum, k ) => sum + statSync( cachePath( k ) ).size, 0 );

console.log( `DEM max zoom ${DEM_MAX_ZOOM}; tiles per zoom level and target:` );
for ( const { t, tiles } of perTarget ) {
  console.log( `  ${t.name.padEnd( 15 )} ${String( tiles.length ).padStart( 5 )} tiles  ${JSON.stringify( countByZoom( tiles ) )}  (${t.kind}, ${t.frames.length} frames)` );
}
const missing = union.filter( k => !existsSync( cachePath( k ) ) );
console.log( `  ${'union'.padEnd( 15 )} ${String( union.length ).padStart( 5 )} tiles  ${JSON.stringify( countByZoom( union ) )}` );
console.log( `cached ${union.length - missing.length} (${mb( cachedBytes( union ) )} MB); to download ${missing.length} (about ${mb( missing.length * ESTIMATED_TILE_BYTES )} MB)` );

if ( planOnly ) {
  process.exit( 0 );
}
if ( offline && missing.length > 0 ) {
  console.error( `--offline: ${missing.length} tiles are not cached, e.g. ${missing.slice( 0, 5 ).join( ', ' )}` );
  process.exit( 1 );
}

async function fetchTile( key: string ) {
  const url = TERRAIN_TILES_REMOTE.replace( '{z}/{x}/{y}', key );
  for ( let attempt = 1; ; attempt++ ) {
    try {
      const response = await fetch( url );
      if ( !response.ok ) {
        throw new Error( `HTTP ${response.status}` );
      }
      const data = Buffer.from( await response.arrayBuffer() );
      if ( !isPng( data ) ) {
        throw new Error( 'not a PNG' );
      }
      mkdirSync( dirname( cachePath( key ) ), { recursive: true } );
      writeFileSync( cachePath( key ), data );
      return;
    } catch ( error ) {
      if ( attempt >= RETRIES ) {
        throw new Error( `${url}: ${( error as Error ).message}` );
      }
      await new Promise( r => setTimeout( r, 500 * attempt ) );
    }
  }
}

let done = 0;
const queue = [ ...missing ];
await Promise.all( Array.from( { length: CONCURRENCY }, async () => {
  for ( let key = queue.shift(); key; key = queue.shift() ) {
    await fetchTile( key );
    if ( ++done % 100 === 0 ) {
      console.log( `fetched ${done}/${missing.length}` );
    }
  }
} ) );

/** The manifest accumulates: preparing one event keeps the tiles and targets of earlier events. */
const manifestPath = join( publicDir, 'manifest.json' );
const previous = existsSync( manifestPath ) ? JSON.parse( readFileSync( manifestPath, 'utf8' ) ) as { tiles?: Record<string, { bytes: number; sha256: string }>; targets?: Record<string, unknown> } : {};
const tiles: Record<string, { bytes: number; sha256: string }> = { ...previous.tiles };
for ( const key of union ) {
  const data = readFileSync( cachePath( key ) );
  if ( !isPng( data ) ) {
    throw new Error( `cached tile ${key} is not a PNG` );
  }
  const target = join( publicDir, `${key}.png` );
  mkdirSync( dirname( target ), { recursive: true } );
  copyFileSync( cachePath( key ), target );
  tiles[key] = { bytes: data.length, sha256: createHash( 'sha256' ).update( data ).digest( 'hex' ) };
}
const allKeys = sortTiles( Object.keys( tiles ) );
const totalBytes = Object.values( tiles ).reduce( ( sum, t ) => sum + t.bytes, 0 );
const manifest = {
  generatedBy: 'scripts/prepare-terrain.ts',
  preparedAt: new Date().toISOString(),
  source: { urlTemplate: TERRAIN_TILES_REMOTE, encoding: 'terrarium', tileSize: 256, maxZoom: DEM_MAX_ZOOM },
  attribution: TERRAIN_ATTRIBUTION,
  targets: { ...previous.targets, ...Object.fromEntries( perTarget.map( ( { t, tiles: list } ) => [ t.name, {
    kind: t.kind,
    frames: t.kind === 'fixture' ? `0-${t.frames.length - 1}` : t.frames,
    tiles: list.length,
    byZoom: countByZoom( list ),
    bytes: list.reduce( ( sum, k ) => sum + tiles[k].bytes, 0 )
  } ] ) ) },
  totals: { tiles: allKeys.length, bytes: totalBytes, byZoom: countByZoom( allKeys ) },
  tiles
};
writeFileSync( manifestPath, JSON.stringify( manifest, null, 2 ) );
console.log( `wrote ${allKeys.length} tiles (${mb( totalBytes )} MB) and public/terrain/manifest.json` );
