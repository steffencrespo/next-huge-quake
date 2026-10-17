/**
 * Writes src/map/labels/__fixtures__/geo-sample.json: the label data (public/geo/labels.json, from Natural Earth,
 * public domain) clipped to the regions of the M2.2c geographic test cases, so unit tests do not depend on gitignored
 * build output. Polygons are clipped to each region's box (Sutherland-Hodgman), which preserves point-in-polygon
 * answers inside the box.
 *
 * Usage: npm run build:geo && tsx scripts/make-label-fixture.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Area, LabelData } from '../src/map/labels/data.js';
import { LABEL_TEST_REGIONS } from '../src/map/labels/testRegions.js';

const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const data = JSON.parse( readFileSync( join( root, 'public', 'geo', 'labels.json' ), 'utf8' ) ) as LabelData;
type Box = [ number, number, number, number ];

function clipRing( ring: number[][], [ w, s, e, n ]: Box ): number[][] {
  const edges: [ ( p: number[] ) => boolean, ( a: number[], b: number[] ) => number[] ][] = [
    [ p => p[0] >= w, ( a, b ) => [ w, a[1] + ( ( b[1] - a[1] ) * ( w - a[0] ) ) / ( b[0] - a[0] ) ] ],
    [ p => p[0] <= e, ( a, b ) => [ e, a[1] + ( ( b[1] - a[1] ) * ( e - a[0] ) ) / ( b[0] - a[0] ) ] ],
    [ p => p[1] >= s, ( a, b ) => [ a[0] + ( ( b[0] - a[0] ) * ( s - a[1] ) ) / ( b[1] - a[1] ), s ] ],
    [ p => p[1] <= n, ( a, b ) => [ a[0] + ( ( b[0] - a[0] ) * ( n - a[1] ) ) / ( b[1] - a[1] ), n ] ]
  ];
  let out = ring;
  for ( const [ inside, cross ] of edges ) {
    const input = out;
    out = [];
    for ( let i = 0; i < input.length; i++ ) {
      const a = input[i];
      const b = input[( i + 1 ) % input.length];
      if ( inside( b ) ) {
        if ( !inside( a ) ) {
          out.push( cross( a, b ) );
        }
        out.push( b );
      } else if ( inside( a ) ) {
        out.push( cross( a, b ) );
      }
    }
    if ( out.length === 0 ) {
      break;
    }
  }
  return out.map( ( [ x, y ] ) => [ Math.round( x * 1000 ) / 1000, Math.round( y * 1000 ) / 1000 ] );
}

function clipArea( area: Area, box: Box ): Area | null {
  // Try the box as given and shifted by +/-360 for rings that extend past the antimeridian.
  const polygons = [ 0, 360, -360 ].flatMap( shift => {
    const b: Box = [ box[0] + shift, box[1], box[2] + shift, box[3] ];
    return area.polygons.map( poly => poly.map( ring => clipRing( ring, b ) ).filter( r => r.length >= 3 ) ).filter( poly => poly.length > 0 );
  } );
  if ( polygons.length === 0 ) {
    return null;
  }
  const points = polygons.flat( 2 );
  return {
    name: area.name,
    bbox: [ Math.min( ...points.map( p => p[0] ) ), Math.min( ...points.map( p => p[1] ) ), Math.max( ...points.map( p => p[0] ) ), Math.max( ...points.map( p => p[1] ) ) ],
    polygons
  };
}

const boxes = Object.values( LABEL_TEST_REGIONS ).map( r => r.box );
const inBox = ( lon: number, lat: number ) => boxes.some( ( [ w, s, e, n ] ) => lat >= s && lat <= n && [ lon, lon + 360, lon - 360 ].some( x => x >= w && x <= e ) );
const clipAll = ( areas: Area[] ) => areas.flatMap( a => boxes.map( b => clipArea( a, b ) ).filter( ( c ): c is Area => c !== null ) );

const sample: LabelData = {
  source: `${data.source}; clipped to the M2.2c test regions by scripts/make-label-fixture.ts`,
  places: data.places.filter( p => inBox( p.lon, p.lat ) ),
  countries: clipAll( data.countries ),
  marine: clipAll( data.marine )
};
const out = join( root, 'src', 'map', 'labels', '__fixtures__', 'geo-sample.json' );
mkdirSync( dirname( out ), { recursive: true } );
writeFileSync( out, JSON.stringify( sample ) );
console.log( `wrote ${out}: ${sample.places.length} places, ${sample.countries.length} country parts, ${sample.marine.length} marine parts` );
