/** tsx experiments/quakes-october-live/qa/facts.ts : re-derives every figure from the RAW snapshot GeoJSON (not data-final.json) and checks it
 * against what the composition and narration use (script-final.ts, audio-final.json). Exits non-zero on any mismatch. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as S from '../script-final.js';
const here = dirname( new URL( import.meta.url ).pathname );
const dir = join( here, '..' );
const data = JSON.parse( readFileSync( join( dir, 'data-final.json' ), 'utf8' ) );
const geo = JSON.parse( readFileSync( join( dir, data.snapshot ), 'utf8' ) );
const fails: string[] = [];
const check = ( name: string, got: unknown, want: unknown ) => { const ok = JSON.stringify( got ) === JSON.stringify( want ); console.log( `${ok ? 'OK  ' : 'FAIL'} ${name}: ${JSON.stringify( got )}${ok ? '' : ` != ${JSON.stringify( want )}`}` ); if ( !ok ) fails.push( name ); };
const f = geo.features as any[];
// alias-aware uniqueness
const owner = new Map<string, string>();
f.forEach( x => String( x.properties.ids ).split( ',' ).filter( Boolean ).concat( x.id ).forEach( k => { if ( owner.has( k ) && owner.get( k ) !== x.id ) fails.push( `alias ${k} shared by ${owner.get( k )} and ${x.id}` ); owner.set( k, x.id ); } ) );
check( 'no alias collisions', fails.filter( s => s.startsWith( 'alias' ) ).length, 0 );
check( 'all type earthquake', f.every( x => x.properties.type === 'earthquake' ), true );
check( 'all mag >= 5.0', f.every( x => x.properties.mag >= 5 ), true );
check( 'all inside window', f.every( x => x.properties.time >= Date.parse( data.startUtc ) && x.properties.time < Date.parse( data.endUtcExclusive ) ), true );
check( 'total = raw feature count', S.TOTAL, f.length );
check( 'total = API count endpoint', S.TOTAL, data.apiCount );
const byMag = [ ...f ].sort( ( a, b ) => b.properties.mag - a.properties.mag || a.properties.time - b.properties.time );
check( 'largest id', S.LARGEST.id, byMag[0].id );
check( 'largest mag', S.LARGEST.mag, byMag[0].properties.mag );
check( 'largest place', S.LARGEST.place, byMag[0].properties.place );
check( 'largest depth', S.LARGEST.depth, byMag[0].geometry.coordinates[2] );
check( 'largest time', S.LARGEST.time, new Date( byMag[0].properties.time ).toISOString() );
check( 'bins', S.BINS.map( b => b.n ), [ f.filter( x => x.properties.mag < 6 ).length, f.filter( x => x.properties.mag >= 6 && x.properties.mag < 7 ).length, f.filter( x => x.properties.mag >= 7 ).length ] );
check( 'M6+', S.M6, f.filter( x => x.properties.mag >= 6 ).length );
check( 'M7+', S.M7, f.filter( x => x.properties.mag >= 7 ).length );
check( 'deep >= 300 km', S.DEEP.length, f.filter( x => x.geometry.coordinates[2] >= 300 ).length );
const deepTop = f.filter( x => x.geometry.coordinates[2] >= 300 ).sort( ( a, b ) => b.properties.mag - a.properties.mag )[0];
check( 'deep largest', [ S.DEEP_LARGEST.id, S.DEEP_LARGEST.mag, Math.round( S.DEEP_LARGEST.depth ) ], [ deepTop.id, deepTop.properties.mag, Math.round( deepTop.geometry.coordinates[2] ) ] );
check( 'strongest ids', S.STRONGEST.map( e => `${e.id} M${e.mag}` ), byMag.filter( x => x.properties.mag >= byMag[2].properties.mag ).map( x => `${x.id} M${x.properties.mag}` ) );
check( 'regions reconcile', S.FEATURED.reduce( ( n, r ) => n + r.count, 0 ) + S.OTHER, f.length );
// every official value carried unchanged
const raw = new Map( f.map( x => [ x.id, x ] ) );
check( 'event fields unchanged', S.EVENTS.filter( e => { const x = raw.get( e.id ); return !x || x.properties.mag !== e.mag || x.geometry.coordinates[0] !== e.lon || x.geometry.coordinates[1] !== e.lat || x.geometry.coordinates[2] !== e.depth || new Date( x.properties.time ).toISOString() !== e.time || x.properties.place !== e.place; } ).length, 0 );
// narration numbers
const line = ( id: string ) => S.LINES.find( l => l.id === id )!.text;
check( 'hook says total', line( 'hook' ).includes( S.words( S.TOTAL ) + ' earthquakes of magnitude five or greater' ), true );
S.FEATURED.forEach( ( r, i ) => check( `r${i} says ${r.count}`, line( `r${i}` ).includes( S.words( r.count ) ), true ) );
check( 'rest says OTHER', line( 'rest' ).includes( S.words( S.OTHER ) ), true );
check( 's0 says M6/M7', line( 's0' ).includes( S.words( S.M6 ) ) && line( 's0' ).includes( S.M7 ? S.words( S.M7 ) : 'none' ), true );
// the recorded clips are exactly the current script lines (library key = text identity)
const audio = JSON.parse( readFileSync( join( dir, 'audio-final.json' ), 'utf8' ) );
check( 'clip ids = script ids', audio.clips.map( ( c: any ) => c.id ), S.LINES.map( l => l.id ) );
const capText = audio.captions.map( ( c: any ) => c.text ).join( ' ' ).replace( /\s+/g, ' ' );
check( 'captions = script text', capText, S.LINES.map( l => l.text ).join( ' ' ).replace( /\s+/g, ' ' ) );
console.log( fails.length ? `\n${fails.length} FAILURE(S)` : '\nALL FACT CHECKS PASSED' );
process.exit( fails.length ? 1 : 0 );
