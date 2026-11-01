/** Deterministic, non-overlapping region grouping: first matching box wins; everything else is "Rest of the world". Broad labels on purpose. */
export type Quake = { id: string; time: string; mag: number; place: string; lon: number; lat: number; depth: number };
type Box = { name: string; short: string; lat: [ number, number ]; lon: [ number, number ][]; center: [ number, number ]; zoom: number };

export const BOXES: Box[] = [
  { name: 'Vanuatu region', short: 'Vanuatu', lat: [ -24, -5 ], lon: [ [ 164, 172 ] ], center: [ 167, -15 ], zoom: 3.6 },
  { name: 'Fiji–Tonga region', short: 'Fiji–Tonga', lat: [ -36, -10 ], lon: [ [ 172, 180 ], [ -180, -170 ] ], center: [ -178, -21 ], zoom: 3.4 },
  { name: 'Indonesia region', short: 'Indonesia', lat: [ -12, 8 ], lon: [ [ 94, 136 ] ], center: [ 118, -2 ], zoom: 3.2 },
  { name: 'Papua New Guinea region', short: 'Papua New Guinea', lat: [ -12, 2 ], lon: [ [ 136, 164 ] ], center: [ 148, -6 ], zoom: 3.4 },
  { name: 'Philippines and Taiwan', short: 'Philippines–Taiwan', lat: [ 4, 26 ], lon: [ [ 116, 130 ] ], center: [ 123, 14 ], zoom: 3.6 },
  { name: 'Japan–Kuril–Kamchatka', short: 'Japan–Kurils', lat: [ 26, 60 ], lon: [ [ 128, 170 ] ], center: [ 146, 43 ], zoom: 3.2 },
  { name: 'China–Central Asia region', short: 'China & Central Asia', lat: [ 20, 52 ], lon: [ [ 60, 122 ] ], center: [ 90, 36 ], zoom: 2.9 },
  { name: 'Alaska and the Aleutians', short: 'Alaska', lat: [ 50, 72 ], lon: [ [ -180, -128 ], [ 172, 180 ] ], center: [ -158, 58 ], zoom: 3.2 },
  { name: 'Central America', short: 'Central America', lat: [ 5, 20 ], lon: [ [ -102, -76 ] ], center: [ -86, 11 ], zoom: 3.6 },
  { name: 'South America', short: 'South America', lat: [ -56, 13 ], lon: [ [ -82, -34 ] ], center: [ -68, -20 ], zoom: 2.6 }
];
export const REST = 'Rest of the world';

export const regionOf = ( q: Pick<Quake, 'lat' | 'lon'> ): string =>
  BOXES.find( b => q.lat >= b.lat[0] && q.lat <= b.lat[1] && b.lon.some( ( [ a, z ] ) => q.lon >= a && q.lon <= z ) )?.name ?? REST;

export function summarize( events: Quake[] ) {
  const counts = new Map<string, number>();
  events.forEach( e => counts.set( regionOf( e ), ( counts.get( regionOf( e ) ) ?? 0 ) + 1 ) );
  const rows = [ ...counts.entries() ].map( ( [ name, count ] ) => ( { name, count, box: BOXES.find( b => b.name === name ) } ) ).sort( ( a, b ) => b.count - a.count );
  if ( rows.reduce( ( n, r ) => n + r.count, 0 ) !== events.length ) throw new Error( 'regional counts do not reconcile' );
  return rows;
}
