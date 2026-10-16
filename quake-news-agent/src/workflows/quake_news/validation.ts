import { KM_PER_MILE, MONTHS, WEEKDAYS, round } from './facts.js';
import type { FactCheckReport, NewsDraft, QuakeFacts, Review, ValidationReport } from './types.js';

/**
 * Deterministic fact check for a generated draft.
 *
 * - contradictions: the draft states something that conflicts with the USGS facts
 * - unsupportedClaims: the draft states something the USGS facts do not contain
 * - missing: required content is absent
 * - shapeIssues: length / format constraints are violated
 *
 * Equivalent formats ("Jan. 1", "1 January 2024", "M7.5", "7.5-magnitude",
 * "10 kilometers", "6 miles") are accepted; only differing values are errors.
 */

export const ARTICLE_WORDS = { min: 90, max: 165 }; // target 100-150, with tolerance
export const NARRATION_WORDS = { min: 40, max: 80 }; // ~15-30 s at ~150 wpm
export const HEADLINE_MAX_CHARS = 100;
export const DEK_MAX_CHARS = 200;

const DAY_MS = 24 * 60 * 60 * 1000;
const NUM = String.raw`(\d+(?:\.\d+)?)`;
const MONTH_RE = String.raw`(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?`;
const ORD = String.raw`(?:st|nd|rd|th)?`;
const DEPTH_UNIT = String.raw`(km|kilomet(?:er|re)s?|mi|miles?)`;

const CASUALTY_DAMAGE_RE = /\b(losses|killed|kill(?:s|ing)?|deaths?|dead|died|fatalit(?:y|ies)|injur(?:y|ies|ed)|casualt(?:y|ies)|damage[ds]?|damaging|destroy(?:ed|s)?|destruction|collaps(?:e|ed|es|ing)|evacuat\w*|rescue\w*|missing|homeless|displaced|victims?|toll)\b/;
const AFTERSHOCK_FORECAST_RE = /\baftershocks?\b[^.!?]{0,40}\b(expected|likely|possible|could|may|might|forecast|will)\b|\b(expect(?:ed)?|forecast|warn(?:ed|s)? of)\b[^.!?]{0,20}\baftershocks?\b/;
const TSUNAMI_EVENT_RE = /\btsunami\b[^.!?]{0,25}\b(warning|warnings|alert|advisory|waves?)\b[^.!?]{0,25}\b(issued|generated|triggered|struck|hit|reported|observed|recorded|arrived|lifted)\b|\b(triggered|generated|caused|spawned|produced|sparked)\b[^.!?]{0,15}\btsunami\b/;
// "...this does not confirm that a tsunami occurred" is an accurate caveat, not an assertion.
const CONFIRMATION_CAVEAT_RE = /\b(?:does not|doesn't|do not|did not|not necessarily|not)\s+(?:confirm|mean|indicate|imply)\b/;
const PRELIMINARY_RE = /\b(preliminary|initial(?:ly)?|automatic|early estimate|subject to (?:change|revision)|may (?:be|change)|could (?:be|change)|revised|not yet (?:been )?reviewed)\b/;
const ENGLISH_STOPWORDS = new Set( [ 'the', 'a', 'an', 'of', 'in', 'and', 'to', 'was', 'is', 'at', 'on', 'by', 'its', 'about', 'with', 'from' ] );
const GENERIC_PLACE_WORDS = new Set( [
  'north', 'south', 'east', 'west', 'northern', 'southern', 'eastern', 'western', 'central', 'region', 'islands', 'island',
  'peninsula', 'coast', 'near', 'offshore', 'ridge', 'rise', 'earthquake', 'earthquakes', 'the', 'of', 'off', 'sea', 'ocean', 'border'
] );
const US_STATES: Record<string, string> = {
  AK: 'alaska', AL: 'alabama', AR: 'arkansas', AZ: 'arizona', CA: 'california', CO: 'colorado', CT: 'connecticut', DE: 'delaware',
  FL: 'florida', GA: 'georgia', HI: 'hawaii', IA: 'iowa', ID: 'idaho', IL: 'illinois', IN: 'indiana', KS: 'kansas', KY: 'kentucky',
  LA: 'louisiana', MA: 'massachusetts', MD: 'maryland', ME: 'maine', MI: 'michigan', MN: 'minnesota', MO: 'missouri', MS: 'mississippi',
  MT: 'montana', NC: 'north carolina', ND: 'north dakota', NE: 'nebraska', NH: 'new hampshire', NJ: 'new jersey', NM: 'new mexico',
  NV: 'nevada', NY: 'new york', OH: 'ohio', OK: 'oklahoma', OR: 'oregon', PA: 'pennsylvania', PR: 'puerto rico', RI: 'rhode island',
  SC: 'south carolina', SD: 'south dakota', TN: 'tennessee', TX: 'texas', UT: 'utah', VA: 'virginia', VT: 'vermont', WA: 'washington',
  WI: 'wisconsin', WV: 'west virginia', WY: 'wyoming'
};

type Span = [ number, number ];

/** Lowercase, strip accents, unify quotes/dashes/spaces so regexes see one form. */
export function normalizeText( text: string ): string {
  return text
    .normalize( 'NFD' ).replace( /[̀-ͯ]/g, '' )
    .replace( /[‘’]/g, '\'' )
    .replace( /[‐-―]/g, '-' )
    .replace( /[  ]/g, ' ' )
    .toLowerCase();
}

export function countWords( text: string ): number {
  return text.trim().split( /\s+/ ).filter( word => /[\p{L}\p{N}]/u.test( word ) ).length;
}

const sentenceAround = ( text: string, index: number ): string => {
  const start = Math.max( text.lastIndexOf( '. ', index ), text.lastIndexOf( '\n', index ), -1 ) + 1;
  const endCandidates = [ '. ', '\n', '! ', '? ' ].map( s => text.indexOf( s, index ) ).filter( i => i >= 0 );
  const end = endCandidates.length ? Math.min( ...endCandidates ) : text.length;
  return text.slice( start, end ).trim();
};

const near = ( a: number, b: number, tolerance: number ) => Math.abs( a - b ) <= tolerance + 1e-9;

const utcDay = ( date: Date ) => Date.UTC( date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() );

const monthIndex = ( token: string ) => MONTHS.findIndex( m => m.toLowerCase().startsWith( token.toLowerCase().slice( 0, 3 ) ) );

/** Location words a reader would recognise, e.g. "Noto", "Japan" from "2024 Noto Peninsula, Japan Earthquake". */
export function placeKeywords( place: string ): string[] {
  const words = new Set<string>();
  for ( const rawSegment of place.split( ',' ) ) {
    const segment = rawSegment.trim();
    const state = US_STATES[segment.toUpperCase()];
    if ( state ) {
      words.add( state );
      continue;
    }
    const cleaned = normalizeText( segment )
      .replace( /^\d{4}\s+/, '' )
      .replace( /\s+earthquakes?$/, '' )
      .replace( /^\d+(?:\.\d+)?\s*km\s+[nsew]{1,3}\s+of\s+/, '' );
    for ( const word of cleaned.split( /[^a-z']+/ ) ) {
      if ( word.length >= 3 && !GENERIC_PLACE_WORDS.has( word ) ) {
        words.add( word );
      }
    }
  }
  return [ ...words ];
}

type Check = { contradictions: string[]; unsupported: string[]; validatedSpans: Span[] };

function checkMagnitudes( text: string, facts: QuakeFacts, check: Check ): number {
  const patterns = [
    new RegExp( String.raw`\b(?:magnitude|mag\.?)(?:\s+of)?[\s-]*(?:mww?|ml|mb|ms)?\s*${NUM}`, 'g' ),
    new RegExp( String.raw`(?<![\w.])m(?:ww|wr|w|l|b|s|d)?\s?-?${NUM}`, 'g' ),
    new RegExp( String.raw`${NUM}[\s-]*(?:-?\s*)magnitude`, 'g' )
  ];
  const expected = round( facts.magnitude, 1 );
  let matches = 0;
  for ( const pattern of patterns ) {
    for ( const match of text.matchAll( pattern ) ) {
      const value = Number( match[1] );
      if ( value > 10 ) {
        continue; // not a magnitude (e.g. "M 2024")
      }
      matches += 1;
      check.validatedSpans.push( [ match.index!, match.index! + match[0].length ] );
      if ( !near( value, expected, 0.05 ) && !near( value, facts.magnitude, 0.001 ) ) {
        check.contradictions.push( `Magnitude ${value} contradicts USGS magnitude ${expected.toFixed( 1 )}: "${sentenceAround( text, match.index! )}"` );
      }
    }
  }
  return matches;
}

function checkDepths( text: string, facts: QuakeFacts, check: Check ) {
  const qualifier = String.raw`(?:about|approximately|around|roughly|nearly|some|just)\s+`;
  // "depth of 10 km", "10 km deep", "10 km (6 miles) below the surface", "10-kilometer depth"
  const depthBefore = new RegExp( String.raw`\b(?:depth|deep)\s+(?:of\s+)?(?:${qualifier})?(?:\d+(?:\.\d+)?\s*[a-z]+\s*\(\s*(?:${qualifier})?)?$` );
  const depthAfter = /^\s*(?:\([^)]*\)\s*)?(?:deep|depth|below|beneath|under(?:ground)?)\b/;
  const pattern = new RegExp( String.raw`${NUM}[\s-]*${DEPTH_UNIT}\b`, 'g' );
  for ( const match of text.matchAll( pattern ) ) {
    const start = match.index!;
    const end = start + match[0].length;
    const before = text.slice( Math.max( 0, start - 40 ), start );
    const after = text.slice( end, end + 40 );
    if ( !depthBefore.test( before ) && !depthAfter.test( after ) ) {
      continue; // a distance ("10 km SSW of ...") or other measurement, not the depth
    }
    const value = Number( match[1] );
    const isMiles = match[2].startsWith( 'mi' );
    check.validatedSpans.push( [ start, end ] );
    if ( facts.depthKm === null ) {
      check.unsupported.push( `Depth stated but USGS reports no depth: "${sentenceAround( text, start )}"` );
      continue;
    }
    const ok = isMiles ?
      near( value * KM_PER_MILE, facts.depthKm, KM_PER_MILE ) :
      near( value, facts.depthKm, 1 );
    if ( !ok ) {
      const expected = isMiles ? `${round( facts.depthKm / KM_PER_MILE, 1 )} miles` : `${round( facts.depthKm, 1 )} km`;
      check.contradictions.push( `Depth ${value} ${match[2]} contradicts USGS depth of ${expected}: "${sentenceAround( text, start )}"` );
    }
  }
}

/** Validates calendar dates, weekdays and UTC clock times. Returns how many date references were found. */
function checkDates( original: string, text: string, facts: QuakeFacts, check: Check ): number {
  const event = new Date( facts.timeUtc );
  const eventDay = utcDay( event );
  const updatedDay = facts.updatedUtc ? utcDay( new Date( facts.updatedUtc ) ) : null;
  let references = 0;

  const checkCalendarDate = ( index: number, length: number, month: number, day: number, year: number | null, label: string ) => {
    references += 1;
    check.validatedSpans.push( [ index, index + length ] );
    // Without an explicit year, use the year closest to the event (handles Dec 31 / Jan 1 local dates).
    const years = year === null ? [ event.getUTCFullYear() - 1, event.getUTCFullYear(), event.getUTCFullYear() + 1 ] : [ year ];
    const distance = ( reference: number ) => Math.min( ...years.map( y => Math.abs( Date.UTC( y, month, day ) - reference ) ) );
    const matchesOrigin = distance( eventDay ) <= DAY_MS; // allow +/-1 day for local-time dates
    const matchesUpdate = updatedDay !== null && distance( updatedDay ) === 0; // "as of the USGS update on ..."
    if ( !matchesOrigin && !matchesUpdate ) {
      check.contradictions.push( `Date "${label}" contradicts the USGS origin date ${event.toISOString().slice( 0, 10 )} (UTC)` );
    }
  };

  const monthDay = new RegExp( String.raw`\b${MONTH_RE}\s+(\d{1,2})${ORD}\b(?:,?\s+(\d{4}))?`, 'gi' );
  for ( const match of original.matchAll( monthDay ) ) {
    if ( match[1] === 'may' ) {
      continue; // the verb "may", not the month
    }
    checkCalendarDate( match.index!, match[0].length, monthIndex( match[1] ), Number( match[2] ), match[3] ? Number( match[3] ) : null, match[0] );
  }
  const dayMonth = new RegExp( String.raw`\b(\d{1,2})${ORD}\s+(?:of\s+)?${MONTH_RE}(?:,?\s+(\d{4}))?`, 'gi' );
  for ( const match of original.matchAll( dayMonth ) ) {
    if ( match[2] === 'may' ) {
      continue;
    }
    checkCalendarDate( match.index!, match[0].length, monthIndex( match[2] ), Number( match[1] ), match[3] ? Number( match[3] ) : null, match[0] );
  }
  for ( const match of text.matchAll( /\b(\d{4})-(\d{2})-(\d{2})\b/g ) ) {
    checkCalendarDate( match.index!, match[0].length, Number( match[2] ) - 1, Number( match[3] ), Number( match[1] ), match[0] );
  }

  const weekdayPattern = new RegExp( String.raw`\b(${WEEKDAYS.join( '|' ).toLowerCase()})\b`, 'g' );
  for ( const match of text.matchAll( weekdayPattern ) ) {
    references += 1;
    const stated = WEEKDAYS.findIndex( d => d.toLowerCase() === match[1] );
    const diff = ( stated - event.getUTCDay() + 7 ) % 7;
    if ( diff !== 0 && diff !== 1 && diff !== 6 ) {
      check.contradictions.push( `Weekday "${match[1]}" contradicts the USGS origin date (${WEEKDAYS[event.getUTCDay()]} UTC)` );
    }
  }

  const clock = /\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?\s*(utc|gmt|coordinated universal time)\b/g;
  for ( const match of text.matchAll( clock ) ) {
    check.validatedSpans.push( [ match.index!, match.index! + match[0].length ] );
    let hours = Number( match[1] ) % 12;
    if ( !match[3] ) {
      hours = Number( match[1] );
    } else if ( match[3].startsWith( 'p' ) ) {
      hours += 12;
    }
    const statedMinutes = hours * 60 + Number( match[2] );
    const actualMinutes = event.getUTCHours() * 60 + event.getUTCMinutes();
    if ( Math.abs( statedMinutes - actualMinutes ) > 1 ) {
      check.contradictions.push( `Time "${match[0]}" contradicts the USGS origin time ${event.toISOString().slice( 11, 16 )} UTC` );
    }
  }
  return references;
}

function checkAlertsAndTsunami( text: string, facts: QuakeFacts, check: Check ) {
  const alertPattern = /\b(green|yellow|orange|red)\b[^.!?]{0,25}\balert\b|\b(?:pager|alert)\b[^.!?]{0,25}\b(green|yellow|orange|red)\b/g;
  for ( const match of text.matchAll( alertPattern ) ) {
    const color = match[1] ?? match[2];
    if ( facts.pagerAlert === null ) {
      check.unsupported.push( `PAGER alert "${color}" stated but USGS issued no PAGER alert` );
    } else if ( color !== facts.pagerAlert ) {
      check.contradictions.push( `PAGER alert "${color}" contradicts USGS alert level "${facts.pagerAlert}"` );
    }
  }

  if ( /\btsunami/.test( text ) ) {
    if ( facts.tsunamiFlag !== true ) {
      check.unsupported.push( 'Mentions a tsunami, but the USGS tsunami flag is not set' );
    }
    const event = TSUNAMI_EVENT_RE.exec( text );
    if ( event && !CONFIRMATION_CAVEAT_RE.test( sentenceAround( text, event.index ) ) ) {
      check.unsupported.push( `Asserts a tsunami or tsunami warning, which USGS event data does not confirm: "${sentenceAround( text, event.index )}"` );
    }
  }
}

/** "Nearly 1,911" misstates an exact USGS count; "1,911 people" misstates what it counts. */
function checkCountQualifiers( text: string, facts: QuakeFacts, check: Check ) {
  if ( facts.feltReports === null ) {
    return;
  }
  const qualifier = /\b(nearly|almost|more than|over|about|around|approximately|roughly|some|at least|fewer than|less than|under|up to|close to)\s+(\d{1,3}(?:,\d{3})+|\d+)\b/g;
  for ( const match of text.matchAll( qualifier ) ) {
    if ( Number( match[2].replace( /,/g, '' ) ) === facts.feltReports ) {
      check.contradictions.push( `"${match[0]}" misstates the exact USGS count of ${facts.feltReports} felt reports` );
    }
  }
  // USGS "felt" counts submitted reports, not unique individuals.
  const asPeople = /\b(\d{1,3}(?:,\d{3})+|\d+)\s+(?:[a-z'-]+\s+){0,2}?(people|persons|individuals|residents|users|respondents|citizens)\b/g;
  for ( const match of text.matchAll( asPeople ) ) {
    if ( Number( match[1].replace( /,/g, '' ) ) === facts.feltReports ) {
      check.unsupported.push( `"${match[0]}" presents the USGS felt count as people; it counts submitted reports` );
    }
  }
}

// "PAGER", "alert", or a follow-up sentence naming the color ("The orange level/designation ...")
const PAGER_CONTEXT_RE = /\b(pager|alert|green|yellow|orange|red)\b/;
const PAGER_HEDGE_RE = /\b(estimat\w*|model(?:s|ed|ing)?|potential|projected)\b/;
// Explaining the selection rule ("whichever is higher between fatalities and losses") is accurate.
const HIGHER_OF_RE = /\b(whichever is higher|whichever is greater|the higher of|higher of the two)\b/;
const BOTH_IMPACTS_RE = /\b(casualt(?:y|ies)|fatalit(?:y|ies)|deaths)\b[^.!?]{0,30}\band\b[^.!?]{0,30}\b(damage|losses)\b|\b(damage|losses)\b[^.!?]{0,30}\band\b[^.!?]{0,30}\b(casualt(?:y|ies)|fatalit(?:y|ies)|deaths)\b/;

function checkUnsupportedImpact( text: string, facts: QuakeFacts, check: Check ) {
  const seen = new Set<string>();
  for ( const match of text.matchAll( new RegExp( CASUALTY_DAMAGE_RE, 'g' ) ) ) {
    const sentence = sentenceAround( text, match.index! );
    if ( seen.has( sentence ) ) {
      continue;
    }
    seen.add( sentence );
    // Impact language is only supported when it describes the USGS PAGER model estimate.
    const describesPager = facts.pagerAlert !== null && PAGER_CONTEXT_RE.test( sentence );
    if ( !describesPager ) {
      check.unsupported.push( `Impact claim ("${match[1]}") not supported by USGS data: "${sentence}"` );
    } else if ( !PAGER_HEDGE_RE.test( sentence ) ) {
      check.unsupported.push( `PAGER impact stated as an outcome; describe it as a model estimate: "${sentence}"` );
    } else if ( BOTH_IMPACTS_RE.test( sentence ) && !HIGHER_OF_RE.test( sentence ) ) {
      check.unsupported.push(
        `PAGER level reflects estimated fatalities OR economic losses (whichever is higher), not both: "${sentence}"`
      );
    }
  }
  const forecast = AFTERSHOCK_FORECAST_RE.exec( text );
  if ( forecast ) {
    check.unsupported.push( `Aftershock forecast not supported by USGS event data: "${sentenceAround( text, forecast.index )}"` );
  }
}

/** Every number in the draft must trace back to a fact (magnitude, depth, coordinates, date/time, felt reports, place). */
function allowedNumbers( facts: QuakeFacts ): number[] {
  const values: number[] = [ facts.magnitude, round( facts.magnitude, 1 ) ];
  if ( facts.depthKm !== null ) {
    const miles = facts.depthKm / KM_PER_MILE;
    values.push( facts.depthKm, round( facts.depthKm, 0 ), round( facts.depthKm, 1 ), round( miles, 0 ), round( miles, 1 ) );
  }
  for ( const coordinate of [ facts.latitude, facts.longitude ] ) {
    const abs = Math.abs( coordinate );
    values.push( abs, round( abs, 0 ), round( abs, 1 ), round( abs, 2 ) );
  }
  if ( facts.feltReports !== null ) {
    values.push( facts.feltReports );
  }
  for ( const match of facts.place.matchAll( /\d+(?:\.\d+)?/g ) ) {
    values.push( Number( match[0] ) );
  }
  const event = new Date( facts.timeUtc );
  for ( const offset of [ -1, 0, 1 ] ) {
    const day = new Date( event.getTime() + offset * DAY_MS );
    values.push( day.getUTCDate(), day.getUTCFullYear(), day.getUTCMonth() + 1 );
  }
  values.push( event.getUTCHours(), event.getUTCHours() % 12 || 12, event.getUTCMinutes() );
  if ( facts.updatedUtc ) {
    const updated = new Date( facts.updatedUtc );
    values.push( updated.getUTCDate(), updated.getUTCFullYear(), updated.getUTCMonth() + 1 );
  }
  return values;
}

function checkUntracedNumbers( text: string, facts: QuakeFacts, check: Check ) {
  const allowed = allowedNumbers( facts );
  const inValidatedSpan = ( index: number ) => check.validatedSpans.some( ( [ s, e ] ) => index >= s && index < e );
  const untraced = new Set<string>();
  for ( const match of text.matchAll( /(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.])\d+(?:\.\d+)?/g ) ) {
    if ( inValidatedSpan( match.index! ) ) {
      continue;
    }
    const value = Number( match[0].replace( /,/g, '' ) );
    if ( !allowed.some( a => near( a, value, 1e-6 ) ) ) {
      untraced.add( match[0] );
    }
  }
  for ( const value of untraced ) {
    check.unsupported.push( `Number "${value}" cannot be traced to the USGS facts` );
  }
}

export function checkDraft( facts: QuakeFacts, draft: NewsDraft ): FactCheckReport {
  const missing: string[] = [];
  const shapeIssues: string[] = [];
  const contradictions = new Set<string>();
  const unsupported = new Set<string>();

  const fields: Array<[ keyof NewsDraft, string ]> = [
    [ 'headline', draft.headline ], [ 'dek', draft.dek ], [ 'article', draft.article ], [ 'narration', draft.narration ]
  ];
  const magnitudeMentions: Record<string, number> = {};
  const dateReferences: Record<string, number> = {};
  for ( const [ name, value ] of fields ) {
    const original = value.normalize( 'NFD' ).replace( /[̀-ͯ]/g, '' );
    const text = normalizeText( value );
    const check: Check = { contradictions: [], unsupported: [], validatedSpans: [] };
    magnitudeMentions[name] = checkMagnitudes( text, facts, check );
    checkDepths( text, facts, check );
    dateReferences[name] = checkDates( original, text, facts, check );
    checkAlertsAndTsunami( text, facts, check );
    checkCountQualifiers( text, facts, check );
    checkUnsupportedImpact( text, facts, check );
    checkUntracedNumbers( text, facts, check );
    check.contradictions.forEach( c => contradictions.add( `[${name}] ${c}` ) );
    check.unsupported.forEach( u => unsupported.add( `[${name}] ${u}` ) );
  }

  const article = normalizeText( draft.article );
  const narration = normalizeText( draft.narration );
  const keywords = placeKeywords( facts.place );
  const mentionsPlace = ( text: string ) =>
    keywords.length === 0 || keywords.some( k => new RegExp( String.raw`\b${k}\b` ).test( text ) );

  if ( magnitudeMentions.article === 0 ) {
    missing.push( 'Article does not state the magnitude' );
  }
  if ( magnitudeMentions.narration === 0 ) {
    missing.push( 'Narration does not state the magnitude' );
  }
  if ( !mentionsPlace( article ) ) {
    missing.push( `Article does not name the location (expected one of: ${keywords.join( ', ' )})` );
  }
  if ( !mentionsPlace( narration ) ) {
    missing.push( `Narration does not name the location (expected one of: ${keywords.join( ', ' )})` );
  }
  if ( dateReferences.article === 0 ) {
    missing.push( 'Article does not state when the earthquake occurred' );
  }
  if ( !/\b(usgs|u\.s\. geological survey|united states geological survey)\b/.test( article ) ) {
    missing.push( 'Article does not attribute the data to the USGS' );
  }
  if ( facts.status !== 'reviewed' && !PRELIMINARY_RE.test( article ) ) {
    missing.push( `USGS status is "${facts.status}", but the article does not say the data is preliminary` );
  }

  const articleWords = countWords( draft.article );
  const narrationWords = countWords( draft.narration );
  if ( draft.headline.trim() === '' || draft.headline.length > HEADLINE_MAX_CHARS ) {
    shapeIssues.push( `Headline must be 1-${HEADLINE_MAX_CHARS} characters (got ${draft.headline.length})` );
  }
  if ( draft.dek.trim() === '' || draft.dek.length > DEK_MAX_CHARS ) {
    shapeIssues.push( `Dek must be 1-${DEK_MAX_CHARS} characters (got ${draft.dek.length})` );
  }
  if ( articleWords < ARTICLE_WORDS.min || articleWords > ARTICLE_WORDS.max ) {
    shapeIssues.push( `Article should be about 100-150 words (got ${articleWords})` );
  }
  if ( narrationWords < NARRATION_WORDS.min || narrationWords > NARRATION_WORDS.max ) {
    shapeIssues.push( `Narration should be ${NARRATION_WORDS.min}-${NARRATION_WORDS.max} words for 15-30 seconds (got ${narrationWords})` );
  }
  if ( /https?:\/\/|www\.|[#*_`]/.test( draft.narration ) ) {
    shapeIssues.push( 'Narration contains URLs or markup that cannot be spoken' );
  }
  const words = article.split( /[^a-z']+/ ).filter( Boolean );
  const stopwordShare = words.filter( w => ENGLISH_STOPWORDS.has( w ) ).length / Math.max( words.length, 1 );
  if ( stopwordShare < 0.08 ) {
    shapeIssues.push( 'Article does not appear to be written in English' );
  }

  const report = {
    contradictions: [ ...contradictions ],
    unsupportedClaims: [ ...unsupported ],
    missing,
    shapeIssues
  };
  return {
    passed: Object.values( report ).every( list => list.length === 0 ),
    ...report,
    wordCounts: { article: articleWords, narration: narrationWords }
  };
}

/** The deterministic fact check is a hard gate: a passing LLM review can never override it. */
export function combineValidation( factCheck: FactCheckReport, review: Review ): ValidationReport {
  return {
    passed: factCheck.passed && review.passed,
    factCheck,
    review
  };
}

export function revisionFeedback( validation: ValidationReport ): string[] {
  const { factCheck, review } = validation;
  return [
    ...factCheck.contradictions.map( c => `Factual contradiction: ${c}` ),
    ...factCheck.unsupportedClaims.map( u => `Unsupported claim (remove it): ${u}` ),
    ...factCheck.missing.map( m => `Missing: ${m}` ),
    ...factCheck.shapeIssues.map( s => `Format: ${s}` ),
    ...( review.passed ? [] : review.feedback.map( f => `Editor: ${f}` ) )
  ];
}
