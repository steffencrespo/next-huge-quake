/**
 * Narration script and timeline meta for "A MASSIVE EARTHQUAKE IN NYC?! Myth or Fact?" (local experiment, companion to nyc-tsunami).
 * Approved script with the factual/timing corrections listed in CREDITS.md: the 1884 magnitude marked as an estimate, the DYFI record worded as
 * the USGS paper states it, the 5–25 % figure tied to its real meaning (potentially damaging shaking, intensity VI+, 100 years), "major" replaced by
 * "damaging" in the verdict, numbers spelled out for the voice and long sentences split under the 9 s clip limit.
 */
import type { EpisodeMeta } from '../../src/edu/episodes.js';
import type { ScriptLine } from '../../src/edu/narration.js';

/** Approved stills (ElevenLabs), copied unchanged from assets/images/nyc-earthquake/ into public/ at render time. */
export const IMAGES = {
  disaster: 'nyc-earthquake-01-disaster.png',
  historic: 'nyc-earthquake-02-historic-1884.png',
  brick: 'nyc-earthquake-03-old-buildings.png',
  calm: 'nyc-earthquake-04-calm-manhattan.png'
} as const;
export type ImageKey = keyof typeof IMAGES;
export const IMAGE_DIR = 'exp-nyc-earthquake';
export const imagePath = ( k: ImageKey ) => `${IMAGE_DIR}/${IMAGES[k]}`;

/** Storyboard starts (paced estimate, seconds); real clip timing replaces them once narration exists. `gap` = pause kept on purpose (fast-beats). */
export const LINES: ScriptLine[] = [
  { id: 'h0', start: 0.2, text: 'Imagine a powerful earthquake striking New York City.' },
  { id: 'h1', start: 3.0, text: 'Buildings shaking. Streets cracking. Millions caught off guard.' },
  { id: 'q', start: 6.4, gap: 0.3, text: 'Sounds like Hollywood fiction?' },
  { id: 'again', start: 8.0, gap: 0.35, text: 'Think again.' },
  { id: 'e84a', start: 9.0, text: 'In eighteen eighty-four, an earthquake estimated at magnitude five point two shook New York.' },
  { id: 'e84b', start: 13.6, gap: 0.35, text: 'It damaged chimneys and brick buildings in New York and New Jersey.' },
  { id: 'nj0', start: 17.2, text: 'And in twenty twenty-four, a magnitude four point eight earthquake struck nearby New Jersey.' },
  { id: 'nj1', start: 21.6, text: 'Millions felt it.' },
  { id: 'nj2', start: 22.8, gap: 0.35, text: 'The USGS received more than one hundred eighty thousand reports, the most for any earthquake.' },
  { id: 'but', start: 27.6, gap: 0.3, text: 'But here’s what makes this truly unsettling.' },
  { id: 'haz0', start: 30.0, text: 'New York City’s official hazard plan cites USGS maps:' },
  { id: 'haz1', start: 32.6, gap: 0.3, text: 'a five to twenty-five percent chance of potentially damaging shaking in the next hundred years.' },
  { id: 'sky', start: 37.4, text: 'And the biggest danger isn’t the skyscrapers.' },
  { id: 'v0', start: 39.6, text: 'It’s older brick buildings, aging underground infrastructure, and soft ground.' },
  { id: 'v1', start: 43.4, gap: 0.35, text: 'They could turn a moderate earthquake into a costly urban disaster.' },
  { id: 'yes', start: 46.9, gap: 0.3, text: 'So, could a damaging earthquake hit New York? Yes.' },
  { id: 'no', start: 49.6, gap: 0.3, text: 'Is a catastrophic quake likely? No.' },
  { id: 'end', start: 51.8, text: 'Myth or fact? New York isn’t earthquake-proof.' }
];

export const NYC_EARTHQUAKE: EpisodeMeta = { id: 'nyc-earthquake', number: 98, compositionId: 'NycEarthquake', title: 'A MASSIVE EARTHQUAKE IN NYC?!', baseSeconds: 0, tailSeconds: 2.0, script: LINES };
