/**
 * Claims and sources for Episode 10, "Where Will the Next Big One Hit?" (YouTube title). Every narration line except the CTA cites a
 * claim; sources are USGS only. The ~74% Bay Area update (SF Chronicle, Sept 2026, citing USGS's Kevin Milner) has no primary technical
 * publication yet, so it is NOT used anywhere in the video, captions or description.
 */
export const BAY_2014 = 'https://pubs.usgs.gov/publication/fs20163020';
export const PNW_2025 = 'https://pubs.usgs.gov/publication/fs20253050';

export type Claim = { id: string; claim: string; source: string[]; detail: string; lines: string[] };

export const CLAIMS: Claim[] = [
  { id: 'two', claim: 'The Bay Area fault system and the Cascadia Subduction Zone are two major West Coast earthquake sources, and whether both could have major earthquakes close together in time is posed only as a hypothetical question (editorial framing, not a forecast).', source: [ BAY_2014, PNW_2025 ], detail: 'The wording "Could two massive earthquakes strike ... close together in time?" is a question. "Massive" is editorial for the M6.7+ and approximately M9 scenarios the two USGS products discuss.', lines: [ 'hook', 'two', 'end' ] },
  { id: 'bayfaults', claim: 'The Bay Area probability covers the whole regional fault system, not the San Andreas alone.', source: [ BAY_2014 ], detail: 'The USGS outlook states the figure includes the major plate-boundary faults (San Andreas, Hayward-Rodgers Creek, Calaveras and others), lesser-known faults and unknown faults.', lines: [ 'bay' ] },
  { id: 'csz', claim: 'The Cascadia Subduction Zone is the Pacific Northwest megathrust fault (the narration introduces it as the second region).', source: [ PNW_2025 ], detail: 'The USGS 2025 fact sheet covers the Cascadia Subduction Zone as one of three Pacific Northwest earthquake types.', lines: [ 'north' ] },
  { id: 'bayprob', claim: 'The USGS Earthquake Outlook for the San Francisco Bay Region 2014-2043 put the chance of at least one M6.7 or larger earthquake in the region at 72%. Narration says "over seventy percent"; the card says 72%. The 30-year window is 2014-2043, not a new window starting today.', source: [ BAY_2014 ], detail: 'Reference period 2014-2043 is stated in the narration ("A USGS outlook covers twenty fourteen to twenty forty-three") and on the card ("USGS 2014-2043 outlook"). A later ~74% update is deliberately omitted until a primary USGS publication exists.', lines: [ 'bayperiod', 'baystat' ] },
  { id: 'cascadia', claim: 'The USGS 2025 Pacific Northwest fact sheet gives a 10-15% chance of an approximately M9 earthquake on the Cascadia Subduction Zone in the next 50 years (50 years from the 2025 fact sheet).', source: [ PNW_2025 ], detail: 'Confirmed against the fact sheet by the project owner.', lines: [ 'casstat' ] },
  { id: 'last', claim: 'The last great Cascadia earthquake occurred on January 26, 1700, estimated M8.7-9.2; narration says "around magnitude nine, struck in seventeen hundred".', source: [ PNW_2025 ], detail: 'Confirmed against the fact sheet by the project owner.', lines: [ 'cas' ] },
  { id: 'nocompare', claim: 'The two probabilities cover different faults, magnitudes and time windows (2014-2043 vs the next 50 years) and are not directly comparable.', source: [ BAY_2014, PNW_2025 ], detail: 'Guardrail: never rank the two as equivalent risks.', lines: [ 'notsame' ] },
  { id: 'both', claim: 'No joint probability for both regions having major earthquakes close together is stated in these USGS products; the scenario is a hypothetical question, not a forecast. No claim is made that a Cascadia rupture would trigger a San Andreas earthquake.', source: [ BAY_2014, PNW_2025 ], detail: 'Editorial absence claim: "No official forecast says so" means no forecast in the cited USGS material. Remote triggering is not mentioned in the video.', lines: [ 'both', 'answer' ] },
  { id: 'nopredict', claim: 'Scientists cannot predict the timing of earthquakes; probabilities are forecasts, not predictions.', source: [ 'https://www.usgs.gov/faqs/can-you-predict-earthquakes' ], detail: 'Same USGS position used in Episode 02 ("Why Can\'t We Predict Earthquakes?").', lines: [ 'end' ] }
];

/** Lines that carry no factual claim of their own. */
export const UNCLAIMED_LINES = [ 'cta' ];
