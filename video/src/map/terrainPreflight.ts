/**
 * Terrain asset preflight: which DEM tiles a VideoSpec's camera path needs and which of them public/terrain/ lacks.
 * Pure (no I/O), so QuakeNews' calculateMetadata, prepare-terrain and the tests share it.
 */
import type { VideoSpec } from '../spec/schema.js';
import { totalFrames } from '../spec/timeline.js';
import { sortTiles, tilesForTrajectory } from './demTiles.js';
import { newsCameraAt } from './newsCamera.js';

/** Live maps need terrain; the static backdrop (design iteration only) does not. */
export const needsTerrain = ( spec: VideoSpec ) => spec.map.mode === 'live';

/** Tiles for the whole video: the original news camera at every frame. */
export function requiredTerrainTiles( spec: VideoSpec ): string[] {
  const target = { latitude: spec.event.latitude, longitude: spec.event.longitude, approachFrom: spec.map.approachFrom };
  return sortTiles( tilesForTrajectory( f => newsCameraAt( f, target ), totalFrames( spec ) ) );
}

export function missingTerrainTiles( required: string[], manifest: { tiles?: Record<string, unknown> } ): string[] {
  const have = manifest.tiles ?? {};
  return required.filter( key => !( key in have ) );
}

export function terrainMissingMessage( spec: VideoSpec, missing: string[] ): string {
  return `terrain tiles missing for ${spec.event.id}: ${missing.length} (e.g. ${missing.slice( 0, 3 ).join( ', ' )}); run: npm run prepare:terrain -- <path to spec JSON>`;
}

/** Throws a clear error when the manifest lacks tiles the video needs. */
export function assertTerrainAvailable( spec: VideoSpec, manifest: { tiles?: Record<string, unknown> } ) {
  const missing = missingTerrainTiles( requiredTerrainTiles( spec ), manifest );
  if ( missing.length > 0 ) {
    throw new Error( terrainMissingMessage( spec, missing ) );
  }
}
