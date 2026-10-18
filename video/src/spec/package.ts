/**
 * Video package: the hand-off from M1 (quake-news-agent `toVideoPackage`) to this renderer. It mirrors M1's
 * `videoPackageSchema` instead of importing it. M1 only produces a package from a draft whose validation passed;
 * this schema repeats the structural checks and the event is validated by the VideoSpec event schema.
 */
import { z } from 'zod';
import { buildVideoSpec } from './build.js';
import { eventSchema } from './schema.js';
import type { VideoSpec } from './schema.js';

export const videoPackageSchema = z.strictObject( {
  provenance: z.literal( 'usgs-live' ),
  approachFrom: z.enum( [ 'west', 'east' ] ),
  asOfUtc: z.iso.datetime(),
  event: eventSchema,
  narration: z.string().trim().min( 1 )
} );

export type VideoPackage = z.infer<typeof videoPackageSchema>;

/** Narration pace (Panama: 59 words in 29.7 s) used only for the review estimate; the real length comes from the TTS audio (M2.4b). */
export const APPROX_WORDS_PER_SECOND = 2.0;

export const countWords = ( text: string ): number => text.trim().split( /\s+/ ).filter( Boolean ).length;

/** Parses a package (throws a ZodError naming the bad field) and builds its VideoSpec with the existing builder. */
export function specFromPackage( raw: unknown ): { pkg: VideoPackage; spec: VideoSpec } {
  const pkg = videoPackageSchema.parse( raw );
  const spec = buildVideoSpec(
    { provenance: pkg.provenance, source: 'm1-video-package', approachFrom: pkg.approachFrom, event: pkg.event },
    { asOfUtc: pkg.asOfUtc }
  );
  return { pkg, spec };
}

/** The review script: the narration unchanged, with the facts a reviewer needs to check it. */
export function scriptText( pkg: VideoPackage ): string {
  const words = countWords( pkg.narration );
  const seconds = Math.round( words / APPROX_WORDS_PER_SECOND );
  return [
    `Event: ${pkg.event.id}`,
    `USGS: ${pkg.event.url}`,
    `Words: ${words}`,
    `Approximate narration duration: ~${seconds} s (estimate at ${APPROX_WORDS_PER_SECOND} words/s; not measured from audio)`,
    '',
    pkg.narration.trim(),
    ''
  ].join( '\n' );
}
