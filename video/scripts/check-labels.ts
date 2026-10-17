/**
 * Verifies rendered geographic labels (M2.2c) from a render log, frame by frame:
 * - rules on the rendered (DOM-measured) boxes from LABELDIAG lines: inside the allowed area, clear of the exclusion
 *   disk around the real marker position, no overlaps between labels;
 * - the deterministic width estimate covers the rendered text (estimate >= rendered, so selection was conservative);
 * - the selection's projection model against MapLibre: for each MAPDIAG line, the label anchors' real `map.project`
 *   positions (`tracked`) are compared with `projectAt` for the same logged camera.
 *
 * Usage: tsx scripts/check-labels.ts <plan.json>=<render.log> ...  [--out=report.json]
 * Exits non-zero on any rule violation, a projection error above 12 px, or a rendered box wider than its estimate.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { MapCamera } from '../src/map/LiveMap.js';
import { projectAt } from '../src/map/labels/projection.js';
import type { LabelPlan } from '../src/map/labels/selectLabels.js';

const MAX_PROJECTION_ERROR_PX = 12;
const ESTIMATE_TOLERANCE_PX = 2;

type LabelDiag = { frame: number; marker: [ number, number ]; labels: { kind: string; name: string; anchor: [ number, number ]; box: [ number, number, number, number ] }[] };
type MapDiag = { frame: number; camera: MapCamera; tracked?: [ number, number ][] };

const args = process.argv.slice( 2 );
const outFile = args.find( a => a.startsWith( '--out=' ) )?.slice( 6 );
const pairs = args.filter( a => !a.startsWith( '--' ) ).map( a => a.split( '=' ) as [ string, string ] );

function linesWith<T>( log: string, prefix: string ): T[] {
  return readFileSync( log, 'utf8' ).split( '\n' ).flatMap( line => {
    const at = line.indexOf( prefix );
    return at < 0 ? [] : [ JSON.parse( line.slice( at + prefix.length ) ) as T ];
  } );
}

let failed = false;
const reports = pairs.map( ( [ planFile, log ] ) => {
  const plan = JSON.parse( readFileSync( planFile, 'utf8' ) ) as LabelPlan;
  const { zone, exclusionRadius } = plan.rules;
  const violations: string[] = [];
  // One LABELDIAG per frame is enough; a frame can log twice if React re-renders.
  const frames = new Map<number, LabelDiag>();
  for ( const d of linesWith<LabelDiag>( log, 'LABELDIAG ' ) ) {
    frames.set( d.frame, d );
  }
  let maxEstimateExcess = -Infinity;
  for ( const d of frames.values() ) {
    const boxes = d.labels.map( l => l.box );
    d.labels.forEach( ( l, i ) => {
      const [ x0, y0, x1, y1 ] = l.box;
      if ( x0 < zone.left || x1 > zone.right || y0 < zone.top || y1 > zone.bottom ) {
        violations.push( `frame ${d.frame}: ${l.name} outside the allowed area` );
      }
      const dx = Math.max( x0 - d.marker[0], 0, d.marker[0] - x1 );
      const dy = Math.max( y0 - d.marker[1], 0, d.marker[1] - y1 );
      if ( Math.hypot( dx, dy ) < exclusionRadius ) {
        violations.push( `frame ${d.frame}: ${l.name} inside the exclusion disk (${Math.hypot( dx, dy ).toFixed( 1 )} px)` );
      }
      boxes.slice( i + 1 ).forEach( ( b, j ) => {
        if ( !( x1 <= b[0] || b[2] <= x0 || y1 <= b[1] || b[3] <= y0 ) ) {
          violations.push( `frame ${d.frame}: ${l.name} overlaps ${d.labels[i + 1 + j].name}` );
        }
      } );
      const planned = plan.labels.find( p => p.name === l.name && p.kind === l.kind );
      if ( planned ) {
        const excess = Math.max( ( x1 - x0 ) - ( planned.box.right - planned.box.left ), ( y1 - y0 ) - ( planned.box.bottom - planned.box.top ) );
        maxEstimateExcess = Math.max( maxEstimateExcess, excess );
        if ( excess > ESTIMATE_TOLERANCE_PX ) {
          violations.push( `frame ${d.frame}: ${l.name} renders ${excess.toFixed( 1 )} px larger than its estimate` );
        }
      }
    } );
  }
  let maxProjectionError = 0;
  for ( const d of linesWith<MapDiag>( log, 'MAPDIAG ' ) ) {
    d.tracked?.forEach( ( [ x, y ], i ) => {
      if ( d.camera.bearing !== 0 ) {
        return;
      }
      const p = projectAt( d.camera, plan.labels[i].anchor );
      maxProjectionError = Math.max( maxProjectionError, Math.hypot( p.x - x, p.y - y ) );
    } );
  }
  if ( maxProjectionError > MAX_PROJECTION_ERROR_PX ) {
    violations.push( `projection model error ${maxProjectionError.toFixed( 1 )} px exceeds ${MAX_PROJECTION_ERROR_PX} px` );
  }
  const report = {
    plan: planFile,
    log,
    labels: plan.labels.map( l => l.name ),
    framesChecked: frames.size,
    maxProjectionErrorPx: Number( maxProjectionError.toFixed( 2 ) ),
    maxRenderedMinusEstimatePx: Number.isFinite( maxEstimateExcess ) ? Number( maxEstimateExcess.toFixed( 1 ) ) : null,
    violations
  };
  if ( violations.length > 0 ) {
    failed = true;
  }
  console.log( JSON.stringify( { ...report, violations: violations.slice( 0, 10 ), violationCount: violations.length } ) );
  return report;
} );

if ( outFile ) {
  writeFileSync( outFile, JSON.stringify( reports, null, 2 ) );
}
if ( failed ) {
  console.error( 'label check FAILED' );
  process.exit( 1 );
}
console.log( 'label check passed' );
