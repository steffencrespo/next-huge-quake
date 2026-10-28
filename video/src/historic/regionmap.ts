/**
 * Regional Mercator maps for the Historic Earthquakes Shorts: Natural Earth 1:50m land (world-atlas), projected on demand.
 * A map is a fixed world-pixel path for one bounding box; the composition scales and pans the group for the camera.
 */
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import land10 from 'world-atlas/land-10m.json';
import land50 from 'world-atlas/land-50m.json';

/** Mercator in world pixels at 1000 px per radian of longitude (x right, y down). */
export const merc = ( lon: number, lat: number ): [ number, number ] => {
  const phi = ( Math.max( -85, Math.min( 85, lat ) ) * Math.PI ) / 180;
  return [ ( lon * Math.PI ) / 180 * 1000, -Math.log( Math.tan( Math.PI / 4 + phi / 2 ) ) * 1000 ];
};

export type Box = { w: number; e: number; s: number; n: number };

const polysOf = ( land: unknown ): GeoJSON.Position[][][] => {
  const topo = land as Topology;
  const fc = feature( topo, topo.objects.land as never ) as unknown as GeoJSON.FeatureCollection | GeoJSON.Feature;
  const geoms: GeoJSON.Geometry[] = 'features' in fc ? fc.features.map( f => f.geometry ) : [ fc.geometry ];
  return geoms.flatMap( g => ( g.type === 'Polygon' ? [ g.coordinates ] : g.type === 'MultiPolygon' ? g.coordinates : [] ) );
};
const polys: GeoJSON.Position[][][] = polysOf( land50 );
let polys10: GeoJSON.Position[][][] | undefined;

/** Sutherland-Hodgman clip of a ring to the box (used with the 1:10m data, whose continent rings have far too many points to keep whole). */
const clipRing = ( ring: GeoJSON.Position[], box: Box ): GeoJSON.Position[] => {
  const edges: [ ( p: GeoJSON.Position ) => boolean, ( a: GeoJSON.Position, b: GeoJSON.Position ) => GeoJSON.Position ][] = [
    [ p => p[0] >= box.w, ( a, b ) => [ box.w, a[1] + ( b[1] - a[1] ) * ( box.w - a[0] ) / ( b[0] - a[0] ) ] ],
    [ p => p[0] <= box.e, ( a, b ) => [ box.e, a[1] + ( b[1] - a[1] ) * ( box.e - a[0] ) / ( b[0] - a[0] ) ] ],
    [ p => p[1] >= box.s, ( a, b ) => [ a[0] + ( b[0] - a[0] ) * ( box.s - a[1] ) / ( b[1] - a[1] ), box.s ] ],
    [ p => p[1] <= box.n, ( a, b ) => [ a[0] + ( b[0] - a[0] ) * ( box.n - a[1] ) / ( b[1] - a[1] ), box.n ] ]
  ];
  let pts = ring;
  for ( const [ inside, cross ] of edges ) {
    const next: GeoJSON.Position[] = [];
    for ( let i = 0; i < pts.length; i++ ) {
      const cur = pts[i], prev = pts[( i + pts.length - 1 ) % pts.length];
      if ( inside( cur ) ) {
        if ( !inside( prev ) ) {
          next.push( cross( prev, cur ) );
        }
        next.push( cur );
      } else if ( inside( prev ) ) {
        next.push( cross( prev, cur ) );
      }
    }
    pts = next;
    if ( pts.length === 0 ) {
      break;
    }
  }
  return pts;
};

/** Land inside (or touching) the box as one SVG path in world pixels. Rings are kept whole; the map's clip rectangle trims them. `detail: '10m'` uses Natural Earth 1:10m clipped to the box (for close-up city maps). */
export function landPath( box: Box, detail: '50m' | '10m' = '50m' ): string {
  const out: string[] = [];
  if ( detail === '10m' ) {
    polys10 ??= polysOf( land10 );
  }
  for ( const poly of detail === '10m' ? polys10! : polys ) {
    for ( const ring0 of poly ) {
      let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity;
      for ( const [ lo, la ] of ring0 ) {
        w = Math.min( w, lo ); e = Math.max( e, lo ); s = Math.min( s, la ); n = Math.max( n, la );
      }
      if ( e < box.w || w > box.e || n < box.s || s > box.n ) {
        continue;
      }
      const ring = detail === '10m' ? clipRing( ring0, box ) : ring0;
      if ( ring.length < 3 ) {
        continue;
      }
      out.push( `M${ring.map( ( [ lo, la ] ) => merc( lo, la ).map( v => v.toFixed( 1 ) ).join( ',' ) ).join( 'L' )}Z` );
    }
  }
  return out.join( '' );
}

export const polyline = ( pts: [ number, number ][] ) => `M${pts.map( ( [ lo, la ] ) => merc( lo, la ).map( v => v.toFixed( 1 ) ).join( ',' ) ).join( 'L' )}`;
