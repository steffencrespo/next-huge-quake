/**
 * Narration for "Why Do Earthquakes Happen?": the script, its placement on the 60 s timeline, and the audio props.
 *
 * Each sentence is its own narration clip (one ElevenLabs request each, cached on disk), placed at the start time the
 * storyboard gives its scene. The visuals therefore keep their timing and the voice follows them; a clip that would
 * start before the previous one has finished is pushed back by `placeClips`. Captions come from each clip's character
 * alignment (src/audio/captions.ts) and are offset by the clip's start.
 */
import { z } from 'zod';
import { captionSchema } from '../audio/soundtrack.js';
import type { Caption } from '../audio/soundtrack.js';

export type ScriptLine = { id: string; text: string; start: number };

/** Final script. `start` is when the line should begin (seconds), matching the storyboard scene it belongs to. */
export const SCRIPT: ScriptLine[] = [
  { id: 'hook', text: 'Why does the ground suddenly start shaking?', start: 0.8 },
  { id: 'plates-1', text: 'Earth’s outer shell is broken into massive tectonic plates.', start: 5.6 },
  { id: 'plates-2', text: 'And they’re constantly moving, slowly but relentlessly.', start: 11.4 },
  { id: 'lock', text: 'But along a fault, rocks can get stuck.', start: 17.4 },
  { id: 'stress', text: 'As the surrounding crust keeps moving, the locked rock bends, and stress builds up.', start: 22.6 },
  { id: 'friction', text: 'Eventually, the stress overcomes friction.', start: 31.2 },
  { id: 'slip', text: 'The rocks suddenly slip, releasing energy as seismic waves.', start: 33.8 },
  { id: 'p-s', text: 'Fast P waves race ahead, followed by slower, stronger S waves.', start: 38.3 },
  { id: 'surface', text: 'Those waves travel through the Earth and shake the surface.', start: 43.4 },
  { id: 'earthquake', text: 'That’s an earthquake.', start: 48.4 },
  { id: 'never-stops', text: 'The Earth never stops moving.', start: 52.4 },
  { id: 'cta', text: 'Like and subscribe to Next Huge Quake for more earthquake science.', start: 55 }
];

export const scriptCharacters = ( script: ScriptLine[] = SCRIPT ) => script.reduce( ( n, line ) => n + line.text.length, 0 );

/** Longest a single clip may be (seconds). */
export const MAX_CLIP_SECONDS = 9;
/** Smallest pause kept between two clips. */
export const MIN_GAP_SECONDS = 0.3;
/** The storyboard length. The video is extended past it when the natural narration needs more time. */
export const BASE_SECONDS = 60;
/** Time kept after the last spoken word for the closing card and the music swell. */
export const TAIL_SECONDS = 2.5;

/** Video length in whole seconds: the storyboard length, or longer when the narration plus tail does not fit. */
export const videoSeconds = ( narrationEnd: number ) => Math.max( BASE_SECONDS, Math.ceil( narrationEnd + TAIL_SECONDS ) );

export const eduAudioSchema = z.strictObject( {
  clips: z.array( z.strictObject( { id: z.string(), file: z.string().regex( /^audio\/edu\/[A-Za-z0-9._-]+\.mp3$/ ), start: z.number().min( 0 ), duration: z.number().positive(), gain: z.number().positive().optional() } ) ).min( 1 ),
  captions: z.array( captionSchema ).min( 1 ),
  /** First clip start and last clip end: the span the music ducks under. */
  narrationStart: z.number().min( 0 ),
  narrationEnd: z.number().positive(),
  musicFile: z.string().min( 1 ),
  musicCredit: z.string().min( 1 ),
  /** Name of the pacing preset the clips were processed with (src/audio/pacing.ts); absent for natural pacing. */
  pacing: z.string().optional()
} );
export type EduAudio = z.infer<typeof eduAudioSchema>;

export type ClipInput = { id: string; file: string; duration: number; captions: Caption[]; gain?: number };

/**
 * Places the clips on the timeline in script order. Spoken lines are never overlapped or cut: they are pushed back instead.
 * With `gap` (paced clips) each clip starts `gap` seconds after the previous one ends and the storyboard start times only
 * position the first.
 */
export function placeClips( script: ScriptLine[], clips: ClipInput[], options: { gap?: number } = {} ): Pick<EduAudio, 'clips' | 'captions' | 'narrationStart' | 'narrationEnd'> {
  if ( script.length !== clips.length ) {
    throw new Error( `expected ${script.length} clips, got ${clips.length}` );
  }
  let previousEnd = 0;
  const placed: EduAudio['clips'] = [];
  const captions: Caption[] = [];
  script.forEach( ( line, i ) => {
    const clip = clips[i];
    if ( clip.id !== line.id ) {
      throw new Error( `clip ${i} is '${clip.id}', expected '${line.id}'` );
    }
    if ( clip.duration > MAX_CLIP_SECONDS ) {
      throw new Error( `clip '${line.id}' is ${clip.duration.toFixed( 2 )} s, over ${MAX_CLIP_SECONDS} s; shorten the line` );
    }
    const start = i === 0 ? line.start : options.gap !== undefined ? previousEnd + options.gap : Math.max( line.start, previousEnd + MIN_GAP_SECONDS );
    placed.push( { id: clip.id, file: clip.file, start: round( start ), duration: round( clip.duration ), gain: clip.gain ?? 1 } );
    for ( const c of clip.captions ) {
      captions.push( { text: c.text, start: round( start + c.start ), end: round( start + c.end ) } );
    }
    previousEnd = start + clip.duration;
  } );
  return { clips: placed, captions, narrationStart: placed[0].start, narrationEnd: round( previousEnd ) };
}

const round = ( x: number ) => Math.round( x * 1000 ) / 1000;
