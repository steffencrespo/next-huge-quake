/**
 * Soundtrack for a QuakeNews video: one narration MP3, one music MP3 and phrase-level captions timed against the
 * narration audio. Optional and separate from the VideoSpec (v1 stays a facts-only contract): without a soundtrack the
 * video is silent, as in M2.1/M2.2.
 *
 * Mix: the music opens at `openGain`, ducks to `duckGain` (about 11 dB under the narration's average level, measured
 * on the approved Noto files) before the narration starts, comes back up after it ends and fades to silence at the end.
 */
import { z } from 'zod';

export const captionSchema = z.strictObject( {
  text: z.string().min( 1 ),
  /** Seconds from the start of the narration file. */
  start: z.number().min( 0 ),
  end: z.number().positive()
} ).refine( c => c.end > c.start, 'caption end must be after start' );

export const soundtrackSchema = z.strictObject( {
  /** Files under public/audio (copied there from assets/audio by the render script). */
  narrationFile: z.string().min( 1 ),
  musicFile: z.string().min( 1 ),
  /** Narration start in the video, seconds: the musical opening before the voice. */
  narrationStart: z.number().min( 0 ),
  narrationDuration: z.number().positive(),
  captions: z.array( captionSchema ).min( 1 ),
  /** Music source line for the credits file and the video description. */
  musicCredit: z.string().min( 1 )
} );

export type Caption = z.infer<typeof captionSchema>;
export type Soundtrack = z.infer<typeof soundtrackSchema>;

export const MIX = {
  openGain: 0.7,
  duckGain: 0.11,
  endGain: 0.45,
  /** Seconds to ramp the music down before the voice enters, and back up after it ends. */
  duckRamp: 0.7,
  swellRamp: 1.0,
  /** Fade to silence over the last seconds of the video. */
  fadeOut: 2.0
} as const;

const clamp = ( x: number ) => Math.min( 1, Math.max( 0, x ) );
const lerp = ( a: number, b: number, t: number ) => a + ( b - a ) * clamp( t );

/** Music gain (0..1) at `time` seconds of a video lasting `videoDuration` seconds. */
export function musicGain( time: number, soundtrack: Pick<Soundtrack, 'narrationStart' | 'narrationDuration'>, videoDuration: number ): number {
  const voiceStart = soundtrack.narrationStart;
  const voiceEnd = soundtrack.narrationStart + soundtrack.narrationDuration;
  let gain: number;
  if ( time < voiceStart ) {
    gain = lerp( MIX.openGain, MIX.duckGain, ( time - ( voiceStart - MIX.duckRamp ) ) / MIX.duckRamp );
  } else if ( time <= voiceEnd ) {
    gain = MIX.duckGain;
  } else {
    gain = lerp( MIX.duckGain, MIX.endGain, ( time - voiceEnd ) / MIX.swellRamp );
  }
  return gain * ( 1 - clamp( ( time - ( videoDuration - MIX.fadeOut ) ) / MIX.fadeOut ) );
}

/** The caption on screen at `time` seconds of the video, or null. */
export function captionAt( time: number, soundtrack: Pick<Soundtrack, 'narrationStart' | 'captions'> ): Caption | null {
  const t = time - soundtrack.narrationStart;
  return soundtrack.captions.find( c => t >= c.start && t < c.end ) ?? null;
}
