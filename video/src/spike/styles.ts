import type { StyleSpecification } from 'maplibre-gl';
import { staticFile } from 'remotion';

export type TileMode = 'local' | 'remote';

export const OPENFREEMAP_DARK_STYLE = 'https://tiles.openfreemap.org/styles/dark';

export const ATTRIBUTION: Record<TileMode, string> = {
  local: 'Made with Natural Earth',
  remote: 'OpenFreeMap © OpenMapTiles, Data from OpenStreetMap'
};

const asset = ( path: string ) => new URL( staticFile( path ), window.location.href ).href;

const SKY: StyleSpecification['sky'] = {
  'sky-color': '#050a14',
  'horizon-color': '#1d3557',
  'fog-color': '#0b1220',
  'horizon-fog-blend': 0.6,
  'sky-horizon-blend': 0.7,
  'atmosphere-blend': [ 'interpolate', [ 'linear' ], [ 'zoom' ], 0, 1, 4, 0.8, 7, 0 ]
};

/** Fully offline style: Natural Earth 1:10m GeoJSON served from public/geo. */
export function localStyle(): StyleSpecification {
  const geojson = ( file: string ) => ( { type: 'geojson' as const, data: asset( `geo/${file}` ), maxzoom: 9 } );
  return {
    version: 8,
    projection: { type: 'globe' },
    sky: SKY,
    sources: {
      land: geojson( 'land.geojson' ),
      coastline: geojson( 'coastline.geojson' ),
      borders: geojson( 'borders.geojson' ),
      graticule: geojson( 'graticule.geojson' )
    },
    layers: [
      { id: 'ocean', type: 'background', paint: { 'background-color': '#04070d' } },
      { id: 'graticule', type: 'line', source: 'graticule', paint: { 'line-color': '#5b7aa6', 'line-opacity': [ 'interpolate', [ 'linear' ], [ 'zoom' ], 2, 0.22, 6, 0.06 ], 'line-width': 1 } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#18212e', 'fill-antialias': false } },
      { id: 'coast-glow', type: 'line', source: 'coastline', paint: { 'line-color': '#3d6a9e', 'line-opacity': 0.35, 'line-width': [ 'interpolate', [ 'linear' ], [ 'zoom' ], 2, 2, 7, 6 ], 'line-blur': 3 } },
      { id: 'coast', type: 'line', source: 'coastline', paint: { 'line-color': '#8fb3d9', 'line-opacity': 0.8, 'line-width': [ 'interpolate', [ 'linear' ], [ 'zoom' ], 2, 0.6, 7, 1.6 ] } },
      { id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': '#9aa7b8', 'line-opacity': 0.45, 'line-width': 1, 'line-dasharray': [ 3, 2 ] } }
    ]
  };
}

/** OpenFreeMap's public dark style (no key), switched to the globe projection. Used to measure remote tile loading. */
export async function remoteStyle(): Promise<StyleSpecification> {
  const response = await fetch( OPENFREEMAP_DARK_STYLE );
  if ( !response.ok ) {
    throw new Error( `OpenFreeMap style request failed with HTTP ${response.status}` );
  }
  const style = await response.json() as StyleSpecification;
  return { ...style, projection: { type: 'globe' }, sky: SKY };
}
