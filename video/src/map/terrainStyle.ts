/**
 * Terrain style candidates (M2.2): the M2.1 local style's Natural Earth vectors plus one Terrarium DEM source (AWS
 * Terrain Tiles, prepared locally by scripts/prepare-terrain.ts). No 3D terrain, so `map.project` and the readiness
 * gate behave exactly as in M2.1.
 *
 * Layer order makes the Natural Earth coastline the shore of record: the opaque land fill covers the bathymetry, and
 * the land tint is transparent below 150 m, so the DEM's own 0 m contour is never visible as a second coastline.
 *
 * Variants:
 * - 'a1' (M2.2a, Gate A baseline): one hillshade above the land fill, which also lights the ocean (shelf lighter
 *   than land, visible survey tracks at regional zoom). Kept unchanged for comparison.
 * - 'b1-cool' (M2.2b, chosen at checkpoint B1; palette in MAP_COLORS, design/tokens.ts): hillshade split by land
 *   and sea. (The 'b1-neutral' candidate was dropped after B1.)
 *   - The land hillshade is tuned for land and drawn right above the land fill and tint.
 *   - Opaque bathymetry is drawn above it for water deeper than 200 m, so deep water never carries land shading or
 *     ETOPO1 survey tracks. Its -200 m color equals the background (the shelf color), so there is no visible edge,
 *     and the shore is still the Natural Earth coastline: the 0 to -200 m shelf shows the background, and inland
 *     depressions above -200 m (Qattara, Turpan, Death Valley) are never painted as sea.
 *   - A weak ocean hillshade above the bathymetry keeps seafloor structure on the globe and fades out by the regional
 *     end state. The abyssal plains (below about -3000 m) are nearly flat in color.
 */
import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { MAP_COLORS } from '../design/tokens.js';
import { DEM_MAX_ZOOM, DEM_TILE_SIZE } from './demTiles.js';

export const TERRAIN_VARIANTS = [ 'a1', 'b1-cool' ] as const;
export type TerrainVariant = typeof TERRAIN_VARIANTS[number];
export const terrainStyleName = ( variant: TerrainVariant ) => `terrain-${variant}`;
/** The M2.2a name, kept for logs and reports. */
export const TERRAIN_STYLE_NAME = terrainStyleName( 'a1' );

/** Published Terrarium tiles; only scripts/prepare-terrain.ts and the coverage discovery render use this URL. */
export const TERRAIN_TILES_REMOTE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

const SKY: StyleSpecification['sky'] = {
  'sky-color': '#050a14',
  'horizon-color': '#1d3557',
  'fog-color': '#0b1220',
  'horizon-fog-blend': 0.6,
  'sky-horizon-blend': 0.7,
  'atmosphere-blend': [ 'interpolate', [ 'linear' ], [ 'zoom' ], 0, 1, 4, 0.8, 7, 0 ]
};

export const TERRAIN_COLORS = {
  ocean: '#050B17',
  land: '#1A2330',
  coast: '#A9C6E4',
  coastGlow: '#3D6A9E',
  border: '#C9D2DE',
  graticule: '#5B7AA6'
} as const;

/** [elevation in m, color] stops of a color-relief ramp. */
type Ramp = [ number, string ][];

type SplitPalette = {
  /** Background: the continental shelf (0 to -200 m) color, and the bathymetry's -200 m stop. */
  shelf: string;
  /** Deeper than -200 m, darkening with depth (the -200 m stop is added from `shelf`). */
  deep: Ramp;
  land: string;
  /** Transparent at or below 150 m. */
  landTint: Ramp;
  landShadow: string;
  landHighlight: string;
  landExaggeration: [ number, number ][];
  oceanShadow: string;
  oceanHighlight: string;
  oceanExaggeration: [ number, number ][];
  coast: string;
  coastGlow: string;
  border: string;
};

/**
 * Ocean hillshade: structure on the globe, fading to zero at z6 and then switched off (layer maxzoom), so the
 * regional end state (where survey tracks show) skips the layer entirely. Fading to zero first means switching it off
 * changes nothing visible.
 */
export const OCEAN_HILLSHADE_MAXZOOM = 6;
const OCEAN_EXAGGERATION: [ number, number ][] = [ [ 2, 0.3 ], [ 4, 0.2 ], [ 5, 0.12 ], [ OCEAN_HILLSHADE_MAXZOOM, 0 ] ];
const LAND_EXAGGERATION: [ number, number ][] = [ [ 2, 0.35 ], [ 5, 0.55 ], [ 7, 0.85 ] ];
/** Depth (m) above which the bathymetry is transparent: the shelf shows the background color. */
export const SHELF_DEPTH = -200;

const B1_PALETTES: Record<Exclude<TerrainVariant, 'a1'>, SplitPalette> = {
  'b1-cool': { ...MAP_COLORS, landExaggeration: LAND_EXAGGERATION, oceanExaggeration: OCEAN_EXAGGERATION }
};

/** Opaque below the shelf depth, starting exactly at the background color; transparent from there up. */
function deepRamp( p: SplitPalette ): Ramp {
  const deepestFirst = [ ...p.deep ].sort( ( a, b ) => a[0] - b[0] );
  return [ ...deepestFirst, [ SHELF_DEPTH, p.shelf ], [ SHELF_DEPTH + 1, 'rgba(0, 0, 0, 0)' ] ];
}

const ramp = ( stops: Ramp ) => [ 'interpolate', [ 'linear' ], [ 'elevation' ], ...stops.flat() ] as unknown as ExpressionSpecification;
const byZoom = ( stops: [ number, number ][] ) => [ 'interpolate', [ 'linear' ], [ 'zoom' ], ...stops.flat() ] as unknown as ExpressionSpecification;

const graticule: LayerSpecification = {
  id: 'graticule',
  type: 'line',
  source: 'graticule',
  paint: { 'line-color': TERRAIN_COLORS.graticule, 'line-opacity': [ 'interpolate', [ 'linear' ], [ 'zoom' ], 2, 0.18, 4, 0 ], 'line-width': 1 }
};

const coastLayers = ( coast: string, coastGlow: string, border: string ): LayerSpecification[] => [
  {
    id: 'coast-glow',
    type: 'line',
    source: 'coastline',
    paint: { 'line-color': coastGlow, 'line-opacity': 0.4, 'line-width': [ 'interpolate', [ 'linear' ], [ 'zoom' ], 2, 2, 7, 6 ], 'line-blur': 3 }
  },
  {
    id: 'coast',
    type: 'line',
    source: 'coastline',
    paint: { 'line-color': coast, 'line-opacity': 0.85, 'line-width': [ 'interpolate', [ 'linear' ], [ 'zoom' ], 2, 0.8, 7, 2 ] }
  },
  { id: 'borders', type: 'line', source: 'borders', paint: { 'line-color': border, 'line-opacity': 0.35, 'line-width': 1.2 } }
];

/** M2.2a layers, unchanged (Gate A baseline). */
function a1Layers(): LayerSpecification[] {
  return [
    { id: 'ocean', type: 'background', paint: { 'background-color': TERRAIN_COLORS.ocean } },
    {
      id: 'bathymetry',
      type: 'color-relief',
      source: 'dem',
      paint: {
        // Deep water stays near the ocean base; the continental shelf lifts toward a lighter navy.
        'color-relief-color': ramp( [ [ -9000, '#02050B' ], [ -6000, '#030812' ], [ -4000, '#050E1E' ], [ -2000, '#08172B' ], [ -500, '#0B2036' ], [ -100, '#0E2740' ], [ -1, '#112C47' ], [ 0, 'rgba(0, 0, 0, 0)' ] ] )
      }
    },
    graticule,
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': TERRAIN_COLORS.land, 'fill-antialias': false } },
    {
      id: 'land-tint',
      type: 'color-relief',
      source: 'dem',
      paint: {
        'color-relief-color': ramp( [ [ 150, 'rgba(0, 0, 0, 0)' ], [ 600, 'rgba(48, 54, 62, 0.45)' ], [ 1500, 'rgba(66, 70, 74, 0.6)' ], [ 3000, 'rgba(92, 92, 90, 0.7)' ], [ 5000, 'rgba(128, 126, 120, 0.75)' ] ] )
      }
    },
    {
      id: 'hillshade',
      type: 'hillshade',
      source: 'dem',
      paint: {
        'hillshade-method': 'igor',
        'hillshade-illumination-direction': 315,
        'hillshade-shadow-color': 'rgba(0, 0, 0, 0.75)',
        'hillshade-highlight-color': 'rgba(170, 192, 216, 0.24)',
        'hillshade-accent-color': 'rgba(0, 0, 0, 0)',
        'hillshade-exaggeration': [ 'interpolate', [ 'linear' ], [ 'zoom' ], 2, 0.3, 5, 0.5, 7, 0.65 ]
      }
    },
    ...coastLayers( TERRAIN_COLORS.coast, TERRAIN_COLORS.coastGlow, TERRAIN_COLORS.border )
  ];
}

/** B1: hillshade split by land and sea (see the module comment). */
function splitLayers( p: SplitPalette ): LayerSpecification[] {
  const hillshade = ( id: string, shadow: string, highlight: string, exaggeration: [ number, number ][] ): LayerSpecification => ( {
    id,
    type: 'hillshade',
    source: 'dem',
    paint: {
      'hillshade-method': 'igor',
      'hillshade-illumination-direction': 315,
      'hillshade-shadow-color': shadow,
      'hillshade-highlight-color': highlight,
      'hillshade-accent-color': 'rgba(0, 0, 0, 0)',
      'hillshade-exaggeration': byZoom( exaggeration )
    }
  } );
  return [
    { id: 'ocean', type: 'background', paint: { 'background-color': p.shelf } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': p.land, 'fill-antialias': false } },
    { id: 'land-tint', type: 'color-relief', source: 'dem', paint: { 'color-relief-color': ramp( p.landTint ) } },
    hillshade( 'land-hillshade', p.landShadow, p.landHighlight, p.landExaggeration ),
    { id: 'bathymetry', type: 'color-relief', source: 'dem', paint: { 'color-relief-color': ramp( deepRamp( p ) ) } },
    { ...hillshade( 'ocean-hillshade', p.oceanShadow, p.oceanHighlight, p.oceanExaggeration ), maxzoom: OCEAN_HILLSHADE_MAXZOOM } as LayerSpecification,
    graticule,
    ...coastLayers( p.coast, p.coastGlow, p.border )
  ];
}

export type TerrainStyleOptions = {
  /** Resolves a path under public/ to a URL (staticFile in the browser). */
  resolve: ( path: string ) => string;
  /**
   * DEM tile URL template. Defaults to the prepared tiles over plain HTTP; renders use `local-dem://` (see
   * localDemProtocol.ts), which turns a missing tile into a map error.
   */
  demTiles?: string;
  /** Defaults to 'a1', the M2.2a style. */
  variant?: TerrainVariant;
};

export function terrainStyle( { resolve, demTiles, variant = 'a1' }: TerrainStyleOptions ): StyleSpecification {
  const geojson = ( file: string ) => ( { type: 'geojson' as const, data: resolve( `geo/${file}` ), maxzoom: 9 } );
  return {
    version: 8,
    projection: { type: 'globe' },
    sky: SKY,
    sources: {
      dem: {
        type: 'raster-dem',
        tiles: [ demTiles ?? `${resolve( 'terrain' )}/{z}/{x}/{y}.png` ],
        encoding: 'terrarium',
        tileSize: DEM_TILE_SIZE,
        minzoom: 0,
        maxzoom: DEM_MAX_ZOOM
      },
      land: geojson( 'land.geojson' ),
      coastline: geojson( 'coastline.geojson' ),
      borders: geojson( 'borders.geojson' ),
      graticule: geojson( 'graticule.geojson' )
    },
    layers: variant === 'a1' ? a1Layers() : splitLayers( B1_PALETTES[variant] )
  };
}
