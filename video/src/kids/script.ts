/** Narration for Earthquake Science for Kids 01, "Why Does the Earth Shake?". One line = one future narration clip. */
import { plan } from '../edu/episodes.js';

export const CTA_LINE_KIDS = { id: 'cta', text: 'Join Next Huge Quake for more Earth science fun!' };

export const KIDS_SCRIPT = plan( [
  { id: 'hook', text: 'Hey, explorers! Why does the Earth shake?' },
  { id: 'puzzle', text: 'The ground under your feet is a giant puzzle!' },
  { id: 'plates', text: 'Earth’s outer shell is cracked into huge pieces called tectonic plates.' },
  { id: 'slow', text: 'They move super slowly, like your fingernails grow.' },
  { id: 'stuck', text: 'Rub two blocks together and their edges get stuck. Plates do that too!' },
  { id: 'stress', text: 'But the plates keep pushing. Push, push, push! Stress builds up.' },
  { id: 'snap', text: 'Then, snap! The rocks suddenly slip.' },
  { id: 'energy', text: 'That lets out a burst of energy.' },
  { id: 'waves', text: 'It travels outward as seismic waves, like ripples in a pond.' },
  { id: 'shake', text: 'When the waves reach us, the ground shakes!' },
  { id: 'learn', text: 'Scientists study these waves to learn about our planet.' },
  { id: 'end', text: 'So, what will you discover?' },
  CTA_LINE_KIDS
] );

export const kidsScriptCharacters = () => KIDS_SCRIPT.reduce( ( n, l ) => n + l.text.length, 0 );
