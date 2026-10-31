/**
 * "Can a Skyscraper Trigger an Earthquake? Scientists Found Something Strange." Series "Can This Cause an Earthquake?", episode 1
 * (local experiment, not published). Approved narration baseline (owner, 2026-10-31) with one minimal scientific correction, documented in
 * CREDITS.md: "discovered a hidden fault" became "found signs of a hidden fault" (Lin 2005 infers a blind normal fault from focal mechanisms;
 * nobody saw it). "Taipei 101" is spelled for the voice, as are the magnitudes (project convention). `gap` = pause kept on purpose (fast-beats).
 */
import { plan } from '../../src/edu/episodes.js';
import type { EpisodeMeta } from '../../src/edu/episodes.js';

export const LINES = plan( [
  { id: 'hook', text: 'What if a skyscraper could trigger an earthquake?', gap: 0.3 },
  { id: 'taiwan', text: 'In Taiwan, scientists noticed something strange beneath Taipei one-oh-one.' },
  { id: 'rose', text: 'As the massive tower rose, earthquake activity increased.', gap: 0.2 },
  { id: 'two', text: 'Then, two earthquakes struck beneath the area.' },
  { id: 'mags', text: 'Magnitudes three point eight and three point two.', gap: 0.3 },
  { id: 'fault', text: 'Researchers found signs of a hidden fault deep underground.' },
  { id: 'weight', text: 'And they suspected the building’s enormous weight might have helped trigger the shaking.', gap: 0.35 },
  { id: 'catch', text: 'But here’s the catch.', gap: 0.3 },
  { id: 'proof', text: 'Nobody has proven the tower caused those earthquakes.', gap: 0.35 },
  { id: 'q', text: 'So can a skyscraper trigger an earthquake?', gap: 0.3 },
  { id: 'end', text: 'Possibly. And that’s what makes this discovery so fascinating.' }
], 0.2 );

/** Sources for each line (see CREDITS.md). Checked by `tsx experiments/taipei101-cinematic/audio.ts plan`. */
export const FACTS: Record<string, string> = {
  hook: 'Framing question for the hypothesis in Lin (2005), GRL 32(22), doi:10.1029/2005GL024223',
  taiwan: 'Lin (2005) abstract: seismicity increase in the Taipei basin, "where local seismicity had historically very low", after Taipei 101 (508 m) was built',
  rose: 'Lin (2005) abstract: "Seismic activity began to slightly increase during the construction but rose sharply upon the completion"; increase in seismic energy and micro-earthquakes',
  two: 'Lin (2005) abstract: "two felt earthquakes ... occurred beneath the completed building"; Chen et al. (2010) TAO 21(3): felt events near the eastern Taipei basin, about 3 km south of Taipei 101 ("beneath the area")',
  mags: 'Lin (2005) as reported by The Guardian / Taipei Times (2005-12-03), UPI (phys.org), Al Jazeera: ML 3.8 (Oct 2004) and ML 3.2 (Mar 2005), about 10 km deep',
  fault: 'Lin (2005) abstract: focal mechanisms "indicative of an active blind normal fault just beneath the building"; Chen et al. (2010): seismicity and focal mechanisms suggest a blind normal fault',
  weight: 'Lin (2005) abstract: foundation stress increased at least 4.7 bars, "making it seem likely that the increased seismicity was a direct product of the loading"; Lin called it a theory',
  catch: 'Editorial transition',
  proof: 'Lin (Taipei Times 2005): could not determine whether the building was responsible; Vidale (UCLA): building stress probably does not reach ~10 km; Lubkowski (Arup): ten years of data too short',
  q: 'Framing question',
  end: 'Editorial conclusion: hypothesis neither confirmed nor ruled out in the cited literature'
};

export const TAIPEI101: EpisodeMeta = {
  id: 'taipei101-cinematic', number: 101, compositionId: 'Taipei101Cinematic', title: 'Can a Skyscraper Trigger an Earthquake?', baseSeconds: 0, tailSeconds: 1.8, script: LINES
};
