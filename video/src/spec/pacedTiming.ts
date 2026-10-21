import { videoSpecSchema, MIN_DURATION_FRAMES } from './schema.js';
import type { VideoSpec } from './schema.js';

/**
 * Seconds kept after the last spoken word of a paced news video: the layout of the published videos (35 s video,
 * voice from 1.5 s, 29.73 s of narration), where the closing card starts about 1.2 s before the voice ends and runs on.
 */
export const PACED_TAIL_SECONDS = 3.77;

/**
 * Scene lengths for a news video whose narration was sped up (src/audio/pacing.ts). The video ends PACED_TAIL_SECONDS
 * after the voice instead of keeping the 35 s default; Hook and Closing keep their lengths and Facts and Context share
 * the rest equally, as in the default timing. Never shorter than the spec's minimum duration.
 */
export function pacedSpec( spec: VideoSpec, narrationStart: number, narrationDuration: number ): VideoSpec {
  const { fps } = spec.format;
  const [ hook, facts, context, closing ] = spec.scenes;
  const total = Math.max( MIN_DURATION_FRAMES, Math.round( ( narrationStart + narrationDuration + PACED_TAIL_SECONDS ) * fps ) );
  const flex = total - hook.frames - closing.frames;
  const factsFrames = Math.round( flex / 2 );
  return videoSpecSchema.parse( { ...spec, scenes: [ hook, { ...facts, frames: factsFrames }, { ...context, frames: flex - factsFrames }, closing ] } );
}
