/**
 * tsx experiments/nyc-earthquake/fetch.ts : read-only USGS queries (no key, no paid call) that cache data.json: the April 5, 2024 Tewksbury, N.J.
 * earthquake (us7000ma74) with its Did You Feel It? response count, and the DYFI 10 km cells where people reported shaking (location and
 * response count only; intensities are kept for the notes but not drawn as a shaking map).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const dir = dirname( new URL( import.meta.url ).pathname );
const ID = 'us7000ma74';
const json = async ( url: string ): Promise<any> => {
  const res = await fetch( url );
  if ( !res.ok ) throw new Error( `${res.status} for ${url}` );
  return res.json();
};
const detail = await json( `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=${ID}` );
const p = detail.properties, dyfi = p.products.dyfi[0];
const event = {
  id: detail.id, title: p.title, time: new Date( p.time ).toISOString(), updated: new Date( p.updated ).toISOString(), status: p.status,
  mag: p.mag, magType: p.magType, lon: detail.geometry.coordinates[0], lat: detail.geometry.coordinates[1], depth: detail.geometry.coordinates[2],
  felt: p.felt, dyfiResponses: Number( dyfi.properties.numResp ), dyfiMaxCdi: Number( dyfi.properties.maxmmi ), alert: p.alert, url: p.url
};
const cells = ( await json( dyfi.contents['dyfi_geo_10km.geojson'].url ) ).features
  .filter( ( f: any ) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'Point' )
  .map( ( f: any ) => {
    const ring = f.geometry.type === 'Point' ? [ f.geometry.coordinates ] : f.geometry.coordinates[0];
    const lon = ring.reduce( ( s: number, c: number[] ) => s + c[0], 0 ) / ring.length, lat = ring.reduce( ( s: number, c: number[] ) => s + c[1], 0 ) / ring.length;
    return [ Math.round( lon * 100 ) / 100, Math.round( lat * 100 ) / 100, Number( f.properties.nresp ), Number( f.properties.cdi ) ];
  } );
writeFileSync( join( dir, 'data.json' ), `${JSON.stringify( { fetched: new Date().toISOString(), event, cells }, null, 1 )}\n` );
console.log( `${event.title}: M${event.mag} ${event.magType} at ${event.lat}, ${event.lon}; ${event.dyfiResponses} DYFI responses; ${cells.length} 10 km cells` );
