/**
 * Narration script and timeline meta for "NEW YORK WIPED OUT BY A TSUNAMI?!" (Myth or Fact, local experiment).
 * Approved script with the factual/timing corrections listed in CREDITS.md: numbers spelled out for the voice (project convention),
 * long sentences split under the 9 s clip limit, the hazard rating aligned with the NOAA/USGS assessment ("low", not "very low"),
 * and the La Palma line attributed to the USGS instead of "largely rejected".
 */
import type { EpisodeMeta } from '../../src/edu/episodes.js';
import type { ScriptLine } from '../../src/edu/narration.js';

/** Approved stills (ElevenLabs, GPT Image 2.5 Sunburst), copied unchanged from assets/images/nyc-tsunami/ into public/ at render time. */
export const IMAGES = {
  wave: 'nyc-tsunami-01-monster-wave.png',
  liberty: 'nyc-tsunami-02-statue-liberty.png',
  flooded: 'nyc-tsunami-03-flooded-manhattan.png',
  calm: 'nyc-tsunami-04-calm-manhattan.png'
} as const;
export type ImageKey = keyof typeof IMAGES;
export const IMAGE_DIR = 'exp-nyc-tsunami';
export const imagePath = ( k: ImageKey ) => `${IMAGE_DIR}/${IMAGES[k]}`;

/** Storyboard starts (paced estimate, seconds); real clip timing replaces them once narration exists. `gap` = pause kept on purpose (fast-beats). */
export const LINES: ScriptLine[] = [
  { id: 'h0', start: 0.2, text: 'Imagine a monster tsunami racing toward New York City.' },
  { id: 'h1', start: 3.4, text: 'Manhattan underwater. The Statue of Liberty surrounded by raging waves.' },
  { id: 'q', start: 7.6, gap: 0.45, text: 'Could this nightmare actually happen?' },
  { id: 'atl', start: 10.3, text: 'Here’s the terrifying part: the Atlantic has produced deadly tsunamis before.' },
  { id: 'gb0', start: 14.8, text: 'In nineteen twenty-nine, a magnitude seven point two earthquake struck off Newfoundland.' },
  { id: 'gb1', start: 19.7, text: 'It triggered a massive underwater landslide.' },
  { id: 'gb2', start: 22.4, text: 'The tsunami killed twenty-eight people.' },
  { id: 'gb3', start: 24.8, gap: 0.4, text: 'Its waves were detected as far south as South Carolina.' },
  { id: 'ny', start: 28.4, gap: 0.35, text: 'But what about New York?' },
  { id: 'low', start: 30.4, text: 'Scientists rate the Atlantic coast’s tsunami hazard as low. But not zero.' },
  { id: 'lp0', start: 34.6, text: 'And that famous mega-tsunami theory involving a collapsing volcano in the Canary Islands?' },
  { id: 'lp1', start: 39.6, gap: 0.4, text: 'USGS scientists say that nightmare scenario doesn’t hold up.' },
  { id: 'yes', start: 43.3, gap: 0.3, text: 'So, could a tsunami reach New York? Yes.' },
  { id: 'no', start: 45.9, gap: 0.4, text: 'Could a monster wave wipe out Manhattan? That’s not a credible expected scenario.' },
  { id: 'end', start: 50.8, text: 'Myth or fact? The threat is real. The Hollywood disaster is not.' }
];

export const NYC_TSUNAMI: EpisodeMeta = { id: 'nyc-tsunami', number: 98, compositionId: 'NycTsunami', title: 'NEW YORK WIPED OUT BY A TSUNAMI?!', baseSeconds: 0, tailSeconds: 2.2, script: LINES };
