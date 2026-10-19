/** Kids series audio: props schema (clips under audio/kids/), a gentler music mix than the adult videos, and caption-based event timing. */
import { z } from 'zod';
import { captionSchema } from '../audio/soundtrack.js';
import type { Beats } from '../edu/episodes.js';
import type { EduAudio } from '../edu/narration.js';

export const kidsAudioSchema = z.strictObject( {
  clips: z.array( z.strictObject( { id: z.string(), file: z.string().regex( /^audio\/kids\/[A-Za-z0-9._-]+\.mp3$/ ), start: z.number().min( 0 ), duration: z.number().positive(), gain: z.number().positive().optional() } ) ).min( 1 ),
  captions: z.array( captionSchema ).min( 1 ),
  narrationStart: z.number().min( 0 ),
  narrationEnd: z.number().positive(),
  musicFile: z.string().min( 1 ),
  musicCredit: z.string().min( 1 )
} );
export type KidsAudio = z.infer<typeof kidsAudioSchema>;

/** Music sits quietly: soft intro, low bed under the voice, a gentle swell after it, fade-out over the last 2 s. */
export const KIDS_MIX = { openGain: 0.3, duckGain: 0.09, endGain: 0.25, duckRamp: 0.7, swellRamp: 1.0, fadeOut: 2.0 } as const;

const clamp = ( x: number ) => Math.min( 1, Math.max( 0, x ) );
const lerp = ( a: number, b: number, t: number ) => a + ( b - a ) * clamp( t );

export function kidsMusicGain( time: number, narrationStart: number, narrationEnd: number, videoDuration: number ): number {
  const m = KIDS_MIX;
  const gain = time < narrationStart ? lerp( m.openGain, m.duckGain, ( time - ( narrationStart - m.duckRamp ) ) / m.duckRamp )
    : time <= narrationEnd ? m.duckGain
      : lerp( m.duckGain, m.endGain, ( time - narrationEnd ) / m.swellRamp );
  return gain * ( 1 - clamp( ( time - ( videoDuration - m.fadeOut ) ) / m.fadeOut ) );
}

/** When the spoken word `word` starts inside line `id`, from the real captions; `fallback` seconds into the line when there is no audio. */
export function wordStart( b: Beats, audio: EduAudio | KidsAudio | undefined, id: string, word: RegExp, fallback: number ): number {
  const hit = audio?.captions.find( c => c.start >= b[id].start - 0.01 && c.start < b[id].end && word.test( c.text ) );
  if ( !hit ) {
    return b[id].start + fallback;
  }
  // Captions are phrases: place the word proportionally to where it sits in the phrase.
  const index = hit.text.search( word );
  return hit.start + ( index / hit.text.length ) * ( hit.end - hit.start );
}
