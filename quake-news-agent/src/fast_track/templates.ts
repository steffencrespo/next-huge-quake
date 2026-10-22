import { MONTHS, placeName, round } from '../workflows/quake_news/facts.js';
import type { QuakeFacts } from '../workflows/quake_news/types.js';
import type { PagerImpact } from './impact.js';

/**
 * Deterministic YouTube title, description and tags for a fast-track Short (no LLM). The text states USGS facts and
 * USGS model estimates only. It never says or implies that anyone was hurt or anything was damaged, and it does not
 * claim that impact reports were reviewed (nothing in the automated path reviews them).
 */
export type VideoText = { title: string; description: string; tags: string[] };

const COMPASS: Record<string, string> = {
  N: 'north', NNE: 'north-northeast', NE: 'northeast', ENE: 'east-northeast', E: 'east', ESE: 'east-southeast', SE: 'southeast',
  SSE: 'south-southeast', S: 'south', SSW: 'south-southwest', SW: 'southwest', WSW: 'west-southwest', W: 'west', WNW: 'west-northwest',
  NW: 'northwest', NNW: 'north-northwest'
};

const RELATIVE_PLACE = /^(\d+(?:\.\d+)?) km ([NSEW]{1,3}) of (.+)$/;

/** "191 km ENE of Nagqu, China" -> { near: "Nagqu, China", spoken: "191 km east-northeast of Nagqu, China" }. */
export function describePlace( place: string ): { near: string; spoken: string; country: string | null } {
  const clean = placeName( place );
  const match = RELATIVE_PLACE.exec( clean );
  const near = match ? match[3] : clean;
  const spoken = match && COMPASS[match[2]] ? `${match[1]} km ${COMPASS[match[2]]} of ${match[3]}` : clean;
  const last = near.includes( ',' ) ? near.split( ',' ).at( -1 )!.trim() : '';
  return { near, spoken, country: /^[A-Za-z][A-Za-z .'-]*$/.test( last ) ? last : null };
}

const capitalize = ( text: string ) => text.charAt( 0 ).toUpperCase() + text.slice( 1 );
const hashtag = ( text: string ) => `#${text.replace( /[^A-Za-z]/g, '' )}`;
const pad2 = ( n: number ) => String( n ).padStart( 2, '0' );

export function titleFor( facts: QuakeFacts ): string {
  const { near } = describePlace( facts.place );
  const where = RELATIVE_PLACE.test( placeName( facts.place ) ) ? `Near ${near}` : capitalize( near );
  return `M${facts.magnitude.toFixed( 1 )} Earthquake Strikes ${where}`.slice( 0, 100 );
}

function pagerParagraph( facts: QuakeFacts, impact: PagerImpact | null ): string {
  if ( !facts.pagerAlert || !impact ) {
    return 'USGS had not issued a PAGER alert for this earthquake when this video was published.';
  }
  const lines = [ `USGS issued ${facts.pagerAlert === 'orange' ? 'an' : 'a'} ${facts.pagerAlert} PAGER alert for this earthquake.` ];
  const { fatalityLevel: f, economicLevel: e } = impact;
  if ( f && e && f !== e ) {
    const [ driver, other, otherLevel ] = f === facts.pagerAlert ? [ 'fatalities', 'economic losses', e ] : [ 'economic losses', 'fatalities', f ];
    lines.push( `The ${facts.pagerAlert} level comes from the modeled estimate of ${driver}; the modeled estimate of ${other} is at the ${otherLevel} level.` );
  }
  lines.push( 'PAGER is a modeled estimate of potential impact, not a report of what actually happened.' );
  return lines.join( ' ' );
}

export function descriptionFor( facts: QuakeFacts, impact: PagerImpact | null ): string {
  const { spoken, country } = describePlace( facts.place );
  const t = new Date( facts.timeUtc );
  const when = `${MONTHS[t.getUTCMonth()]} ${t.getUTCDate()}, ${t.getUTCFullYear()} at ${pad2( t.getUTCHours() )}:${pad2( t.getUTCMinutes() )} UTC`;
  const depth = facts.depthKm === null ? '' : `, at a depth of ${round( facts.depthKm, 1 )} km`;
  const status = facts.status === 'reviewed' ?
    'The event data has been reviewed by USGS.' :
    'These are preliminary, automatic USGS values and may be revised.';
  const paragraphs = [
    `A magnitude ${facts.magnitude.toFixed( 1 )} earthquake struck ${spoken}, on ${when}${depth}, according to the U.S. Geological Survey (USGS). ${status}`,
    pagerParagraph( facts, impact ),
    ...( facts.tsunamiFlag ? [ 'The USGS record carries a tsunami flag for this event. That flag is a general indicator; it does not confirm that a tsunami occurred or that any warning was issued.' ] : [] ),
    'This video reports USGS data and USGS model estimates only, not confirmed reports from the affected area. Check official local sources for confirmed information.',
    `Magnitude is the USGS value${facts.magType ? ` (${capitalize( facts.magType )})` : ''}. Other agencies may publish different preliminary magnitudes for the same earthquake.`,
    `Official event page: ${facts.url}`,
    'Latest Earthquakes from Next Huge Quake. Subscribe for more. Facts are from USGS and may be updated as the data is reviewed.',
    [ '#Shorts', '#earthquake', ...( country ? [ hashtag( country ) ] : [] ), '#USGS' ].join( ' ' )
  ];
  return paragraphs.join( '\n\n' );
}

export function tagsFor( facts: QuakeFacts ): string[] {
  const { near, country } = describePlace( facts.place );
  const m = facts.magnitude.toFixed( 1 );
  const town = near.split( ',' )[0].trim();
  const tags = [
    'earthquake', 'earthquakes', ...( country ? [ `${country} earthquake` ] : [] ), `M${m} earthquake`, `magnitude ${m}`,
    ...( town && town !== country ? [ town ] : [] ), 'USGS', 'latest earthquakes', 'earthquake news', 'shorts'
  ];
  return [ ...new Set( tags ) ];
}

export function videoTextFor( facts: QuakeFacts, impact: PagerImpact | null ): VideoText {
  return { title: titleFor( facts ), description: descriptionFor( facts, impact ), tags: tagsFor( facts ) };
}

/** Publisher manifest id: lowercase place slug, magnitude and the event id, e.g. "nagqu-china-m70-us6000u43g". */
export function manifestIdFor( facts: QuakeFacts ): string {
  const slug = describePlace( facts.place ).near.normalize( 'NFD' ).replace( /[\u0300-\u036f]/g, '' ).toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-|-$/g, '' ).slice( 0, 40 ).replace( /-$/, '' );
  const id = facts.id.toLowerCase().replace( /[^a-z0-9]/g, '' );
  return `${slug || 'quake'}-m${Math.round( facts.magnitude * 10 )}-${id}`;
}
