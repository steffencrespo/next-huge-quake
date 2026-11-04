/**
 * "We're Triggering Earthquakes. And We Know How." Series "Can This Cause an Earthquake?", episode 2 (local, not published). Approved narration
 * baseline (owner, 2026-11-03) with one minimal accuracy change, documented in CREDITS.md: "struck Pawnee" became "struck near Pawnee" (the USGS
 * epicenter is 14 km NW of the town). The year and magnitude are spelled for the voice (project convention). `gap` = pause kept on purpose (fast-beats).
 */
import { plan } from '../../src/edu/episodes.js';
import type { EpisodeMeta } from '../../src/edu/episodes.js';

export const LINES = plan( [
  { id: 'hook', text: 'We’re triggering earthquakes.', gap: 0.2 },
  { id: 'how', text: 'And we know how.', gap: 0.3 },
  { id: 'deep', text: 'Deep beneath America’s oil fields, something unexpected is happening.' },
  { id: 'pump', text: 'Companies pump enormous amounts of wastewater underground.' },
  { id: 'pressure', text: 'That fluid can increase pressure along faults already under stress.', gap: 0.15 },
  { id: 'slip', text: 'And sometimes, those faults slip.', gap: 0.3 },
  { id: 'pawnee', text: 'In twenty sixteen, a magnitude five point eight earthquake struck near Pawnee, Oklahoma.' },
  { id: 'linked', text: 'Researchers linked that sequence to wastewater injection.', gap: 0.3 },
  { id: 'wrong', text: 'But here’s what most people get wrong.', gap: 0.25 },
  { id: 'drill', text: 'It’s not usually the drilling itself.' },
  { id: 'after', text: 'It’s what happens deep underground afterward.', gap: 0.3 },
  { id: 'end', text: 'And yes — humans really can trigger earthquakes.' }
], 0.2 );

/** Sources for each line (see CREDITS.md). Checked by `tsx experiments/oil-drilling-cinematic/audio.ts plan`. */
export const FACTS: Record<string, string> = {
  hook: 'USGS, Myths and Misconceptions About Induced Earthquakes: wastewater disposal is the main cause of the recent increase in central US earthquakes; Ellsworth (2013), Science, doi:10.1126/science.1225942',
  how: 'Editorial framing of the mechanism below (fluid pressure reaching faults); USGS Myths and Misconceptions',
  deep: 'Yeck et al. (2017), GRL, doi:10.1002/2016GL071685: unprecedented increase in the Oklahoma earthquake rate, largely considered the result of deep injection of waste fluids from oil and gas production',
  pump: 'USGS Myths and Misconceptions: disposal wells usually run longer and inject far more fluid than hydraulic fracturing; McGarr and Barbour (2017), GRL, doi:10.1002/2017GL075258: high-volume wastewater disposal',
  pressure: 'USGS Myths and Misconceptions: wells increase fluid pressure in the formation, which needs pathways to travel to faults; Barbour et al. (2017), SRL 88(4), doi:10.1785/0220170003: pore pressure and poroelastic stress on the fault',
  slip: 'McGarr and Barbour (2017); Chen et al. (2017), Sci. Rep., doi:10.1038/s41598-017-04992-z: interplay of injection, tectonic faults and foreshocks',
  pawnee: 'USGS ComCat us10006jxs: M 5.8 (mww), 2016-09-03 12:02:44 UTC, 14 km NW of Pawnee, Oklahoma, depth 5.6 km (checked 2026-11-03)',
  linked: 'McGarr and Barbour (2017): the sequence "appears to have been induced by high-volume wastewater disposal within 10 km"; Chen et al. (2017); Barbour et al. (2017); hedge in Yeck et al. (2017)',
  wrong: 'Editorial transition',
  drill: 'USGS Myths and Misconceptions: disposal, not drilling or hydraulic fracturing directly, drives most induced earthquakes in the central US; in Oklahoma only 1-2% can be tied to fracking',
  after: 'Wastewater disposal after production; USGS Myths and Misconceptions; Yeck et al. (2017)',
  end: 'Ellsworth (2013); USGS Myths and Misconceptions. On-screen caveat: most injection wells are not linked to felt earthquakes'
};

export const OIL_DRILLING: EpisodeMeta = {
  id: 'oil-drilling-cinematic', number: 102, compositionId: 'OilDrillingCinematic', title: 'We’re Triggering Earthquakes. And We Know How.', baseSeconds: 0, tailSeconds: 1.8, script: LINES
};

/** USGS ComCat us10006jxs (checked 2026-11-03; preferred magnitude unchanged at 5.8 mww). */
export const PAWNEE_EVENT = { id: 'us10006jxs', lon: -96.9291, lat: 36.4251, mag: 5.8, depthKm: 5.6 };
