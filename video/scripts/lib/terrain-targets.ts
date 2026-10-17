/**
 * Camera targets of the terrain spike (M2.2a) and the frames each one needs DEM tiles for.
 * Fixtures are rendered as full videos, so they need the whole camera path; probes are rendered as stills only.
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { FIXTURES } from '../../src/fixtures/index.js';
import type { FixtureKey } from '../../src/fixtures/index.js';
import { sortTiles, tilesForTrajectory } from '../../src/map/demTiles.js';
import { HOLD_CAMERA, newsCameraAt } from '../../src/map/newsCamera.js';
import { TERRAIN_PROBES } from '../../src/map/terrainProbes.js';
import type { ProbeKey } from '../../src/map/terrainProbes.js';
import type { CameraTarget } from '../../src/spike/camera.js';
import { videoSpecSchema } from '../../src/spec/schema.js';
import type { VideoSpec } from '../../src/spec/schema.js';
import { totalFrames } from '../../src/spec/timeline.js';

export const VIDEO_FRAMES = 1050;
/** Camera-path frames for the fixtures' map-only stills: globe, approach, arrival, push, end state. */
export const STILL_FRAMES = [ 0, 60, 120, 165, 300, 900 ] as const;
/** Probes are judged on fewer frames: the globe, the arrival, the label window (M2.2c) and the end state. */
export const PROBE_FRAMES = [ 60, 165, 300, 600, 900 ] as const;
export const SPIKE_FIXTURES: FixtureKey[] = [ 'noto', 'kamchatka' ];
export const SPIKE_PROBES = Object.keys( TERRAIN_PROBES ) as ProbeKey[];

export type TerrainTarget = { name: string; kind: 'fixture' | 'probe' | 'spec'; target: CameraTarget; frames: number[] };

/** A target from a VideoSpec: the event position and approach side over every frame of the video. */
export function terrainTargetFromSpec( input: unknown, name: string ): TerrainTarget {
  const spec: VideoSpec = videoSpecSchema.parse( input );
  return {
    name,
    kind: 'spec',
    target: { latitude: spec.event.latitude, longitude: spec.event.longitude, approachFrom: spec.map.approachFrom },
    frames: Array.from( { length: totalFrames( spec ) }, ( _, i ) => i )
  };
}

/** A fixture or probe name, or the path to a JSON file holding a VideoSpec (bare, or wrapped as `{ spec }` like render props). */
export function terrainTarget( name: string ): TerrainTarget {
  if ( name.endsWith( '.json' ) ) {
    const json = JSON.parse( readFileSync( name, 'utf8' ) ) as { spec?: unknown };
    return terrainTargetFromSpec( json.spec ?? json, `spec-${basename( name, '.json' )}` );
  }
  if ( name in FIXTURES ) {
    const f = FIXTURES[name as FixtureKey];
    return {
      name,
      kind: 'fixture',
      target: { latitude: f.event.latitude, longitude: f.event.longitude, approachFrom: f.approachFrom },
      frames: Array.from( { length: VIDEO_FRAMES }, ( _, i ) => i )
    };
  }
  if ( name in TERRAIN_PROBES ) {
    return { name, kind: 'probe', target: TERRAIN_PROBES[name as ProbeKey], frames: [ ...PROBE_FRAMES ] };
  }
  throw new Error( `unknown terrain target '${name}' (fixtures: ${SPIKE_FIXTURES.join( ', ' )}; probes: ${SPIKE_PROBES.join( ', ' )}; or a VideoSpec .json file)` );
}

/**
 * The estimated DEM tile set for a target: the footprint of every listed frame, for both the M2.1 camera and the
 * M2.2c camera-hold experiment (same end state, faster push).
 */
export function estimatedTiles( t: TerrainTarget ): string[] {
  const frames = t.frames;
  const tiles = [ {}, HOLD_CAMERA ].flatMap( options => tilesForTrajectory( i => newsCameraAt( frames[i], t.target, options ), frames.length ) );
  return sortTiles( new Set( tiles ) );
}
