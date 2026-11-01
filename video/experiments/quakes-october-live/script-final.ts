/** Narration and on-screen labels for the FINAL landscape October 2026 loop, built from data-final.json (USGS, M>=5.0, no local magnitude filter).
 * Every count, label and spoken number is derived here from the snapshot; nothing is typed by hand. */
import data from './data-final.json' with { type: 'json' };
import { REST, summarize } from './regions.js';
import type { Quake } from './regions.js';
import type { EpisodeMeta } from '../../src/edu/episodes.js';
import type { ScriptLine } from '../../src/edu/narration.js';

export type FinalQuake = Quake & { magType: string; ids: string[] };
export const EVENTS = ( data.events as FinalQuake[] ).sort( ( a, b ) => a.time.localeCompare( b.time ) || a.id.localeCompare( b.id ) );
if ( new Set( EVENTS.map( e => e.id ) ).size !== EVENTS.length ) throw new Error( 'duplicate event ids' );
if ( EVENTS.some( e => e.mag < 5 ) ) throw new Error( 'event below the query minimum' );
export const TOTAL = EVENTS.length;
export const RETRIEVED = data.retrievedAt;
export const WINDOW = { start: data.startUtc, endExclusive: data.endUtcExclusive, full: data.coverage === 'full-month' };
export const SPAN_MS = Date.parse( WINDOW.endExclusive ) - Date.parse( WINDOW.start );

/** Magnitude bins on the official magnitudes. */
export const BINS = [ { label: 'M5.0–5.9', n: EVENTS.filter( e => e.mag < 6 ).length }, { label: 'M6.0–6.9', n: EVENTS.filter( e => e.mag >= 6 && e.mag < 7 ).length }, { label: 'M7.0+', n: EVENTS.filter( e => e.mag >= 7 ).length } ];
export const M6 = EVENTS.filter( e => e.mag >= 6 ).length;
export const M7 = EVENTS.filter( e => e.mag >= 7 ).length;
if ( BINS.reduce( ( n, b ) => n + b.n, 0 ) !== TOTAL ) throw new Error( 'magnitude bins do not reconcile' );

const byStrength = [ ...EVENTS ].sort( ( a, b ) => b.mag - a.mag || a.time.localeCompare( b.time ) || a.id.localeCompare( b.id ) );
/** The three strongest, extended to include anything tied with the third. */
export const STRONGEST = byStrength.filter( e => e.mag >= byStrength[2].mag );
if ( STRONGEST.length > 4 ) throw new Error( `${STRONGEST.length} events tie for the top three; reword the strongest section` );
export const LARGEST = STRONGEST[0];
if ( STRONGEST[1].mag === LARGEST.mag ) throw new Error( 'largest magnitude is tied; reword' );

/** Deep earthquakes: hypocenter 300 km or deeper (USGS depth). */
export const DEEP_KM = 300;
export const DEEP = EVENTS.filter( e => e.depth >= DEEP_KM );
export const DEEP_LARGEST = [ ...DEEP ].sort( ( a, b ) => b.mag - a.mag || a.time.localeCompare( b.time ) )[0];

const ONES = [ 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen' ];
const TENS = [ '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety' ];
export const words = ( n: number ): string => n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor( n / 10 )] + ( n % 10 ? `-${ONES[n % 10]}` : '' ) : `${ONES[Math.floor( n / 100 )]} hundred${n % 100 ? ` ${words( n % 100 )}` : ''}`;
const ORD = [ '', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth' ];
const ordinal = ( d: number ) => d <= 20 ? ORD[d] : d < 30 ? `twenty-${ORD[d - 20]}` : d === 30 ? 'thirtieth' : 'thirty-first';
const cap = ( s: string ) => s[0].toUpperCase() + s.slice( 1 );

export const ALL_ROWS = summarize( EVENTS );
/** Featured regions: the 5 most active named regions (never the catch-all). */
export const FEATURED = ALL_ROWS.filter( r => r.name !== REST && r.box ).slice( 0, 5 ) as ( typeof ALL_ROWS[number] & { box: NonNullable<typeof ALL_ROWS[number]['box']> } )[];
export const OTHER = TOTAL - FEATURED.reduce( ( n, r ) => n + r.count, 0 );
if ( FEATURED[0].count === FEATURED[1].count ) throw new Error( 'top two regions tie; reword the lead line' );

const spoken: Record<string, string> = {
  'China–Central Asia region': 'the China and Central Asia region',
  'Vanuatu region': 'the Vanuatu region',
  'Indonesia region': 'the Indonesia region',
  'Fiji–Tonga region': 'the Fiji and Tonga region',
  'Central America': 'Central America',
  'Japan–Kuril–Kamchatka': 'the Japan, Kuril and Kamchatka region',
  'Papua New Guinea region': 'the Papua New Guinea region',
  'Alaska and the Aleutians': 'Alaska and the Aleutians',
  'South America': 'South America',
  'Philippines and Taiwan': 'the Philippines and Taiwan'
};
const lead = [ 'The most active area was {r}, with {n} earthquakes.', '{R} recorded {n}.', '{R} had {n}.', '{R} had {n}.', 'And {r}, {n}.' ];

/** "12 km WSW of Pitaloza Arriba, Panama" -> "Pitaloza Arriba, Panama". Place names stay exactly as USGS reports them. */
export const placeOf = ( e: Quake ) => e.place.replace( /^\d+ km [NSEW]+ of /, '' );
const near = ( e: Quake ) => ( /^\d+ km [NSEW]+ of /.test( e.place ) ? `near ${placeOf( e )}` : `in the ${e.place}` );
const day = ( e: Quake ) => Number( e.time.slice( 8, 10 ) );
const MON = [ 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC' ];
export const dateLabel = ( iso: string ) => `${MON[Number( iso.slice( 5, 7 ) ) - 1]} ${Number( iso.slice( 8, 10 ) )}, ${iso.slice( 0, 4 )}`;
const spokenMag = ( m: number ) => `${ONES[Math.floor( m )]} point ${ONES[Math.round( ( m * 10 ) % 10 )]}`;

/** Coverage label straight from the query window. */
const lastIncluded = new Date( Date.parse( WINDOW.endExclusive ) - 1 );
export const COVERAGE = WINDOW.full ? 'OCTOBER 1–31, 2026 · UTC' : `OCT 1 – OCT ${lastIncluded.getUTCDate()}, ${WINDOW.endExclusive.slice( 11, 16 )} UTC · MONTH-TO-DATE`;
export const COVERAGE_SHORT = WINDOW.full ? 'OCT 1–31, 2026 UTC' : `OCT 1–${lastIncluded.getUTCDate()} ${WINDOW.endExclusive.slice( 11, 16 )} UTC (MONTH-TO-DATE)`;
export const MAG_LABEL = 'MAGNITUDE 5.0 OR GREATER';
export const RETRIEVED_LABEL = `USGS CATALOG, RETRIEVED ${dateLabel( RETRIEVED )} ${RETRIEVED.slice( 11, 16 )} UTC`;
const period = WINDOW.full ? 'October twenty twenty-six' : 'October twenty twenty-six so far';

const rankLine = ( e: FinalQuake, i: number ) => {
  const tiedPrev = i > 0 && STRONGEST[i - 1].mag === e.mag;
  const head = i === 0 ? `The strongest was magnitude ${spokenMag( e.mag )}` : tiedPrev ? `And another ${spokenMag( e.mag )}` : i === 1 ? `Next, magnitude ${spokenMag( e.mag )}` : `Then magnitude ${spokenMag( e.mag )}`;
  return `${head}, ${near( e )}, on October ${ordinal( day( e ) )}.`;
};

/** `start` is the storyboard start (seconds); placeClips pushes a line back when the previous one runs over. */
export const LINES: ScriptLine[] = [
  { id: 'hook', start: 1.0, text: `${period}: ${words( TOTAL )} earthquakes of magnitude five or greater, worldwide.` },
  { id: 'dots', start: 9.6, text: 'This is a historical record. Each red dot marks one epicenter.' },
  { id: 'b0', start: 15.2, text: 'Watch them appear, day by day.' },
  ...FEATURED.map( ( r, i ) => ( { id: `r${i}`, start: [ 33, 39.5, 44, 48.5, 53.5 ][i], text: lead[i].replace( '{r}', spoken[r.name] ).replace( '{R}', cap( spoken[r.name] ) ).replace( '{n}', words( r.count ) ) } ) ),
  { id: 'rest', start: 58.5, text: `The other ${words( OTHER )} were spread across the rest of the world.` },
  { id: 'plate', start: 64.5, text: 'Most cluster along the boundaries of tectonic plates.' },
  ...STRONGEST.map( ( e, i ) => ( { id: `c${i}`, start: 70 + i * 7.2, text: rankLine( e, i ) } ) ),
  { id: 'deep', start: 70 + STRONGEST.length * 7.2 + 0.6, text: `${cap( words( DEEP.length ) )} were at least three hundred kilometers deep, the largest magnitude ${spokenMag( DEEP_LARGEST.mag )}.` },
  { id: 's0', start: 70 + STRONGEST.length * 7.2 + 9, text: `In all, ${words( M6 )} reached magnitude six or greater, and ${M7 ? words( M7 ) : 'none'} reached seven or greater.` }
];

export const QUAKES_OCTOBER_FINAL: EpisodeMeta = { id: 'quakes-october-live-final', number: 98, compositionId: 'QuakesOctoberFinal', title: 'Earthquakes in October 2026', baseSeconds: 0, tailSeconds: 4.0, script: LINES };
