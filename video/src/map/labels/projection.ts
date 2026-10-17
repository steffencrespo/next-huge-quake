/**
 * Minimal screen projection for deterministic label selection (M2.2c). Pure, so selection runs identically in
 * calculateMetadata and in Node tests.
 *
 * It models MapLibre's camera for the news camera's regional end states only: Web Mercator (via demTiles' `mercator`),
 * 512 px tiles, 36.87° vertical field of view, pitch about the padded center, bearing 0. ADR 0002 notes the globe
 * projection shows no visible curvature at z6-7, so Mercator is a close approximation there. It is not a general
 * projection: rendering always uses the real `map.project`, and scripts/check-labels.ts compares the two on every
 * rendered frame.
 */
import type { MapCamera } from '../LiveMap.js';
import { mercator } from '../demTiles.js';

const WIDTH = 1080;
const HEIGHT = 1920;
const FOV = 0.6435011087932844;
/** Distance from the camera to the center, in pixels (MapLibre: half the viewport height over tan(fov / 2)). */
const DISTANCE = HEIGHT / 2 / Math.tan( FOV / 2 );

export type Point = { x: number; y: number };

const viewCenter = ( camera: MapCamera ): Point => {
  const { top = 0, bottom = 0, left = 0, right = 0 } = camera.padding ?? {};
  return { x: WIDTH / 2 + ( left - right ) / 2, y: HEIGHT / 2 + ( top - bottom ) / 2 };
};

/** Offset of [lon, lat] from the camera center in world pixels at the camera's zoom (east and south positive). */
function worldOffset( camera: MapCamera, [ lon, lat ]: [ number, number ] ): Point {
  const world = 512 * 2 ** camera.zoom;
  const [ cx, cy ] = mercator( camera.center[0], camera.center[1] );
  const [ px, py ] = mercator( lon, lat );
  let dx = px - cx;
  dx -= Math.round( dx ); // shortest way across the antimeridian
  return { x: dx * world, y: ( py - cy ) * world };
}

export function projectAt( camera: MapCamera, lonLat: [ number, number ] ): Point {
  if ( camera.bearing !== 0 ) {
    throw new Error( 'projectAt models bearing 0 only (the news camera after arrival)' );
  }
  const { x: dx, y: dy } = worldOffset( camera, lonLat );
  const pitch = ( camera.pitch * Math.PI ) / 180;
  const depth = DISTANCE - dy * Math.sin( pitch );
  const c = viewCenter( camera );
  return { x: c.x + ( dx * DISTANCE ) / depth, y: c.y + ( dy * Math.cos( pitch ) * DISTANCE ) / depth };
}

/** Inverse of projectAt: the [lon, lat] drawn at screen point `p`. */
export function unprojectAt( camera: MapCamera, p: Point ): [ number, number ] {
  const pitch = ( camera.pitch * Math.PI ) / 180;
  const c = viewCenter( camera );
  const u = p.y - c.y;
  const dy = ( u * DISTANCE ) / ( DISTANCE * Math.cos( pitch ) + u * Math.sin( pitch ) );
  const dx = ( ( p.x - c.x ) * ( DISTANCE - dy * Math.sin( pitch ) ) ) / DISTANCE;
  const world = 512 * 2 ** camera.zoom;
  const [ cx, cy ] = mercator( camera.center[0], camera.center[1] );
  const mx = cx + dx / world;
  const my = cy + dy / world;
  const lon = ( ( ( mx * 360 - 180 ) + 540 ) % 360 + 360 ) % 360 - 180;
  const lat = ( Math.atan( Math.sinh( Math.PI * ( 1 - 2 * my ) ) ) * 180 ) / Math.PI;
  return [ lon, lat ];
}
