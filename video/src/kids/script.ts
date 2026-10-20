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

/** Tighter cut of episode 01 for the 35-45 s target. Same scene ids as KIDS_SCRIPT, so the same scenes play; "snap", "energy", "waves", "shake", "end" and "cta" reuse the V2 clips. */
export const KIDS_SCRIPT_SHORT = plan( [
  { id: 'hook', text: 'The ground beneath your feet is moving RIGHT NOW!' },
  { id: 'puzzle', text: 'Earth is a giant puzzle!' },
  { id: 'plates', text: 'Its outer shell is cracked into huge tectonic plates.' },
  { id: 'slow', text: 'They creep super slowly, like fingernails grow.' },
  { id: 'stuck', text: 'Along a fault, their edges get stuck.' },
  { id: 'stress', text: 'But they keep pushing. Stress builds up!' },
  { id: 'snap', text: 'Then, snap! The rocks suddenly slip.' },
  { id: 'energy', text: 'That lets out a burst of energy.' },
  { id: 'waves', text: 'It travels outward as seismic waves, like ripples in a pond.' },
  { id: 'shake', text: 'When the waves reach us, the ground shakes!' },
  { id: 'learn', text: 'Scientists study these waves.' },
  { id: 'end', text: 'So, what will you discover?' },
  CTA_LINE_KIDS
], 0.6 );

/** Episode 02: Drop, Cover, Hold On (USGS / Ready.gov / Earthquake Country Alliance guidance). */
export const KIDS_SCRIPT_SAFETY = plan( [
  { id: 'hook', text: 'If the ground started shaking RIGHT NOW, would you know what to do?' },
  { id: 'scene', text: 'Imagine the floor starts to rumble!' },
  { id: 'three', text: 'Stay calm and remember three words: Drop, Cover, Hold On!' },
  { id: 'drop', text: 'DROP! Get down on your hands and knees.' },
  { id: 'cover', text: 'COVER! Protect your head and neck. Get under a sturdy table if one is close.' },
  { id: 'hold', text: 'HOLD ON! Grip the table leg until the shaking stops.' },
  { id: 'inside', text: 'Stay inside. Don’t run outside while the ground is shaking!' },
  { id: 'recap', text: 'Drop! Cover! Hold on! You’ve got this!' },
  CTA_LINE_KIDS
], 0.6 );
