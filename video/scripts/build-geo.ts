/**
 * Prepares the offline assets served from public/ (gitignored, regenerate with `npm run build:geo`):
 * - Natural Earth 1:10m land, coastline and country borders (public domain) from world-atlas, as GeoJSON
 * - a 15-degree graticule for the globe
 * - the MapLibre web worker, served as a static file so Remotion's bundler does not have to resolve it
 * - label data (M2.2c): Natural Earth v5.1.2 populated places (1:10m) and marine areas (1:50m), downloaded once into
 *   cache/ne-5.1.2/ and checked against pinned SHA-256 hashes, plus country polygons with names from world-atlas
 *   (1:50m), compacted into public/geo/labels.json
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Area, LabelData, Place } from '../src/map/labels/data.js';

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

// Label data (M2.2c). Downloads are cached and verified, so later builds need no network.
const NE_VERSION = 'v5.1.2';
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_VERSION}/geojson`;
const NE_FILES = {
  places: { file: 'ne_10m_populated_places_simple.geojson', sha256: 'fd3fa867a320cbd5c5b6bb5bc550afeec2939fb2cef688e508007282a55ac42f' },
  marine: { file: 'ne_50m_geography_marine_polys.geojson', sha256: '6fe58083e0cc5c7fad9e396970e28a8580bbd8770cfa4d1d7b5a34423e912f97' }
} as const;
const neCache = join( root, 'cache', `ne-${NE_VERSION.slice( 1 )}` );
mkdirSync( neCache, { recursive: true } );

async function naturalEarth( { file, sha256 }: { file: string; sha256: string } ): Promise<GeoJSON.FeatureCollection> {
  const path = join( neCache, file );
  if ( !existsSync( path ) ) {
    const response = await fetch( `${NE_BASE}/${file}` );
    if ( !response.ok ) {
      throw new Error( `${file}: HTTP ${response.status}` );
    }
    writeFileSync( path, Buffer.from( await response.arrayBuffer() ) );
    console.log( `downloaded ${file}` );
  }
  const data = readFileSync( path );
  const hash = createHash( 'sha256' ).update( data ).digest( 'hex' );
  if ( hash !== sha256 ) {
    throw new Error( `${file}: SHA-256 ${hash} does not match the pinned ${sha256}` );
  }
  return JSON.parse( data.toString( 'utf8' ) );
}

const round3 = ( v: number ) => Math.round( v * 1000 ) / 1000;
function area( name: string, geometry: GeoJSON.Geometry | null ): Area | null {
  const polygons = geometry?.type === 'Polygon' ? [ geometry.coordinates ] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
  if ( !name || polygons.length === 0 ) {
    return null;
  }
  const planar = polygons.map( poly => poly.map( ring => planarRing( ring ).map( ( [ lon, lat ] ) => [ round3( lon ), round3( lat ) ] ) ) );
  const points = planar.flat( 2 );
  const bbox: Area['bbox'] = [
    Math.min( ...points.map( p => p[0] ) ), Math.min( ...points.map( p => p[1] ) ),
    Math.max( ...points.map( p => p[0] ) ), Math.max( ...points.map( p => p[1] ) )
  ];
  return { name, bbox, polygons: planar };
}

const placesGeo = await naturalEarth( NE_FILES.places );
const places: Place[] = placesGeo.features
  .map( f => f.properties as Record<string, unknown> )
  .filter( p => Number( p.scalerank ) <= 6 || String( p.featurecla ).startsWith( 'Admin-0 capital' ) )
  .map( p => ( {
    name: String( p.name ),
    nameAscii: String( p.nameascii ?? p.name ),
    lon: round3( Number( p.longitude ) ),
    lat: round3( Number( p.latitude ) ),
    scalerank: Number( p.scalerank ),
    pop: Number( p.pop_max ?? 0 ),
    capital: String( p.featurecla ) === 'Admin-0 capital'
  } ) );

const marineGeo = await naturalEarth( NE_FILES.marine );
const marine = marineGeo.features
  .map( f => area( String( ( f.properties as Record<string, unknown> ).name ?? '' ), f.geometry ) )
  .filter( ( a ): a is Area => a !== null );

const countries50 = readTopology( 'countries-50m.json' );
const countryFeatures = feature( countries50, countries50.objects.countries as GeometryCollection ) as GeoJSON.FeatureCollection;
const countryAreas = countryFeatures.features
  .map( f => area( String( ( f.properties as Record<string, unknown> | null )?.name ?? '' ), f.geometry ) )
  .filter( ( a ): a is Area => a !== null );

const labelData: LabelData = {
  source: `Natural Earth ${NE_VERSION} (populated places 1:10m, marine areas 1:50m); countries 1:50m from world-atlas`,
  places,
  countries: countryAreas,
  marine
};
write( 'labels.json', labelData );
console.log( `labels: ${places.length} places, ${countryAreas.length} countries, ${marine.length} marine areas` );
