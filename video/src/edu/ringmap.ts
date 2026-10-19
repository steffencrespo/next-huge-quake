/**
 * Pacific-centred Equal Earth map for Episode 04: projection, land outline (Natural Earth 1:110m via world-atlas) and the
 * simplified Ring of Fire belt. Map units are pixels of a 2000 px wide world; longitude is shifted so 180° is the centre.
 */
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import land110 from 'world-atlas/land-110m.json';

const A1 = 1.340264;
const A2 = -0.081106;
const A3 = 0.000893;
const A4 = 0.003796;
const M = Math.sqrt( 3 ) / 2;
const raw = ( lonRad: number, latRad: number ): [ number, number ] => {
  const th = Math.asin( M * Math.sin( latRad ) );
  const t2 = th * th;
  const t6 = t2 * t2 * t2;
  return [ ( 2 * Math.sqrt( 3 ) * lonRad * Math.cos( th ) ) / ( 3 * ( 9 * A4 * t6 * t2 + 7 * A3 * t6 + 3 * A2 * t2 + A1 ) ), th * ( A1 + A2 * t2 + t6 * ( A3 + A4 * t2 ) ) ];
};
const SCALE = 1000 / raw( Math.PI, 0 )[0];

/** Longitude relative to the Pacific centre (180°), in -180..180. */
export const shiftLon = ( lon: number ) => ( ( ( lon - 180 ) % 360 ) + 540 ) % 360 - 180;

/** Pacific-relative longitude (degrees, may lie outside -180..180) and latitude to map pixels. */
const projectRel = ( lam: number, lat: number ): [ number, number ] => {
  const [ x, y ] = raw( ( lam * Math.PI ) / 180, ( lat * Math.PI ) / 180 );
  return [ x * SCALE, -y * SCALE ];
};

/** Longitude/latitude in degrees to map pixels (x right, y down, equator at y = 0, Pacific centre at x = 0). */
export function project( lon: number, lat: number ): [ number, number ] {
  const [ x, y ] = raw( ( shiftLon( lon ) * Math.PI ) / 180, ( lat * Math.PI ) / 180 );
  return [ x * SCALE, -y * SCALE ];
}

const d = ( pts: [ number, number ][] ) => `M${pts.map( ( [ x, y ] ) => `${x.toFixed( 1 )},${y.toFixed( 1 )}` ).join( 'L' )}`;

/** Land polygons as one SVG path. Antarctica is left out (it would span the whole map). */
export const LAND_PATH: string = ( () => {
  const topo = land110 as unknown as Topology;
  const fc = feature( topo, topo.objects.land as never ) as unknown as GeoJSON.FeatureCollection | GeoJSON.Feature;
  const geoms: GeoJSON.Geometry[] = 'features' in fc ? fc.features.map( f => f.geometry ) : [ fc.geometry ];
  const out: string[] = [];
  for ( const g of geoms ) {
    const polys = g.type === 'Polygon' ? [ g.coordinates ] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for ( const poly of polys ) {
      for ( const ring of poly ) {
        if ( Math.min( ...ring.map( p => p[1] ) ) < -60 ) {
          continue;
        }
        // Unwrap longitude so a ring crossing the map's seam (the Greenwich meridian here) stays continuous; draw it again
        // one world to the left and right, where the window can reach it.
        const lams: number[] = [];
        ring.forEach( ( p, i ) => {
          const here = shiftLon( p[0] );
          if ( i === 0 ) {
            lams.push( here );
            return;
          }
          const delta = ( ( ( here - shiftLon( ring[i - 1][0] ) ) % 360 ) + 540 ) % 360 - 180;
          lams.push( lams[i - 1] + delta );
        } );
        for ( const offset of [ 0, -360, 360 ] ) {
          const pts = ring.map( ( p, i ) => projectRel( lams[i] + offset, p[1] ) );
          if ( offset === 0 || pts.some( ( [ x ] ) => Math.abs( x ) < 1500 ) ) {
            out.push( `${d( pts )}Z` );
          }
        }
      }
    }
  }
  return out.join( '' );
} )();

/** Simplified trench/arc axis of the Pacific belt, [lon, lat], from New Zealand around to southern Chile. Schematic, not a plate-boundary dataset. */
export const BELT_LONLAT: [ number, number ][] = [
  [ 175.5, -41.5 ], [ 178.5, -38 ], [ -179, -34 ], [ -177.3, -29 ], [ -175.5, -23 ], [ -174, -18.5 ], [ -173.5, -15.5 ],
  [ 178, -17 ], [ 168, -15.5 ], [ 166, -12 ], [ 160, -10 ], [ 153, -6.5 ], [ 147, -6 ], [ 140, -3 ], [ 134, -0.5 ], [ 128, 3 ],
  [ 127, 8 ], [ 126.5, 12 ], [ 122, 18 ], [ 121.5, 24 ], [ 127, 26 ], [ 131, 30 ], [ 135, 33 ], [ 142, 36 ], [ 143, 40 ], [ 144.5, 43 ],
  [ 148, 44.5 ], [ 153, 48 ], [ 157, 51 ], [ 160, 52.5 ], [ 172, 52 ], [ 180, 51 ], [ -170, 52 ], [ -160, 54 ], [ -155, 56 ],
  [ -150, 59 ], [ -146, 60.5 ], [ -140, 59.5 ], [ -135, 55 ], [ -130, 50 ], [ -126, 48 ], [ -125.5, 44 ], [ -125, 40.5 ],
  [ -118, 30 ], [ -110, 23 ], [ -106, 19 ], [ -103, 17 ], [ -98, 15.5 ], [ -94, 14 ], [ -91, 12.5 ], [ -87, 11 ], [ -84, 8 ],
  [ -80, 2 ], [ -81, -3 ], [ -80, -8 ], [ -77, -12 ], [ -76, -16 ], [ -71.5, -20 ], [ -71, -26 ], [ -72.5, -33 ], [ -74, -38 ], [ -75, -43 ], [ -76, -47 ]
];
export const BELT_PATH = d( BELT_LONLAT.map( ( [ lo, la ] ) => project( lo, la ) ) );

/** Selected volcanoes along the belt, [lon, lat]. */
export const VOLCANOES: [ number, number ][] = [
  [ 138.73, 35.36 ], [ 120.35, 15.13 ], [ 123.69, 13.26 ], [ 175.56, -39.28 ], [ 160.64, 56.06 ], [ -154.95, 58.28 ], [ -122.18, 46.2 ],
  [ -121.76, 46.85 ], [ -98.62, 19.02 ], [ -78.44, -0.68 ], [ -71.93, -39.42 ], [ 130.66, 31.58 ], [ 177.18, -37.52 ], [ -152.7, 60.49 ], [ -90.88, 14.47 ]
];
