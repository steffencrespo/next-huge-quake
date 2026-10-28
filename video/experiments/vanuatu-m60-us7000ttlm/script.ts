/** Narration script and timeline meta for the Vanuatu sequence Short (latest: USGS us7000ttlm, M6.0, October 28, 2026 UTC). Event facts come from the cached USGS data (data.json). */
import data from './data.json' with { type: 'json' };
import type { EpisodeMeta } from '../../src/edu/episodes.js';
import type { ScriptLine } from '../../src/edu/narration.js';

export type Quake = { id: string; time: string; mag: number; magType: string; place: string; lon: number; lat: number; depth: number; tsunami: number; alert: string; status: string };
/** Chronological: Oct 19 M6.0, Oct 20 M6.3, Oct 24 M6.9, Oct 24 M6.3 (mb), Oct 28 M6.0. */
export const EVENTS = ( data.sequence.events as Quake[] ).slice().sort( ( a, b ) => a.time.localeCompare( b.time ) );
export const [ E0, E1, E2, E3, E4 ] = EVENTS;
export const LARGEST = EVENTS.reduce( ( a, b ) => ( b.mag > a.mag ? b : a ) );
export const LATEST = EVENTS[EVENTS.length - 1];
/** The approved AI-generated establishing image (ElevenLabs GPT Image 2.5 Sunburst, generated manually); staged to public/ at render time. */
export const IMAGE_FILE = 'exp-vanuatu/vanuatu-coast-ai.png';
export const dateLabel = ( e: Quake ) => `OCT ${Number( e.time.slice( 8, 10 ) )}`;
export const timeLabel = ( e: Quake ) => `${e.time.slice( 11, 16 )} UTC`;

/** Storyboard starts (paced estimate, seconds); real clip timing replaces them once narration exists. `gap` = pause kept on purpose (fast-beats). */
export const LINES: ScriptLine[] = [
  { id: 'h0', start: 0.25, gap: 0.25, text: 'Five powerful earthquakes. Nine days.' },
  { id: 'h1', start: 2.7, text: 'And Vanuatu is still shaking.' },
  { id: 's0', start: 4.4, text: 'It began October nineteenth, with a magnitude six point zero.' },
  { id: 's1', start: 7.9, text: 'A six point three followed the next day.' },
  { id: 's2', start: 10.3, text: 'On October twenty-fourth, a six point nine, then a six point three minutes later.' },
  { id: 's3', start: 14.9, text: 'And on October twenty-eighth, the latest: another six point zero.' },
  { id: 'w0', start: 18.7, text: 'Why so much? Vanuatu sits where the Australian plate dives beneath the Pacific plate.' },
  { id: 'w1', start: 23.6, text: 'That slow collision loads faults with stress until they slip.' },
  { id: 'e0', start: 27.1, gap: 0.45, text: 'That same collision built Vanuatu\'s chain of volcanic islands.' },
  { id: 'e1', start: 30.6, text: 'This one patch had five in nine days.' }
];

export const VANUATU_SEQUENCE: EpisodeMeta = { id: 'vanuatu-m60-us7000ttlm', number: 99, compositionId: 'VanuatuSequence', title: 'Why Does Vanuatu Keep Shaking? Another M6.0 Strikes!', baseSeconds: 0, tailSeconds: 3, script: LINES };
