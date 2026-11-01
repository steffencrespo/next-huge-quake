/** Narration script and timeline meta for the October 2026 M5+ live-loop video, built from the cached USGS dataset (data.json). Counts are never typed by hand. */
import data from './data.json' with { type: 'json' };
import { REST, summarize } from './regions.js';
import type { Quake } from './regions.js';
import type { EpisodeMeta } from '../../src/edu/episodes.js';
import type { ScriptLine } from '../../src/edu/narration.js';

export const EVENTS = ( data.events as Quake[] ).filter( e => e.mag > 5.0 ).sort( ( a, b ) => a.time.localeCompare( b.time ) || a.id.localeCompare( b.id ) );
export const TOTAL = EVENTS.length;
export const M6 = EVENTS.filter( e => e.mag >= 6 ).length;
export const M7 = EVENTS.filter( e => e.mag >= 7 ).length;
/** Strongest first; ties on magnitude go to the earlier event, then the smaller id. */
export const STRONGEST = [ ...EVENTS ].sort( ( a, b ) => b.mag - a.mag || a.time.localeCompare( b.time ) || a.id.localeCompare( b.id ) ).slice( 0, 3 );
export const LARGEST = STRONGEST[0];
export const WINDOW = { start: data.startUtc, endExclusive: data.endUtcExclusive };

const ONES = [ 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen' ];
const TENS = [ '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety' ];
export const words = ( n: number ): string => n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor( n / 10 )] + ( n % 10 ? `-${ONES[n % 10]}` : '' ) : `${ONES[Math.floor( n / 100 )]} hundred${n % 100 ? ` ${words( n % 100 )}` : ''}`;
const ORD: Record<number, string> = { 1: 'first', 9: 'ninth', 16: 'sixteenth', 22: 'twenty-second', 24: 'twenty-fourth', 25: 'twenty-fifth', 13: 'thirteenth', 14: 'fourteenth' };
const ordinal = ( d: number ) => ORD[d] ?? ( () => { throw new Error( `no spoken ordinal for day ${d}` ); } )();
const MONTH = 'October';

export const ALL_ROWS = summarize( EVENTS );
/** Featured regions: the 6 most active named regions (never the catch-all). */
export const FEATURED = ALL_ROWS.filter( r => r.name !== REST && r.box ).slice( 0, 6 ) as ( typeof ALL_ROWS[number] & { box: NonNullable<typeof ALL_ROWS[number]['box']> } )[];
export const OTHER = TOTAL - FEATURED.reduce( ( n, r ) => n + r.count, 0 );

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
const cap = ( s: string ) => s[0].toUpperCase() + s.slice( 1 );
if ( FEATURED[0].count === FEATURED[1].count ) throw new Error( 'top two regions tie; reword the lead line' );
const lead = [ 'The most active area was {r}, with {n} earthquakes.', '{R} recorded {n}.', '{R} had {n}.', '{R} had {n}.', '{R} had {n}.', 'And {r}, {n}.' ];

/** "12 km WSW of Pitaloza Arriba, Panama" -> "Pitaloza Arriba, Panama". Place names stay exactly as USGS reports them. */
export const placeOf = ( e: Quake ) => e.place.replace( /^\d+ km [NSEW]+ of /, '' );
const day = ( e: Quake ) => Number( e.time.slice( 8, 10 ) );
export const dateLabel = ( e: Quake ) => `${MONTH.slice( 0, 3 ).toUpperCase()} ${day( e )}, 2026`;
const spokenMag = ( m: number ) => `${ONES[Math.floor( m )]} point ${ONES[Math.round( ( m % 1 ) * 10 )]}`;
const rank = [ 'The strongest was', 'Next,', 'And' ];

/** `start` is the storyboard start (seconds); a line is pushed back by placeClips when the previous one runs over. */
export const LINES: ScriptLine[] = [
  { id: 'hook', start: 1.0, text: `Worldwide, from October first to twenty-fifth: ${words( TOTAL )} earthquakes above magnitude five.` },
  { id: 'dots', start: 9.2, text: 'This is a historical record. Each red dot marks one epicenter.' },
  { id: 'b0', start: 15.3, text: 'Watch them appear, day by day.' },
  ...FEATURED.map( ( r, i ) => ( { id: `r${i}`, start: [ 19.5, 26, 31, 36, 41, 46 ][i], text: lead[i].replace( '{r}', spoken[r.name] ).replace( '{R}', cap( spoken[r.name] ) ).replace( '{n}', words( r.count ) ) } ) ),
  { id: 'rest', start: 52, text: `The remaining ${words( OTHER )} were spread across the rest of the world.` },
  { id: 'plate', start: 59, text: 'Most cluster along the boundaries of tectonic plates.' },
  ...STRONGEST.map( ( e, i ) => ( { id: `c${i}`, start: [ 73, 82, 91 ][i], text: `${rank[i]} magnitude ${spokenMag( e.mag )}, near ${placeOf( e )}, on ${MONTH} ${ordinal( day( e ) )}.` } ) ),
  { id: 's0', start: 100, text: `In all, ${words( M6 )} earthquakes reached magnitude six or greater, and ${words( M7 )} reached seven.` },
  { id: 's1', start: 107, text: `Historical records, from the U.S. Geological Survey.` }
];

export const QUAKES_OCTOBER: EpisodeMeta = { id: 'quakes-october-live', number: 98, compositionId: 'QuakesOctober', title: 'Earthquakes in October 2026', baseSeconds: 0, tailSeconds: 3.2, script: LINES };
