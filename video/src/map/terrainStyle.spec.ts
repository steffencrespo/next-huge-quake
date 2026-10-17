import type { LayerSpecification } from 'maplibre-gl';
import { describe, expect, it } from 'vitest';
import { MAP_COLORS } from '../design/tokens.js';
import { DEM_MAX_ZOOM } from './demTiles.js';
import { SHELF_DEPTH, TERRAIN_VARIANTS, terrainStyle } from './terrainStyle.js';
import type { TerrainVariant } from './terrainStyle.js';

const styleOf = ( variant: TerrainVariant ) => terrainStyle( { resolve: path => `/public/${path}`, variant } );
const style = styleOf( 'a1' );
const ids = style.layers.map( l => l.id );
type Paint = LayerSpecification & { paint: Record<string, unknown> };
const layerOf = ( s: ReturnType<typeof styleOf>, id: string ) => s.layers.find( l => l.id === id ) as Paint;
const layer = ( id: string ) => layerOf( style, id );
/** [input, output] stops of an `interpolate` expression. */
const pairs = ( expression: unknown[] ) =>
  Array.from( { length: ( expression.length - 3 ) / 2 }, ( _, i ) => [ expression[3 + 2 * i] as number, expression[4 + 2 * i] ] as const );
const stopsOf = ( s: ReturnType<typeof styleOf>, id: string ) => pairs( layerOf( s, id ).paint['color-relief-color'] as unknown[] ) as ( readonly [ number, string ] )[];
const stops = ( id: string ) => stopsOf( style, id );
/** WCAG relative luminance of an opaque #RRGGBB color. */
const luminance = ( hex: string ) => {
  const [ r, g, b ] = [ 1, 3, 5 ].map( i => parseInt( hex.slice( i, i + 2 ), 16 ) / 255 ).map( c => ( c <= 0.03928 ? c / 12.92 : ( ( c + 0.055 ) / 1.055 ) ** 2.4 ) );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe( 'terrain style a1 (M2.2a baseline)', () => {
  it( 'orders layers so the Natural Earth land fill is the shore of record', () => {
    expect( ids ).toEqual( [ 'ocean', 'bathymetry', 'graticule', 'land', 'land-tint', 'hillshade', 'coast-glow', 'coast', 'borders' ] );
    expect( ids.indexOf( 'land' ) ).toBeGreaterThan( ids.indexOf( 'bathymetry' ) );
    expect( ids.indexOf( 'coast' ) ).toBeGreaterThan( ids.indexOf( 'hillshade' ) );
  } );

  it( 'draws bathymetry below sea level only', () => {
    const s = stops( 'bathymetry' );
    expect( s.at( -1 ) ).toEqual( [ 0, 'rgba(0, 0, 0, 0)' ] );
    expect( s.slice( 0, -1 ).every( ( [ elevation ] ) => elevation < 0 ) ).toBe( true );
  } );

  it( 'keeps the land tint transparent near sea level, so the DEM never draws a second coastline', () => {
    const [ first ] = stops( 'land-tint' );
    expect( first[0] ).toBeGreaterThanOrEqual( 150 );
    expect( first[1] ).toBe( 'rgba(0, 0, 0, 0)' );
  } );

  it( 'reads every source locally, with the DEM zoom range the prepare script uses', () => {
    const urls = Object.values( style.sources ).flatMap( s => 'tiles' in s && s.tiles ? s.tiles : 'data' in s && typeof s.data === 'string' ? [ s.data ] : [] );
    expect( urls.length ).toBe( 5 );
    expect( urls.every( u => u.startsWith( '/public/' ) ) ).toBe( true );
    expect( style.sources.dem ).toMatchObject( { type: 'raster-dem', encoding: 'terrarium', tileSize: 256, minzoom: 0, maxzoom: DEM_MAX_ZOOM, tiles: [ '/public/terrain/{z}/{x}/{y}.png' ] } );
  } );

  it( 'uses no 3D terrain and no symbol layers (no glyph server)', () => {
    expect( style.terrain ).toBeUndefined();
    expect( style.glyphs ).toBeUndefined();
    expect( style.layers.some( l => l.type === 'symbol' ) ).toBe( false );
  } );
} );

describe.each( TERRAIN_VARIANTS.filter( v => v !== 'a1' ) )( 'terrain style %s (M2.2b split hillshade)', variant => {
  const s = styleOf( variant );
  const order = s.layers.map( l => l.id );
  const background = layerOf( s, 'ocean' ).paint['background-color'] as string;

  it( 'covers the land hillshade with opaque bathymetry over deep water', () => {
    expect( order ).toEqual( [ 'ocean', 'land', 'land-tint', 'land-hillshade', 'bathymetry', 'ocean-hillshade', 'graticule', 'coast-glow', 'coast', 'borders' ] );
    expect( layerOf( s, 'bathymetry' ).paint['color-relief-opacity'] ).toBeUndefined();
  } );

  it( 'starts the bathymetry at the shelf depth in the background color, transparent above, so there is no DEM shoreline', () => {
    const bathymetry = stopsOf( s, 'bathymetry' );
    const shelfIndex = bathymetry.findIndex( ( [ e ] ) => e === SHELF_DEPTH );
    expect( bathymetry[shelfIndex][1] ).toBe( background );
    expect( bathymetry.slice( shelfIndex + 1 ) ).toEqual( [ [ SHELF_DEPTH + 1, 'rgba(0, 0, 0, 0)' ] ] );
    expect( bathymetry.slice( 0, shelfIndex ).every( ( [ e, color ] ) => e < SHELF_DEPTH && /^#[0-9A-F]{6}$/i.test( color ) ) ).toBe( true );
    // Inland depressions above the shelf depth (Qattara -133 m, Turpan -154 m) are never painted as sea.
    expect( SHELF_DEPTH ).toBeLessThanOrEqual( -160 );
  } );

  it( 'keeps the land tint transparent near sea level', () => {
    const [ first ] = stopsOf( s, 'land-tint' );
    expect( first[0] ).toBeGreaterThanOrEqual( 150 );
    expect( first[1] ).toBe( 'rgba(0, 0, 0, 0)' );
  } );

  it( 'fades the ocean hillshade with zoom and strengthens the land hillshade', () => {
    const ocean = pairs( layerOf( s, 'ocean-hillshade' ).paint['hillshade-exaggeration'] as unknown[] ).map( ( [ , v ] ) => v as number );
    const land = pairs( layerOf( s, 'land-hillshade' ).paint['hillshade-exaggeration'] as unknown[] ).map( ( [ , v ] ) => v as number );
    expect( ocean.every( ( v, i ) => i === 0 || v < ocean[i - 1] ) ).toBe( true );
    expect( land.every( ( v, i ) => i === 0 || v > land[i - 1] ) ).toBe( true );
    expect( ocean.at( -1 ) ).toBeLessThan( 0.1 );
  } );

  it( 'uses the MAP_COLORS tokens', () => {
    expect( background ).toBe( MAP_COLORS.shelf );
    expect( layerOf( s, 'land' ).paint['fill-color'] ).toBe( MAP_COLORS.land );
  } );

  it( 'orders values land > shelf > deep ocean (approved hierarchy)', () => {
    const bathymetry = stopsOf( s, 'bathymetry' );
    const deep = bathymetry.find( ( [ e ] ) => e === -6000 )![1];
    const land = layerOf( s, 'land' ).paint['fill-color'] as string;
    expect( luminance( land ) ).toBeGreaterThan( luminance( background ) * 1.3 );
    expect( luminance( background ) ).toBeGreaterThan( luminance( deep ) );
  } );
} );
