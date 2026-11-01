/** tsx experiments/quakes-october-live/fetch-final.ts : USGS FDSN, worldwide, M>=5.0, 2026-10-01T00:00:00Z to min(now, 2026-11-01T00:00:00Z).
 * Saves the raw GeoJSON response (snapshot/) and data-final.json. Dedupes by event id and by USGS aliases (properties.ids). No local magnitude filter: the labels say "5.0 or greater". */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const dir = dirname( new URL( import.meta.url ).pathname );
const START = '2026-10-01T00:00:00.000Z', MONTH_END = '2026-11-01T00:00:00.000Z';
const retrievedAt = new Date();
// whole seconds, so the label and the query agree exactly
const end = retrievedAt.toISOString() < MONTH_END ? new Date( Math.floor( retrievedAt.getTime() / 1000 ) * 1000 ).toISOString() : MONTH_END;
const coverage = end === MONTH_END ? 'full-month' : 'month-to-date';
const base = 'https://earthquake.usgs.gov/fdsnws/event/1';
const q = `starttime=${START.replace( '.000Z', 'Z' )}&endtime=${end.replace( '.000Z', 'Z' )}&minmagnitude=5&eventtype=earthquake&orderby=time-asc`;
const count = Number( await ( await fetch( `${base}/count?${q}` ) ).text() );
const res = await fetch( `${base}/query?format=geojson&${q}&limit=20000` );
if ( !res.ok ) throw new Error( `USGS ${res.status}` );
const raw = await res.text();
const geo = JSON.parse( raw );
const stamp = retrievedAt.toISOString().replace( /[:.]/g, '-' );
mkdirSync( join( dir, 'snapshot' ), { recursive: true } );
writeFileSync( join( dir, 'snapshot', `usgs-${stamp}.geojson` ), raw );

type Ev = { id: string; ids: string[]; time: string; mag: number; magType: string; place: string; lon: number; lat: number; depth: number; type: string; status: string; tsunami: number; url: string };
const events: Ev[] = geo.features.map( ( f: any ) => ( {
  id: f.id, ids: String( f.properties.ids ?? f.id ).split( ',' ).filter( Boolean ), time: new Date( f.properties.time ).toISOString(), mag: f.properties.mag, magType: f.properties.magType,
  place: f.properties.place, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: f.geometry.coordinates[2], type: f.properties.type, status: f.properties.status, tsunami: f.properties.tsunami, url: f.properties.url
} ) );
// alias dedupe: an event whose id or any alias was already seen is a duplicate
const seen = new Set<string>();
const unique: Ev[] = [];
const dupes: string[] = [];
for ( const e of events ) {
  const keys = [ e.id, ...e.ids ];
  if ( keys.some( k => seen.has( k ) ) ) { dupes.push( e.id ); continue; }
  keys.forEach( k => seen.add( k ) );
  unique.push( e );
}
const inRange = unique.filter( e => e.type === 'earthquake' && e.mag >= 5 && e.time >= START && e.time < end );
console.log( { retrievedAt: retrievedAt.toISOString(), end, coverage, apiCount: count, fetched: events.length, duplicates: dupes, unique: unique.length, inRange: inRange.length, metadataCount: geo.metadata?.count } );
if ( count !== events.length || inRange.length !== unique.length ) throw new Error( 'reconciliation failed' );
writeFileSync( join( dir, 'data-final.json' ), JSON.stringify( {
  source: `${base}/query?format=geojson&${q}`, retrievedAt: retrievedAt.toISOString(), snapshot: `snapshot/usgs-${stamp}.geojson`, startUtc: START, endUtcExclusive: end, coverage,
  apiCount: count, duplicatesRemoved: dupes, events: inRange
}, null, 1 ) );
