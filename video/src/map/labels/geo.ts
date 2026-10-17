/**
 * Point-in-area lookups for label selection (M2.2c): which country or marine area contains a point. Planar even-odd
 * ray casting on longitude-continuous rings (as prepared by build-geo's `planarRing`, which may extend past +/-180),
 * with a bounding-box prefilter. Good enough at label scale; not a general GIS library.
 */
import type { Area } from './data.js';

function inRing( ring: number[][], x: number, y: number ): boolean {
  let inside = false;
  for ( let i = 0, j = ring.length - 1; i < ring.length; j = i++ ) {
    const [ xi, yi ] = ring[i];
    const [ xj, yj ] = ring[j];
    if ( ( yi > y ) !== ( yj > y ) && x < ( ( xj - xi ) * ( y - yi ) ) / ( yj - yi ) + xi ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Whether `area` contains [lon, lat]; the longitude is also tried shifted by +/-360 for unwrapped rings. */
export function areaContains( area: Area, [ lon, lat ]: [ number, number ] ): boolean {
  const [ w, s, e, n ] = area.bbox;
  if ( lat < s || lat > n ) {
    return false;
  }
  return [ lon, lon + 360, lon - 360 ].some( x => x >= w && x <= e && area.polygons.some( polygon => {
    // Even-odd over the outer ring and its holes.
    let inside = false;
    for ( const ring of polygon ) {
      if ( inRing( ring, x, lat ) ) {
        inside = !inside;
      }
    }
    return inside;
  } ) );
}

/** The first area containing the point, or null. */
export const areaAt = ( areas: Area[], lonLat: [ number, number ] ): Area | null => areas.find( a => areaContains( a, lonLat ) ) ?? null;
