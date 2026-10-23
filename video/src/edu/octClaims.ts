/**
 * Claims and sources for the October 26, 28 and 30 Shorts (ep07 magnitude 10, ep08 six seven vs four two, ep09 aftershocks).
 * Every narration line except the CTA must cite a claim. Pages were read on 2026-10-22; see docs/experiments/oct-26-28-30-shorts.md.
 */
export type Claim = { id: string; claim: string; source: string[]; detail: string; lines: string[] };

export const MEGAQUAKE_URL = 'https://www.usgs.gov/faqs/can-megaquakes-really-happen-a-magnitude-10-or-larger';
export const ENERGY_URL = 'https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity';
export const FORESHOCK_URL = 'https://www.usgs.gov/faqs/foreshocks-aftershocks-whats-difference';
export const SWARM_URL = 'https://www.usgs.gov/faqs/what-difference-between-aftershocks-and-swarms';

export const MAG10_CLAIMS: Claim[] = [
  { id: 'record', claim: 'The largest recorded earthquake was magnitude 9.5 in Chile on May 22, 1960.', source: [ MEGAQUAKE_URL ], detail: 'FAQ: "a magnitude 9.5 on May 22, 1960 in Chile."', lines: [ 'hook', 'chile' ] },
  { id: 'length', claim: 'An earthquake’s magnitude is related to the length of its fault: the longer the fault, the larger the earthquake.', source: [ MEGAQUAKE_URL ], detail: 'FAQ: "the longer the fault, the larger the earthquake."', lines: [ 'size' ] },
  { id: 'chile', claim: 'The 1960 Chile earthquake occurred on a fault almost 1,000 miles long.', source: [ MEGAQUAKE_URL ], detail: 'FAQ: "a fault that is almost 1,000 miles long."', lines: [ 'chile' ] },
  { id: 'needed', claim: 'A fault long enough for a magnitude 10 would extend around most of the planet, and none that long is known to exist.', source: [ MEGAQUAKE_URL ], detail: 'FAQ: "No fault long enough to generate a magnitude 10 earthquake is known to exist"; such a fault "would extend around most of the planet."', lines: [ 'need', 'none' ] },
  { id: 'expect', claim: 'Scientists do not expect a magnitude 10. The script deliberately does not call it impossible.', source: [ MEGAQUAKE_URL ], detail: 'The FAQ states flatly that magnitude 10 "cannot happen"; other USGS pages call it theoretically possible but very highly unlikely. "Isn’t something scientists expect" is consistent with both.', lines: [ 'short', 'so' ] },
  { id: 'tie', claim: 'Editorial link to the Chile 1960 Historic episode scheduled for 2026-10-27.', source: [ MEGAQUAKE_URL ], detail: 'No new fact. Wording is time-relative ("tomorrow"); it is only correct if this Short publishes on 10-26 and Chile 1960 on 10-27.', lines: [ 'tie' ] }
];

export const VERSUS_CLAIMS: Claim[] = [
  { id: 'ratio', claim: 'Magnitude 6.7 releases about 5,600 times the seismic energy of magnitude 4.2 (2.5 magnitude units apart, 10^(1.5 x 2.5) = 5,623).', source: [ ENERGY_URL ], detail: 'USGS: each whole-number magnitude step is "32 times more energy release" (10^1.5). The USGS rough formula log E = 5.24 + 1.44 Mw gives about 4,000 for the same gap, so the figure is approximate; the script says "about".', lines: [ 'ratio', 'match' ] },
  { id: 'steps', claim: '6.7 and 4.2 are two and a half magnitude units apart.', source: [ ENERGY_URL ], detail: 'Arithmetic.', lines: [ 'end' ] },
  { id: 'meme', claim: 'The six seven / four two opening is wordplay on magnitude numbers, not a claim about any event.', source: [ ENERGY_URL ], detail: 'No factual claim.', lines: [ 'hook', 'which' ] }
];

export const AFTERSHOCK_CLAIMS: Claim[] = [
  { id: 'readjust', claim: 'Aftershocks are minor readjustments along the portion of a fault that slipped at the time of the mainshock.', source: [ FORESHOCK_URL ], detail: 'FAQ: "minor readjustments along the portion of a fault that slipped at the time of the mainshock."', lines: [ 'why' ] },
  { id: 'define', claim: 'Aftershocks are smaller earthquakes in the same general area following a larger event, the mainshock.', source: [ FORESHOCK_URL ], detail: 'FAQ: "smaller earthquakes that occur in the same general area during the days to years following a larger event."', lines: [ 'hook', 'same' ] },
  { id: 'decline', claim: 'The frequency of aftershocks decreases with time.', source: [ FORESHOCK_URL ], detail: 'FAQ: "The frequency of these aftershocks decreases with time."', lines: [ 'fade' ] },
  { id: 'duration', claim: 'Aftershocks can continue over weeks, months or years.', source: [ FORESHOCK_URL ], detail: 'FAQ: "weeks, months, or years." The script limits this to big earthquakes ("after a big earthquake"); the page’s Haiti example supports it.', lines: [ 'long' ] },
  { id: 'danger', claim: 'Aftershocks can compound the impacts of a major earthquake. The "especially buildings already weakened" wording follows USGS aftershock guidance.', source: [ FORESHOCK_URL ], detail: 'FAQ: aftershocks "can compound the impacts of a major earthquake." The weakened-buildings wording was seen in USGS search summaries, not on the fetched page: attention item.', lines: [ 'danger' ] },
  { id: 'notall', claim: 'Aftershocks occur near the fault zone of the mainshock and follow it; a later earthquake elsewhere or without a larger preceding one is not an aftershock.', source: [ SWARM_URL ], detail: 'USGS: "Aftershocks occur near the fault zone where the mainshock rupture occurred" (within 1-2 fault lengths); swarms have "no identifiable mainshock."', lines: [ 'notall' ] },
  { id: 'safety', claim: 'Drop, cover and hold on is the recommended action when shaking occurs.', source: [ FORESHOCK_URL ], detail: 'Standard USGS/ShakeOut guidance, already used in the kids Short; no new claim.', lines: [ 'end' ] }
];

/** Lines that carry no factual claim of their own. */
export const UNCLAIMED_LINES = [ 'cta' ];
