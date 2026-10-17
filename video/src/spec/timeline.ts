import type { SceneKind, VideoSpec } from './schema.js';

export type SceneRange = { kind: SceneKind; from: number; durationInFrames: number };

/** Contiguous frame ranges for the spec's scenes, in order. */
export function sceneRanges( spec: VideoSpec ): SceneRange[] {
  let from = 0;
  return spec.scenes.map( scene => {
    const range = { kind: scene.kind, from, durationInFrames: scene.frames };
    from += scene.frames;
    return range;
  } );
}

export const totalFrames = ( spec: VideoSpec ): number => spec.scenes.reduce( ( sum, scene ) => sum + scene.frames, 0 );
