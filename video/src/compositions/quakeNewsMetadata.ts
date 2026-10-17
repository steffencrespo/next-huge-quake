/**
 * Render-time validation for QuakeNews, kept free of browser and map imports so it can be unit-tested.
 * Re-parses the spec, runs the copy guard and derives the composition metadata from the spec.
 */
import { assertScreenText } from '../copy/guard.js';
import { allScreenText, buildScreenCopy } from '../copy/screenCopy.js';
import { videoSpecSchema } from '../spec/schema.js';
import type { VideoSpec } from '../spec/schema.js';
import { totalFrames } from '../spec/timeline.js';

export function resolveQuakeNewsMetadata( input: unknown ): { spec: VideoSpec; durationInFrames: number; fps: number; width: number; height: number } {
  const spec = videoSpecSchema.parse( input );
  assertScreenText( allScreenText( buildScreenCopy( spec ) ), spec.event );
  return { spec, durationInFrames: totalFrames( spec ), fps: spec.format.fps, width: spec.format.width, height: spec.format.height };
}
