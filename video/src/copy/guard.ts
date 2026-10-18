/**
 * A focused safeguard for the renderer's own copy templates. It is NOT a fact checker.
 *
 * Editorial validation stays in M1 (quake-news-agent validation.ts), and M2.4 owns the integration gate.
 * This guard only catches regressions in src/copy/ templates, with two checks:
 * 1. Number provenance: every number on screen must come from the event facts or a declared template constant.
 * 2. Banned phrases: a short list of assertions the USGS fields can never support (casualties, damage,
 *    aftershock forecasts, a tsunami or warning having happened). The fixed caveat sentences in caveats.ts, which
 *    name what the data does not establish, are exempt only when they appear verbatim.
 *
 * Limitations, by design:
 * - It does not interpret meaning. A sentence can pass both checks and still be misleading; the templates and
 *   their review are the real protection.
 * - It is built for fixed templates. It is not a validator for free-form or LLM-written text, which VideoSpec v1
 *   does not accept.
 * - Numbers written as words ("four hundred") are not detected, the same known gap as M1's fact check.
 */
import type { QuakeEvent } from '../spec/schema.js';
import { CAVEATS } from './caveats.js';
import { DEPTH_CLASS_BOUNDS_KM, formatClockUtc, formatCoordinates, formatDepthKm, formatDepthMiles, formatMagnitude } from './format.js';

/** Numbers the templates may print that are not event facts: the USGS depth-class bounds. */
const TEMPLATE_CONSTANTS = [ '0', ...Object.values( DEPTH_CLASS_BOUNDS_KM ).map( String ) ];

const BANNED: { label: string; pattern: RegExp }[] = [
  { label: 'casualty or damage claim', pattern: /\b(killed|kills|died|dead|deaths? toll|injured|injuries|casualties|victims|destroyed|destruction|collapsed?|damage[ds]?|evacuat\w*|rescue\w*|homeless|displaced|trapped)\b/i },
  { label: 'aftershock statement', pattern: /\baftershocks?\b/i },
  { label: 'tsunami occurrence claim', pattern: /\btsunami\b[^.!?]{0,30}\b(occurred|struck|hit|arrived|generated|triggered|observed|recorded|waves?)\b|\b(triggered|generated|caused|sparked)\b[^.!?]{0,15}\btsunami\b/i },
  { label: 'warning issued claim', pattern: /\bwarnings?\b[^.!?]{0,20}\b(issued|in effect|declared|lifted)\b|\b(issued|declared)\b[^.!?]{0,20}\bwarnings?\b/i }
];

const NUMBER = /\d+(?:,\d{3})*(?:\.\d+)?/g;

function dateTokens( iso: string | null ): string[] {
  if ( iso === null ) {
    return [];
  }
  const d = new Date( iso );
  const [ hh, mm ] = formatClockUtc( iso ).slice( 0, 5 ).split( ':' );
  return [ String( d.getUTCFullYear() ), String( d.getUTCDate() ), hh, mm ];
}

/** Every number token the copy may contain for this event. */
export function allowedNumbers( event: QuakeEvent ): Set<string> {
  const coordinates = formatCoordinates( event.latitude, event.longitude ).match( NUMBER ) ?? [];
  const depth = event.depthKm === null ? [] : [ formatDepthKm( event.depthKm ), formatDepthMiles( event.depthKm ) ].flatMap( s => s.match( NUMBER ) ?? [] );
  const idDigits = event.id.match( /\d+/g ) ?? [];
  return new Set( [
    formatMagnitude( event.magnitude ),
    ...depth,
    ...coordinates,
    ...dateTokens( event.timeUtc ),
    ...dateTokens( event.updatedUtc ),
    ...( event.feltReports === null ? [] : [ String( event.feltReports ), event.feltReports.toLocaleString( 'en-US' ) ] ),
    ...idDigits,
    // USGS place names carry a distance ("12 km WSW of ..."); it is shown verbatim, so it is an event fact.
    ...( event.place.match( NUMBER ) ?? [] ),
    ...TEMPLATE_CONSTANTS
  ] );
}

export type GuardIssue = { text: string; problem: string };

export function checkScreenText( texts: string[], event: QuakeEvent ): GuardIssue[] {
  const allowed = allowedNumbers( event );
  const issues: GuardIssue[] = [];
  for ( const text of texts ) {
    for ( const token of text.match( NUMBER ) ?? [] ) {
      if ( !allowed.has( token ) ) {
        issues.push( { text, problem: `number ${token} does not come from the event facts` } );
      }
    }
    const assertions = CAVEATS.reduce( ( rest, caveat ) => rest.split( caveat ).join( ' ' ), text );
    for ( const { label, pattern } of BANNED ) {
      if ( pattern.test( assertions ) ) {
        issues.push( { text, problem: label } );
      }
    }
  }
  return issues;
}

/** Throws when any string fails the guard. Used before rendering so a bad template fails the render, not the video. */
export function assertScreenText( texts: string[], event: QuakeEvent ): void {
  const issues = checkScreenText( texts, event );
  if ( issues.length > 0 ) {
    throw new Error( `Screen copy failed the guard:\n${issues.map( i => `- ${i.problem}: "${i.text}"` ).join( '\n' )}` );
  }
}
