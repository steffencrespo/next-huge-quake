/**
 * Prepares the offline assets served from public/ (gitignored, regenerate with `npm run build:geo`):
 * - Natural Earth 1:10m land, coastline and country borders (public domain) from world-atlas, as GeoJSON
 * - a 15-degree graticule for the globe
 * - the MapLibre web worker, served as a static file so Remotion's bundler does not have to resolve it
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';

const require = createRequire( import.meta.url );
const root = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const geoDir = join( root, 'public', 'geo' );
const workerDir = join( root, 'public', 'maplibre' );
mkdirSync( geoDir, { recursive: true } );
mkdirSync( workerDir, { recursive: true } );

const readTopology = ( name: string ): Topology => JSON.parse( readFileSync( require.resolve( `world-atlas/${name}` ), 'utf8' ) );
/**
 * world-atlas cuts features at the antimeridian, so meshes contain segments that jump from +180 to -180
 * and edges running along +/-180. Drawn as lines, those wrap around the globe; split them out.
 */
function splitAtAntimeridian( geometry: GeoJSON.Geometry ): GeoJSON.MultiLineString {
  const lines = geometry.type === 'MultiLineString' ? geometry.coordinates : geometry.type === 'LineString' ? [ geometry.coordinates ] : [];
  const onCut = ( p: GeoJSON.Position ) => Math.abs( Math.abs( p[0] ) - 180 ) < 1e-6;
  const result: GeoJSON.Position[][] = [];
  for ( const line of lines ) {
    let current: GeoJSON.Position[] = [ line[0] ];
    for ( let i = 1; i < line.length; i++ ) {
      const [ a, b ] = [ line[i - 1], line[i] ];
      if ( Math.abs( b[0] - a[0] ) > 180 || ( onCut( a ) && onCut( b ) ) ) {
        if ( current.length > 1 ) {
          result.push( current );
        }
        current = [ b ];
      } else {
        current.push( b );
      }
    }
    if ( current.length > 1 ) {
      result.push( current );
    }
  }
  return { type: 'MultiLineString', coordinates: result };
}

/**
 * world-atlas polygons follow spherical (d3-geo) semantics. For planar rendering, make each ring's longitudes
 * continuous (MapLibre wraps values beyond +/-180), and close circumpolar rings such as Antarctica through the pole.
 */
function planarRing( ring: GeoJSON.Position[] ): GeoJSON.Position[] {
  const out: GeoJSON.Position[] = [ ring[0] ];
  for ( let i = 1; i < ring.length; i++ ) {
    let lon = ring[i][0];
    const previous = out[i - 1][0];
    while ( lon - previous > 180 ) {
      lon -= 360;
    }
    while ( lon - previous < -180 ) {
      lon += 360;
    }
    out.push( [ lon, ring[i][1] ] );
  }
  const first = out[0];
  const last = out[out.length - 1];
  if ( Math.abs( Math.abs( last[0] - first[0] ) - 360 ) < 1e-6 ) {
    const poleLat = out.reduce( ( sum, p ) => sum + p[1], 0 ) / out.length < 0 ? -90 : 90;
    out.push( [ last[0], poleLat ], [ first[0], poleLat ], first );
  }
  return out;
}

function planarLand( collection: GeoJSON.FeatureCollection ): GeoJSON.FeatureCollection {
  return {
    ...collection,
    features: collection.features.map( f => {
      const g = f.geometry;
      if ( g.type === 'Polygon' ) {
        return { ...f, geometry: { ...g, coordinates: g.coordinates.map( planarRing ) } };
      }
      if ( g.type === 'MultiPolygon' ) {
        return { ...f, geometry: { ...g, coordinates: g.coordinates.map( poly => poly.map( planarRing ) ) } };
      }
      return f;
    } )
  };
}

const write = ( name: string, value: unknown ) => {
  const path = join( geoDir, name );
  writeFileSync( path, JSON.stringify( value ) );
  console.log( `wrote ${path}` );
};

const land = readTopology( 'land-10m.json' );
const landObject = land.objects.land as GeometryCollection;
write( 'land.geojson', planarLand( feature( land, landObject ) ) );
// Coastline as a line mesh: drawing outlines of the (tile-clipped) land polygons would also draw tile edges.
write( 'coastline.geojson', { type: 'Feature', properties: {}, geometry: splitAtAntimeridian( mesh( land, landObject ) ) } );

const countries = readTopology( 'countries-10m.json' );
const countriesObject = countries.objects.countries as GeometryCollection;
write( 'borders.geojson', { type: 'Feature', properties: {}, geometry: splitAtAntimeridian( mesh( countries, countriesObject, ( a, b ) => a !== b ) ) } );

const lines: number[][][] = [];
for ( let lon = -180; lon < 180; lon += 15 ) {
  lines.push( Array.from( { length: 33 }, ( _, i ) => [ lon, -80 + i * 5 ] ) );
}
for ( let lat = -75; lat <= 75; lat += 15 ) {
  lines.push( Array.from( { length: 73 }, ( _, i ) => [ -180 + i * 5, lat ] ) );
}
write( 'graticule.geojson', { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } } );

const workerSource = require.resolve( 'maplibre-gl/dist/maplibre-gl-worker.mjs' );
copyFileSync( workerSource, join( workerDir, 'maplibre-gl-worker.mjs' ) );
console.log( `copied ${workerSource}` );
