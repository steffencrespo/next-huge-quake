/** tsx experiments/quakes-october-live/fetch.ts : fetches M5+ earthquakes 2026-10-01..2026-10-26 (exclusive) from USGS, applies the strict mag > 5.0 filter, caches data.json. */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const dir = dirname( new URL( import.meta.url ).pathname );
const start = '2026-10-01T00:00:00', end = '2026-10-26T00:00:00';
const base = 'https://earthquake.usgs.gov/fdsnws/event/1';
const q = `starttime=${start}&endtime=${end}&minmagnitude=5&eventtype=earthquake&orderby=time-asc`;
const count = Number( await ( await fetch( `${base}/count?${q}` ) ).text() );
const res = await fetch( `${base}/query?format=geojson&${q}&limit=20000` );
if ( !res.ok ) throw new Error( `USGS ${res.status}` );
const features = ( await res.json() ).features;
const events = features.map( ( f: any ) => ( { id: f.id, time: new Date( f.properties.time ).toISOString(), mag: f.properties.mag, place: f.properties.place, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: f.geometry.coordinates[2], type: f.properties.type } ) );
const unique = [ ...new Map( events.map( ( e: any ) => [ e.id, e ] ) ).values() ] as any[];
const inRange = unique.filter( e => e.type === 'earthquake' && e.time >= `${start}.000Z` && e.time < `${end}.000Z` );
const strict = inRange.filter( e => e.mag > 5.0 );
const exact5 = inRange.length - strict.length;
console.log( { apiCount: count, fetched: events.length, unique: unique.length, inRange: inRange.length, exactlyM5: exact5, strictlyAbove5: strict.length } );
if ( count !== events.length || count !== inRange.length ) throw new Error( 'reconciliation failed' );
writeFileSync( join( dir, 'data.json' ), JSON.stringify( { source: `${base}/query (${q}) + local filter mag > 5.0`, fetchedAt: new Date().toISOString(), startUtc: `${start}.000Z`, endUtcExclusive: `${end}.000Z`, apiCount: count, exactlyM5Excluded: exact5, events: strict } ) );
