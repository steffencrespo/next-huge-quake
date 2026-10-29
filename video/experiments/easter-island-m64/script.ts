/** Narration script and timeline meta for the Easter Island M6.4 breaking-news Short (USGS us7000ttxz, October 29, 2026 UTC). Event facts come from the cached USGS data (data.json). */
import data from './data.json' with { type: 'json' };
import type { EpisodeMeta } from '../../src/edu/episodes.js';
import type { ScriptLine } from '../../src/edu/narration.js';

export const EVENT = data.event;
export const PAGER = data.pager;
export const HANGA_ROA = data.hangaRoa.lonLat as [ number, number ];
export const HANGA_ROA_KM = data.hangaRoa.km;
/** The 2021 M6.7 (us6000de34), 26 km from this epicenter: the "nearly the same spot" line. */
export const PRIOR_2021 = data.prior.find( e => e.id === 'us6000de34' )!;
export const SEISMICITY = data.seismicity.points as [ number, number, number ][];
/** The approved AI-generated opening image (ElevenLabs, generated manually); staged to public/ at render time. */
export const IMAGE_FILE = 'exp-easter-island/easter-island-m64-opening.png';
export const IMAGE_SOURCE = 'assets/images/easter-island-m64/easter-island-m64-opening.png';

/** Storyboard starts (paced estimate, seconds); real clip timing replaces them once narration exists. `gap` = pause kept on purpose (fast-beats). */
export const LINES: ScriptLine[] = [
  { id: 'h0', start: 0.2, text: 'A magnitude six point four earthquake just struck the South Pacific!' },
  { id: 'h1', start: 3.4, gap: 0.3, text: 'But not on Easter Island.' },
  { id: 's0', start: 5.0, text: 'It hit about fifteen hundred kilometers southeast, in the open ocean.' },
  { id: 's1', start: 8.6, text: 'A shallow quake on October twenty-ninth, far from any town.' },
  { id: 'i0', start: 11.8, text: 'USGS issued a green alert, estimating no populated areas were exposed to shaking.' },
  { id: 'i1', start: 15.8, text: 'No tsunami warnings or damage have been reported.' },
  { id: 'w0', start: 18.5, text: 'Why here? This is the Chile Rise, where the Nazca and Antarctic plates pull apart.' },
  { id: 'w1', start: 23.0, text: 'USGS data show this fault slipped sideways.' },
  { id: 'e0', start: 25.4, text: 'Nearly the same spot hit six point seven in twenty twenty-one.' },
  { id: 'e1', start: 28.8, text: 'Follow Next Huge Quake for verified earthquake news.' }
];

export const EASTER_ISLAND_M64: EpisodeMeta = { id: 'easter-island-m64-us7000ttxz', number: 99, compositionId: 'EasterIslandM64', title: 'M6.4 EARTHQUAKE Near EASTER ISLAND! What Happened?', baseSeconds: 0, tailSeconds: 2.5, script: LINES };
