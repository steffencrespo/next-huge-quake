/**
 * The production map style of QuakeNews (M2.2 MVP): the approved b1-cool terrain, served from public/terrain/ through
 * the local-dem:// protocol, so rendering is offline and deterministic. Shared by QuakeNews and TerrainSpike.
 */
import { staticFile } from 'remotion';
import { LOCAL_DEM_TILES, registerLocalDemProtocol } from './localDemProtocol.js';
import type { NewsMapStyle } from './NewsMap.js';
import { terrainStyle, terrainStyleName } from './terrainStyle.js';
import type { TerrainVariant } from './terrainStyle.js';

export const PRODUCTION_TERRAIN_VARIANT: TerrainVariant = 'b1-cool';

const resolve = ( path: string ) => new URL( staticFile( path ), window.location.href ).href;

/** The local (offline) terrain map style for a variant. */
export const localTerrainMapStyle = ( variant: TerrainVariant ): NewsMapStyle => ( {
  name: terrainStyleName( variant ),
  credits: 'terrain',
  style: () => {
    registerLocalDemProtocol();
    return terrainStyle( { resolve, demTiles: LOCAL_DEM_TILES, variant } );
  }
} );

export const productionMapStyle: NewsMapStyle = localTerrainMapStyle( PRODUCTION_TERRAIN_VARIANT );
