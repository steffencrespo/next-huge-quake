/** tsx experiments/quakes-october-live/qa/facts-vertical.ts : the 9:16 edit uses the approved landscape figures unchanged.
 * Checks that every vertical line is a landscape line word for word, that the clip manifest and captions match the vertical script,
 * that all four strongest (incl. the tied M6.9s) are narrated, and that the snapshot is the same one. Run qa/facts.ts for the figures themselves. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as F from '../script-final.js';
import { LINES } from '../script-vertical.js';
const dir = join( dirname( new URL( import.meta.url ).pathname ), '..' );
const fails: string[] = [];
const check = ( name: string, got: unknown, want: unknown ) => { const ok = JSON.stringify( got ) === JSON.stringify( want ); console.log( `${ok ? 'OK  ' : 'FAIL'} ${name}: ${JSON.stringify( got )}${ok ? '' : ` != ${JSON.stringify( want )}`}` ); if ( !ok ) fails.push( name ); };
const data = JSON.parse( readFileSync( join( dir, 'data-final.json' ), 'utf8' ) );
check( 'snapshot', [ data.snapshot, data.retrievedAt, data.endUtcExclusive ], [ 'snapshot/usgs-2026-11-01T00-03-13-352Z.geojson', '2026-11-01T00:03:13.352Z', '2026-11-01T00:00:00.000Z' ] );
check( 'figures', [ F.TOTAL, F.BINS.map( b => b.n ), F.STRONGEST.length, F.DEEP.length, F.LARGEST.mag ], [ 216, [ 195, 19, 2 ], 4, 7, 7.7 ] );
check( 'every vertical line is a landscape line', LINES.every( l => F.LINES.some( x => x.id === l.id && x.text === l.text ) ), true );
check( 'all strongest narrated', F.STRONGEST.map( ( _, i ) => LINES.some( l => l.id === `c${i}` ) ), F.STRONGEST.map( () => true ) );
check( 'deep narrated', LINES.some( l => l.id === 'deep' ), true );
const audio = JSON.parse( readFileSync( join( dir, 'audio-vertical.json' ), 'utf8' ) );
check( 'clip ids = script ids', audio.clips.map( ( c: any ) => c.id ), LINES.map( l => l.id ) );
check( 'captions = script text', audio.captions.map( ( c: any ) => c.text ).join( ' ' ).replace( /\s+/g, ' ' ), LINES.map( l => l.text ).join( ' ' ).replace( /\s+/g, ' ' ) );
check( 'pacing', audio.pacing, 'fast-beats' );
check( 'no clip overlaps', audio.clips.every( ( c: any, i: number ) => i === 0 || c.start >= audio.clips[i - 1].start + audio.clips[i - 1].duration ), true );
console.log( fails.length ? `\n${fails.length} FAILURE(S)` : '\nALL VERTICAL FACT CHECKS PASSED' );
process.exit( fails.length ? 1 : 0 );
