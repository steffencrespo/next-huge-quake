/**
 * Claims and sources for Myth vs Fact experiment 06, "Will California Fall Into the Ocean?". Every narration line except the CTA must
 * cite a claim; a claim is only as strong as its USGS source. Reviewed by a human before any narration is generated
 * (docs/experiments/myth-fact-california.md).
 */
export const FAQ_URL = 'https://www.usgs.gov/faqs/will-california-eventually-fall-ocean';
export const FANTASY_URL = 'https://www.usgs.gov/programs/earthquake-hazards/earthquake-facts-earthquake-fantasy';

export type Claim = { id: string; claim: string; source: string[]; detail: string; lines: string[] };

export const CLAIMS: Claim[] = [
  { id: 'no', claim: 'California will not fall into the ocean or be swept out to sea.', source: [ FAQ_URL, FANTASY_URL ], detail: 'FAQ: "There is nowhere for California to fall." Fantasy page: "The ocean is not a great hole into which California can fall"; "absolutely impossible that California will be swept out to sea."', lines: [ 'hook', 'fact' ] },
  { id: 'plates', claim: 'The San Andreas Fault System is where (forms the boundary between) the Pacific and North American plates meet. The script does not say California lies on one plate.', source: [ FAQ_URL ], detail: 'FAQ: California sits on crust where two plates meet; the fault system forms the boundary.', lines: [ 'plates' ] },
  { id: 'sideways', claim: 'The two plates move horizontally, sliding past each other.', source: [ FAQ_URL ], detail: 'FAQ: "move horizontally, sliding past each other"; strike-slip earthquakes.', lines: [ 'slide' ] },
  { id: 'rate', claim: 'The Pacific Plate moves northwest relative to the North American Plate at about 46 mm per year (about two inches).', source: [ FAQ_URL, FANTASY_URL ], detail: 'Both pages give about 46 mm per year; the FAQ adds the fingernail comparison (used only on the on-screen card).', lines: [ 'rate' ] },
  { id: 'neighbors', claim: 'At this rate Los Angeles and San Francisco will be next-door neighbors in about 15 million years (a straight-line projection at the present rate, not a forecast of a specific event).', source: [ FANTASY_URL ], detail: 'Fantasy page: "At this rate, Los Angeles and San Francisco will one day (about 15 million years from now) be next-door neighbors." The FAQ gives no timeframe. "Moving in with" is a joke on this claim.', lines: [ 'fact2', 'punch' ] },
  { id: 'southwest', claim: 'Southwestern California is moving northward (horizontally).', source: [ FANTASY_URL ], detail: 'Fantasy page: "southwestern California is moving horizontally northward towards Alaska." Not stated for the whole state.', lines: [ 'how' ] }
];

/** Lines that carry no factual claim of their own. */
export const UNCLAIMED_LINES = [ 'cta' ];
