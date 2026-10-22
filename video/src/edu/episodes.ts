/**
 * Scripts for educational Shorts 02 to 04 and the timeline helpers shared by their compositions.
 *
 * Every episode is a list of narration lines (one ElevenLabs clip each, taken from the narration library when an
 * identical approved clip exists). Scenes are anchored to those lines: a composition asks where line `id` starts and
 * ends, so the visuals follow the real voice once the audio exists and the planned timing before that.
 */
import { MIN_GAP_SECONDS, TAIL_SECONDS } from './narration.js';
import type { EduAudio, ScriptLine } from './narration.js';

/** Measured speech rate of the Daniel voice on Episode 01 (characters per second). */
export const SPEECH_CPS = 14.2;
export const estimateSeconds = ( text: string ) => text.length / SPEECH_CPS + 0.25;

/** The approved Like/Subscribe line from Episode 01; reused as is (same text, voice and model, so no new audio). */
export const CTA_LINE = { id: 'cta', text: 'Like and subscribe to Next Huge Quake for more earthquake science.' };

export function plan( lines: { id: string; text: string; gap?: number }[], first = 0.8 ): ScriptLine[] {
  let t = first;
  return lines.map( line => {
    const start = Math.round( t * 10 ) / 10;
    t = start + estimateSeconds( line.text ) + ( line.gap ?? 0.55 );
    return { id: line.id, text: line.text, start, ...( line.gap !== undefined ? { gap: line.gap } : {} ) };
  } );
}

export type EpisodeId = 'predict' | 'magnitude' | 'ring';
export type EpisodeMeta = { id: string; number: number; compositionId: string; title: string; baseSeconds: number; script: ScriptLine[]; /** Time kept after the last spoken word; defaults to TAIL_SECONDS. */ tailSeconds?: number };

export const EPISODES: Record<EpisodeId, EpisodeMeta> = {
  predict: {
    id: 'predict', number: 2, compositionId: 'WhyCantWePredict', title: 'Why Can’t We Predict Earthquakes?', baseSeconds: 58,
    script: plan( [
      { id: 'hook', text: 'Why can’t we predict earthquakes?' },
      { id: 'need', text: 'A real prediction needs a date, a place, and a magnitude.' },
      { id: 'never', text: 'No one has ever reliably done that for a major earthquake.' },
      { id: 'hidden', text: 'Faults are buried deep underground, and we can’t see stress building.' },
      { id: 'signal', text: 'Seismometers record every tremor, but no signal reliably warns of a big one.' },
      { id: 'forecast', text: 'What scientists can do is forecast.' },
      { id: 'odds', text: 'By studying faults and past earthquakes, they estimate the odds of a strong quake over years or decades.' },
      { id: 'notdate', text: 'That’s a probability, not a date.' },
      { id: 'warning', text: 'Early warning is different. It detects a quake already underway, and alerts places the shaking hasn’t reached yet.' },
      { id: 'ready', text: 'We can’t say when. But we can be ready.' },
      CTA_LINE
    ] )
  },
  magnitude: {
    id: 'magnitude', number: 3, compositionId: 'MagnitudeSixVsSeven', title: 'Magnitude 6 vs 7: What’s the Difference?', baseSeconds: 50,
    script: plan( [
      { id: 'hook', text: 'Magnitude seven isn’t just a bit bigger than magnitude six.' },
      { id: 'log', text: 'The scale is logarithmic.' },
      { id: 'amplitude', text: 'Each whole step means about ten times the ground motion recorded on a seismogram.' },
      { id: 'energy', text: 'And about thirty-two times the energy released.' },
      { id: 'two', text: 'Two steps up? Roughly a thousand times the energy.' },
      { id: 'source', text: 'But magnitude measures the earthquake itself, not the damage.' },
      { id: 'damage', text: 'Damage depends on shaking where you stand: distance, depth, soil, and building quality.' },
      { id: 'shallow', text: 'A shallow magnitude six near a city can hurt more than a deeper magnitude seven far offshore.' },
      { id: 'wrap', text: 'Magnitude is size. Intensity is shaking.' },
      CTA_LINE
    ] )
  },
  ring: {
    id: 'ring', number: 4, compositionId: 'RingOfFire', title: 'What Is the Ring of Fire?', baseSeconds: 58,
    script: plan( [
      { id: 'hook', text: 'Around the Pacific runs a vast arc of earthquakes and volcanoes.' },
      { id: 'name', text: 'The Ring of Fire.' },
      { id: 'stat', text: 'Many of the world’s largest earthquakes happen along this belt.' },
      { id: 'plates', text: 'It traces the edges of tectonic plates.' },
      { id: 'subduction', text: 'In many places, one plate sinks beneath another. That’s subduction.' },
      { id: 'quakes', text: 'The plates lock, build stress, and can release it in giant earthquakes.' },
      { id: 'volcanoes', text: 'Sinking plates also help rock melt, feeding chains of volcanoes above.' },
      { id: 'places', text: 'Chile, Alaska, Kamchatka, and Japan have each produced magnitude nine earthquakes.' },
      { id: 'notall', text: 'But not all of it. Hawaii’s volcanoes sit over a hotspot, and the Himalayas rise where continents collide.' },
      { id: 'end', text: 'The Ring of Fire is where our planet’s plates meet.' },
      CTA_LINE
    ] )
  }
};

export const EPISODE_LIST = Object.values( EPISODES );

// ---------- timeline ----------

export type Beat = { start: number; end: number };
export type Beats = Record<string, Beat>;

/** Planned timing, used for previews before any narration exists. */
export const plannedBeats = ( script: ScriptLine[] ): Beats =>
  Object.fromEntries( script.map( l => [ l.id, { start: l.start, end: l.start + estimateSeconds( l.text ) } ] ) );

/** Real timing from the placed clips. */
export const audioBeats = ( audio: EduAudio ): Beats =>
  Object.fromEntries( audio.clips.map( c => [ c.id, { start: c.start, end: c.start + c.duration } ] ) );

export const beatsFor = ( meta: EpisodeMeta, audio?: EduAudio ): Beats => ( audio ? audioBeats( audio ) : plannedBeats( meta.script ) );

export const lastBeatEnd = ( beats: Beats ) => Math.max( ...Object.values( beats ).map( b => b.end ) );
/** A paced episode is as long as its narration plus tail: the natural-pacing storyboard length (`baseSeconds`) is not a floor. */
export const episodeSeconds = ( meta: EpisodeMeta, audio?: EduAudio ) => Math.max( audio?.pacing ? 0 : meta.baseSeconds, Math.ceil( lastBeatEnd( beatsFor( meta, audio ) ) + ( meta.tailSeconds ?? TAIL_SECONDS ) ) );

/** Timed placeholder captions (no audio yet): each line split into short phrases, spread over its planned time. */
export function placeholderCaptions( script: ScriptLine[] ): { text: string; start: number; end: number }[] {
  const out: { text: string; start: number; end: number }[] = [];
  for ( const line of script ) {
    const words = line.text.split( ' ' );
    const chunks: string[] = [];
    let cur: string[] = [];
    for ( const w of words ) {
      if ( cur.length >= 6 || cur.join( ' ' ).length + w.length > 40 ) {
        chunks.push( cur.join( ' ' ) );
        cur = [];
      }
      cur.push( w );
    }
    chunks.push( cur.join( ' ' ) );
    const total = estimateSeconds( line.text ) - 0.25;
    let t = line.start;
    for ( const c of chunks ) {
      const d = ( c.length / line.text.length ) * total;
      out.push( { text: c, start: t, end: t + d } );
      t += d;
    }
  }
  return out;
}

export { MIN_GAP_SECONDS };
