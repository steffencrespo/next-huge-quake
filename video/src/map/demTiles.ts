/**
 * DEM tile selection for the terrain spike (M2.2a). Pure: no I/O, no browser APIs, so the prepare script and tests
 * use the same code.
 *
 * For every frame of a camera path, select the Terrarium tiles MapLibre may request: the ideal DEM zoom for the
 * frame's camera, plus one coarser level (pitched views and the globe load distant tiles at lower zooms),
 * inside a conservative footprint of the view. (MapLibre's globe never requested tiles below z3 at the news camera's
 * zooms, so no global low-zoom base is needed.) The selection is checked
 * against the tiles MapLibre actually requested during a render (TILEREQ lines, scripts/check-terrain-coverage.ts).
 */
import type { MapCamera } from './LiveMap.js';

/** Terrarium tiles are 256 px; MapLibre's world is 512 px at zoom 0, so the ideal DEM zoom is the map zoom + 1. */
export const DEM_TILE_SIZE = 256;
/** Highest DEM zoom prepared; MapLibre overzooms beyond it (the news camera ends at z6.8, ideal DEM zoom 8). */
export const DEM_MAX_ZOOM = 8;
export type SelectionOptions = {
  /** Footprint margin around the estimated view (multiplies screen distances). */
  margin: number;
  /** Coarser levels below the ideal one: MapLibre loads the pitched far field and the globe's limb at lower zooms. */
  coarserLevels: number;
};
/**
 * Calibrated in M2.2a against every tile MapLibre requested along the full Noto and Kamchatka camera paths
 * (out/m2-2/a/discover-*.log): no misses, at about 2-2.5x the requested count. Tighter variants missed tiles: a smaller
 * ideal-zoom area near the globe's limb, and the ideal zoom limited to the unpitched view (a one-frame render at
 * frame 165 requests ideal-zoom tiles in the pitched far field). So this stays deliberately simple and conservative.
 */
export const DEFAULT_SELECTION: SelectionOptions = { margin: 1.0, coarserLevels: 1 };
const VIEW = { width: 1080, height: 1920 };
const MAX_LAT = 85.0511287798;

export type Tile = { z: number; x: number; y: number };
export const tileKey = ( t: Tile ) => `${t.z}/${t.x}/${t.y}`;
export const parseTileKey = ( key: string ): Tile => {
  const [ z, x, y ] = key.split( '/' ).map( Number );
  return { z, x, y };
};

/** Web Mercator, normalized to [0, 1) in x (west to east) and [0, 1] in y (north to south). */
export function mercator( lon: number, lat: number ): [ number, number ] {
  const clamped = Math.max( -MAX_LAT, Math.min( MAX_LAT, lat ) );
  const s = Math.sin( clamped * Math.PI / 180 );
  const x = ( ( ( lon + 180 ) / 360 ) % 1 + 1 ) % 1;
  return [ x, 0.5 - Math.log( ( 1 + s ) / ( 1 - s ) ) / ( 4 * Math.PI ) ];
}

export function lonLatToTile( lon: number, lat: number, z: number ): Tile {
  const n = 2 ** z;
  const [ x, y ] = mercator( lon, lat );
  return { z, x: Math.min( n - 1, Math.floor( x * n ) ), y: Math.min( n - 1, Math.floor( y * n ) ) };
}

export const idealDemZoom = ( mapZoom: number ) => Math.min( DEM_MAX_ZOOM, Math.max( 0, Math.round( mapZoom + Math.log2( 512 / DEM_TILE_SIZE ) ) ) );

/** Latitude of a tile row's north (y) or south (y + 1) edge. */
const rowLatitude = ( y: number, n: number ) => ( Math.atan( Math.sinh( Math.PI * ( 1 - ( 2 * y ) / n ) ) ) * 180 ) / Math.PI;

/**
 * Tiles at zoom z within a footprint: rows between its latitudes; in each row, the longitudes within `side` degrees
 * (great-circle) of the center meridian, measured at the row's poleward edge, so rows near a pole widen to full rings.
 */
function tilesInFootprint( z: number, { lon, lat0, lat1, side }: Footprint, into: Set<string> ) {
  const n = 2 ** z;
  const yStart = lonLatToTile( 0, lat1, z ).y;
  const yEnd = lonLatToTile( 0, lat0, z ).y;
  const sinSide = Math.sin( ( Math.min( side, 90 ) * Math.PI ) / 180 );
  for ( let y = yStart; y <= yEnd; y++ ) {
    const poleward = Math.max( Math.abs( rowLatitude( y, n ) ), Math.abs( rowLatitude( y + 1, n ) ) );
    const ratio = sinSide / Math.cos( ( poleward * Math.PI ) / 180 );
    const half = side >= 90 || ratio >= 1 ? 180 : ( Math.asin( ratio ) * 180 ) / Math.PI;
    const xStart = Math.floor( ( ( lon - half + 180 ) / 360 ) * n );
    const xEnd = Math.floor( ( ( lon + half + 180 ) / 360 ) * n );
    const cols = Math.min( n, xEnd - xStart + 1 );
    for ( let i = 0; i < cols; i++ ) {
      into.add( `${z}/${( ( xStart + i ) % n + n ) % n}/${y}` );
    }
  }
}

/** MapLibre's default vertical field of view (36.87 degrees). */
const FOV = 0.6435011087932844;

/**
 * Ground distances, in screen pixels at the camera center's scale, from the center to the top and bottom view edges
 * of a pitched camera (flat-ground approximation), and the far edge's width scale relative to the center.
 */
function pitchedExtent( up: number, down: number, pitch: number ) {
  const distance = VIEW.height / 2 / Math.tan( FOV / 2 );
  const height = distance * Math.cos( pitch );
  const offset = distance * Math.sin( pitch );
  const topAngle = Math.min( pitch + Math.atan( up / distance ), ( 85 * Math.PI ) / 180 );
  const bottomAngle = pitch - Math.atan( down / distance );
  return {
    up: height * Math.tan( topAngle ) - offset,
    down: offset - height * Math.tan( bottomAngle ),
    farScale: height / Math.cos( topAngle ) / distance
  };
}

/** A view's footprint: center longitude, latitude range and half-width (great-circle degrees), all in degrees. */
export type Footprint = { lon: number; lat0: number; lat1: number; side: number };

/**
 * Conservative footprint of one camera state on the globe.
 *
 * The globe's radius in pixels is world / 2pi, so a ground point d pixels from the center lies asin(d / R) away
 * (the whole visible hemisphere once the globe fits inside the view). Bottom padding draws the center higher, so more
 * of the map below it is visible; pitch extends the view upward and widens its far edge.
 */
export function viewFootprint( camera: MapCamera, margin = DEFAULT_SELECTION.margin ): Footprint {
  const [ lon, lat ] = camera.center;
  const radius = ( 512 * 2 ** camera.zoom ) / ( 2 * Math.PI );
  const padBottom = camera.padding?.bottom ?? 0;
  const padTop = camera.padding?.top ?? 0;
  const pitched = pitchedExtent( ( VIEW.height - padBottom + padTop ) / 2, ( VIEW.height + padBottom - padTop ) / 2, ( camera.pitch * Math.PI ) / 180 );
  const angle = ( px: number ) => ( px * margin >= radius ? 90 : ( Math.asin( ( px * margin ) / radius ) * 180 ) / Math.PI );
  // A rotated view (bearing) spans more in every direction: use the half-diagonal as a floor.
  const rotated = Math.abs( Math.sin( ( camera.bearing * Math.PI ) / 180 ) ) * Math.hypot( VIEW.width, VIEW.height ) / 2;
  return {
    lon,
    lat0: Math.max( -MAX_LAT, lat - angle( Math.max( pitched.down, rotated ) ) ),
    lat1: Math.min( MAX_LAT, lat + angle( Math.max( pitched.up, rotated ) ) ),
    side: angle( Math.max( ( VIEW.width / 2 ) * pitched.farScale, rotated ) )
  };
}

/** Tiles one camera state may request. */
export function tilesForCamera( camera: MapCamera, into = new Set<string>(), options = DEFAULT_SELECTION ): Set<string> {
  const ideal = idealDemZoom( camera.zoom );
  const footprint = viewFootprint( camera, options.margin );
  for ( let z = Math.max( 0, ideal - options.coarserLevels ); z <= ideal; z++ ) {
    tilesInFootprint( z, footprint, into );
  }
  return into;
}

/** Every tile a camera path may request over frames [0, frames), sorted by zoom then x, y. */
export function tilesForTrajectory( cameraAt: ( frame: number ) => MapCamera, frames: number, options = DEFAULT_SELECTION ): string[] {
  const set = new Set<string>();
  for ( let frame = 0; frame < frames; frame++ ) {
    tilesForCamera( cameraAt( frame ), set, options );
  }
  return sortTiles( set );
}

export function sortTiles( keys: Iterable<string> ): string[] {
  return [ ...keys ].map( parseTileKey ).sort( ( a, b ) => a.z - b.z || a.x - b.x || a.y - b.y ).map( tileKey );
}

/** Tile count per zoom level. */
export function countByZoom( keys: Iterable<string> ): Record<number, number> {
  const counts: Record<number, number> = {};
  for ( const key of keys ) {
    const z = parseTileKey( key ).z;
    counts[z] = ( counts[z] ?? 0 ) + 1;
  }
  return counts;
}
