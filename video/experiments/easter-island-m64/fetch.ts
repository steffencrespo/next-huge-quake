/**
 * tsx experiments/easter-island-m64/fetch.ts : read-only USGS queries (no key, no paid call) that cache data.json: the us7000ttxz event with its
 * origin, moment tensor and PAGER facts, the earlier M6+ events within 300 km, the oceanic M5+ seismicity drawn on the tectonic map, and the
 * PTWC bulletin feeds (checked for any message about this event).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const dir = dirname( new URL( import.meta.url ).pathname );
const ID = 'us7000ttxz';
const base = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson';
const json = async ( url: string ): Promise<any> => {
  const res = await fetch( url );
  if ( !res.ok ) throw new Error( `${res.status} for ${url}` );
  return res.json();
};
const get = async ( q: string ): Promise<any[]> => ( await json( `${base}&${q}` ) ).features;
const summary = ( f: any ) => ( { id: f.id, time: new Date( f.properties.time ).toISOString(), mag: f.properties.mag, magType: f.properties.magType, place: f.properties.place, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: f.geometry.coordinates[2] } );
const km = ( a: [ number, number ], b: [ number, number ] ) => {
  const r = Math.PI / 180, dp = ( b[1] - a[1] ) * r, dl = ( b[0] - a[0] ) * r;
  return 2 * 6371.0088 * Math.asin( Math.sqrt( Math.sin( dp / 2 ) ** 2 + Math.cos( a[1] * r ) * Math.cos( b[1] * r ) * Math.sin( dl / 2 ) ** 2 ) );
};

const detail = await json( `${base}&eventid=${ID}` );
const p = detail.properties, products = p.products;
const origin = products.origin[0].properties, mt = products['moment-tensor'][0].properties, pager = products.losspager[0];
const pagerJson = async ( file: string ) => json( pager.contents[file].url );
const [ comments, exposures ] = await Promise.all( [ pagerJson( 'json/comments.json' ), pagerJson( 'json/exposures.json' ) ] );
const event = { ...summary( detail ), updated: new Date( p.updated ).toISOString(), status: p.status, alert: p.alert, sig: p.sig, tsunami: p.tsunami, felt: p.felt, depthType: origin['depth-type'], magnitudeError: Number( origin['magnitude-error'] ) };
const HANGA_ROA: [ number, number ] = [ -109.4253, -27.1494 ];
const prior = ( await get( `starttime=1976-01-01&endtime=2026-10-29T07:00:00&latitude=${event.lat}&longitude=${event.lon}&maxradiuskm=300&minmagnitude=6&orderby=time-asc` ) ).map( summary ).map( e => ( { ...e, km: Math.round( km( [ event.lon, event.lat ], [ e.lon, e.lat ] ) ) } ) );
// oceanic M5+ (west of 80°W, away from the Chile trench) traces the East Pacific Rise and the Chile Rise; drawn as dots, not narrated as a count
const seismicity = ( await get( 'starttime=1976-01-01&endtime=2026-10-29&minlatitude=-47&maxlatitude=-22&minlongitude=-118&maxlongitude=-80&minmagnitude=5&eventtype=earthquake&limit=20000' ) )
  .map( f => [ Math.round( f.geometry.coordinates[0] * 100 ) / 100, Math.round( f.geometry.coordinates[1] * 100 ) / 100, f.properties.mag ] );
// PTWC (Pacific) and NTWC atom feeds: any entry issued after the origin time would be a message about this event
const feeds = await Promise.all( [ 'PHEBAtom', 'PAAQAtom' ].map( async f => {
  const xml = await ( await fetch( `https://www.tsunami.gov/events/xml/${f}.xml` ) ).text();
  const latest = [ ...xml.matchAll( /<entry>([\s\S]*?)<\/entry>/g ) ].map( m => ( { updated: /<updated>(.*?)<\/updated>/.exec( m[1] )?.[1] ?? '', title: /<title>([\s\S]*?)<\/title>/.exec( m[1] )?.[1].trim() ?? '' } ) );
  return { feed: f, latest: latest[0], afterOrigin: latest.filter( e => e.updated > event.time ) };
} ) );

writeFileSync( join( dir, 'data.json' ), JSON.stringify( {
  source: 'USGS ComCat fdsnws/event/1/query, USGS PAGER product, tsunami.gov atom feeds',
  fetchedAt: new Date().toISOString(),
  event,
  momentTensor: { magnitude: `${mt['derived-magnitude']} ${mt['derived-magnitude-type']}`, np1: [ mt['nodal-plane-1-strike'], mt['nodal-plane-1-dip'], mt['nodal-plane-1-rake'] ].map( Number ), np2: [ mt['nodal-plane-2-strike'], mt['nodal-plane-2-dip'], mt['nodal-plane-2-rake'] ].map( Number ), reading: 'rakes near 0/180 degrees on steep planes: strike-slip (sideways) faulting' },
  pager: { alert: pager.properties.alertlevel, review: pager.properties['review-status'], impact: comments.impact1, structures: comments.struct_comment, historical: comments.historical_comment, populationExposedAnyMmi: exposures.population_exposure.aggregated_exposure.reduce( ( a: number, b: number ) => a + b, 0 ), cities: [] },
  hangaRoa: { lonLat: HANGA_ROA, km: Math.round( km( [ event.lon, event.lat ], HANGA_ROA ) ) },
  prior,
  tsunamiFeeds: feeds,
  seismicity: { definition: 'USGS M5+ 1976-01-01..2026-10-29, lat -47..-22, lon -118..-80, [lon, lat, mag]', points: seismicity }
} ) );
console.log( { event, km: Math.round( km( [ event.lon, event.lat ], HANGA_ROA ) ), prior: prior.map( e => `${e.time.slice( 0, 10 )} M${e.mag} ${e.km} km` ), seismicity: seismicity.length, feeds: feeds.map( f => `${f.feed}: latest ${f.latest?.updated} ${f.latest?.title}; after origin ${f.afterOrigin.length}` ) } );
