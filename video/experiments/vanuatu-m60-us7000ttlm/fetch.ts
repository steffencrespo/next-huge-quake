/** tsx experiments/vanuatu-m60-us7000ttlm/fetch.ts : read-only USGS queries (no key, no paid call) that cache data.json: the five M6+ events of the sequence and the Vanuatu M6+ annual rate used by the closing line. */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const dir = dirname( new URL( import.meta.url ).pathname );
const base = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson';
const get = async ( q: string ): Promise<any[]> => {
  const res = await fetch( `${base}&${q}` );
  if ( !res.ok ) throw new Error( `USGS ${res.status} for ${q}` );
  return ( await res.json() ).features;
};
const summary = ( f: any ) => ( { id: f.id, time: new Date( f.properties.time ).toISOString(), mag: f.properties.mag, magType: f.properties.magType, place: f.properties.place, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: f.geometry.coordinates[2], tsunami: f.properties.tsunami, alert: f.properties.alert, status: f.properties.status } );

// the sequence: every M6+ within 100 km of the Oct 24 M6.9 epicenter since the first M6.0 on Oct 19 (UTC)
const around = 'latitude=-14.0558&longitude=165.5455&maxradiuskm=100';
const events = ( await get( `starttime=2026-10-19&endtime=2026-10-29&${around}&minmagnitude=6&eventtype=earthquake&orderby=time-asc` ) ).map( summary );
const expected = [ 'us6000u3bc', 'us6000u3jl', 'us6000u4j2', 'us6000u4jb', 'us7000ttlm' ];
if ( events.map( e => e.id ).join() !== expected.join() ) throw new Error( `sequence changed: ${events.map( e => `${e.id} M${e.mag}` ).join( ', ' )}` );

// regional rate (NOT narrated: it moves between about 6.2 and 7.2 a year with the box, so the line was replaced): fixed bounds, whole years 1986-2025, duplicate solutions (<120 s apart) counted once
const years = 40;
const count = async ( [ la0, la1, lo0, lo1 ]: number[] ) => ( await get( `starttime=1986-01-01&endtime=2026-01-01&minlatitude=${la0}&maxlatitude=${la1}&minlongitude=${lo0}&maxlongitude=${lo1}&minmagnitude=6&eventtype=earthquake&limit=20000&orderby=time-asc` ) ).reduce( ( acc: number[], f ) => ( acc.length && f.properties.time - acc[acc.length - 1] <= 120_000 ? acc : [ ...acc, f.properties.time ] ), [] ).length;
const BOX = [ -20.5, -12.5, 165, 171 ];
const rate = { length: await count( BOX ) };
const perYear = Math.round( ( rate.length / years ) * 10 ) / 10;
const sensitivity = Object.fromEntries( await Promise.all( [ [ -20.5, -13, 165, 171 ], [ -21, -12, 164, 172 ], [ -20.5, -12.5, 164.5, 170.5 ] ].map( async b => [ b.join( ',' ), Math.round( ( await count( b ) / years ) * 10 ) / 10 ] ) ) );

// the "four decades without one" idea was tested and rejected: it depends on the search radius (an M6.8 on 2009-10-08 is within 100 km)
const prior = ( await get( `starttime=1964-01-01&endtime=2026-10-19&${around}&minmagnitude=6&orderby=time-asc` ) ).map( summary );

writeFileSync( join( dir, 'data.json' ), JSON.stringify( {
  source: 'USGS ComCat fdsnws/event/1/query',
  fetchedAt: new Date().toISOString(),
  sequence: { definition: 'M6.0+ within 100 km of (-14.0558, 165.5455), 2026-10-19 to 2026-10-28 UTC', events },
  annualRate: { definition: 'M6.0+ earthquakes in the box lat -20.5..-12.5, lon 165..171 (the Vanuatu arc, including the cluster), 1986-01-01 to 2025-12-31, duplicates within 120 s merged', box: BOX, events: rate.length, years, perYear, perYearOtherBoxes: sensitivity, narrated: false },
  rejectedClaim: { claim: 'no M6+ in this patch for four decades', priorWithin100kmSince1964: prior.map( e => `${e.time.slice( 0, 10 )} M${e.mag}` ) }
}, null, 2 ) );
console.log( { sequence: events.map( e => `${e.time.slice( 0, 16 )} M${e.mag} ${e.magType}` ), annualRate: { events: rate.length, perYear }, priorWithin100kmSince1964: prior.length } );
