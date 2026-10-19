/**
 * Regional Mercator maps for the Historic Earthquakes Shorts: Natural Earth 1:50m land (world-atlas), projected on demand.
 * A map is a fixed world-pixel path for one bounding box; the composition scales and pans the group for the camera.
 */
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import land50 from 'world-atlas/land-50m.json';

/** Mercator in world pixels at 1000 px per radian of longitude (x right, y down). */
export const merc = ( lon: number, lat: number ): [ number, number ] => {
  const phi = ( Math.max( -85, Math.min( 85, lat ) ) * Math.PI ) / 180;
  return [ ( lon * Math.PI ) / 180 * 1000, -Math.log( Math.tan( Math.PI / 4 + phi / 2 ) ) * 1000 ];
};

export type Box = { w: number; e: number; s: number; n: number };

const polys: GeoJSON.Position[][][] = ( () => {
  const topo = land50 as unknown as Topology;
  const fc = feature( topo, topo.objects.land as never ) as unknown as GeoJSON.FeatureCollection | GeoJSON.Feature;
  const geoms: GeoJSON.Geometry[] = 'features' in fc ? fc.features.map( f => f.geometry ) : [ fc.geometry ];
  return geoms.flatMap( g => ( g.type === 'Polygon' ? [ g.coordinates ] : g.type === 'MultiPolygon' ? g.coordinates : [] ) );
} )();

/** Land inside (or touching) the box as one SVG path in world pixels. Rings are kept whole; the map's clip rectangle trims them. */
export function landPath( box: Box ): string {
  const out: string[] = [];
  for ( const poly of polys ) {
    for ( const ring of poly ) {
      let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity;
      for ( const [ lo, la ] of ring ) {
        w = Math.min( w, lo ); e = Math.max( e, lo ); s = Math.min( s, la ); n = Math.max( n, la );
      }
      if ( e < box.w || w > box.e || n < box.s || s > box.n ) {
        continue;
      }
      out.push( `M${ring.map( ( [ lo, la ] ) => merc( lo, la ).map( v => v.toFixed( 1 ) ).join( ',' ) ).join( 'L' )}Z` );
    }
  }
  return out.join( '' );
}

export const polyline = ( pts: [ number, number ][] ) => `M${pts.map( ( [ lo, la ] ) => merc( lo, la ).map( v => v.toFixed( 1 ) ).join( ',' ) ).join( 'L' )}`;
