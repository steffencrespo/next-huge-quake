/**
 * "Earthquake Science for Kids": configuration kept apart from the adult educational, historic and news pipelines.
 * The voice, the soundtrack and the palette live here only; nothing in this file changes MUSIC, DEFAULT_MUSIC or the
 * ELEVENLABS_* environment defaults used by the other workflows.
 */
import { CTA_LINE_KIDS, KIDS_SCRIPT, KIDS_SCRIPT_SAFETY, KIDS_SCRIPT_SHORT } from './script.js';
import type { EpisodeMeta } from '../edu/episodes.js';

/** "Max - USA Energetic Animated Cartoon". Passed to the TTS config explicitly when narration is approved; never written to .env.local. */
export const KIDS_VOICE = { id: '467tX2b9Bky3cD6jXpNa', name: 'Max - USA Energetic Animated Cartoon' } as const;

/** Summer Thyme, official YouTube Audio Library (Children's, Happy, 1:57, no attribution required, credited anyway). */
export const KIDS_MUSIC = {
  file: 'audio/kids/ytal-summer-thyme-jeremy-korpas.mp3',
  credit: '"Summer Thyme" by Jeremy Korpas.\nSource: YouTube Audio Library.'
} as const;

export const KIDS_PALETTE = {
  skyTop: '#8fdcff',
  skyBottom: '#fff3c4',
  ink: '#1f2a5a',
  white: '#ffffff',
  sun: '#ffc93c',
  orange: '#ff8a3d',
  pink: '#ff6fa5',
  teal: '#20c9b0',
  blue: '#3d8bff',
  purple: '#9b6bff',
  green: '#5fd068',
  grass: '#7be06b',
  soil: '#c98a52'
} as const;

export const KIDS_EPISODE: EpisodeMeta = {
  id: 'kids-01', number: 1, compositionId: 'KidsWhyEarthShakes', title: 'Why Does the Earth Shake?', baseSeconds: 52, script: KIDS_SCRIPT
};

export { CTA_LINE_KIDS };

export const KIDS_EPISODE_SHORT: EpisodeMeta = {
  id: 'kids-01-short', number: 1, compositionId: 'KidsWhyEarthShakesShort', title: 'Why Does the Earth Shake?', baseSeconds: 35, script: KIDS_SCRIPT_SHORT
};

export const KIDS_EPISODE_SAFETY: EpisodeMeta = {
  id: 'kids-02', number: 2, compositionId: 'KidsDropCoverHold', title: 'What Should You Do During an Earthquake?', baseSeconds: 35, script: KIDS_SCRIPT_SAFETY
};

/** Episodes selectable with --ep= in the narration and render scripts; the unlisted default is the original V1/V2 episode. */
export const KIDS_EPISODES = { short: KIDS_EPISODE_SHORT, safety: KIDS_EPISODE_SAFETY } as const;
export type KidsEpKey = keyof typeof KIDS_EPISODES;
