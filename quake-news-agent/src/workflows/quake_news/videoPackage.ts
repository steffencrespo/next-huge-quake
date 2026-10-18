import type { VideoPackage, VideoPackageResult, WorkflowOutput } from './types.js';

const reject = ( reason: string ): VideoPackageResult => ( { status: 'rejected', reason } );

/**
 * Provisional cinematic convention, not a geographic fact: events in the western hemisphere (negative longitude)
 * approach from the west, all others from the east. It only picks which way the globe turns into the epicenter.
 */
export const approachFor = ( longitude: number ): VideoPackage['approachFrom'] => longitude < 0 ? 'west' : 'east';

/**
 * Turns a finished quake_news result into the input of the video pipeline. Pure and deterministic: `asOfUtc` is
 * supplied by the caller and the clock is never read. Only a draft whose validation passed becomes a package, and
 * the narration is passed through unchanged. Every rejection carries a reason and no content.
 */
export function toVideoPackage( output: WorkflowOutput, { asOfUtc }: { asOfUtc: string } ): VideoPackageResult {
  if ( output.status !== 'draft' ) {
    return reject( 'No earthquake was selected, so there is nothing to publish' );
  }
  if ( !output.validation.passed ) {
    return reject( 'The draft did not pass validation' );
  }
  const { facts, draft } = output;
  if ( facts.status === 'deleted' ) {
    return reject( 'USGS marks this event as deleted' );
  }
  if ( Number.isNaN( Date.parse( asOfUtc ) ) ) {
    return reject( 'asOfUtc is not a valid timestamp' );
  }
  if ( Date.parse( asOfUtc ) < Date.parse( facts.timeUtc ) ) {
    return reject( 'asOfUtc is before the earthquake origin time' );
  }
  if ( draft.narration.trim() === '' ) {
    return reject( 'The draft has no narration' );
  }
  return {
    status: 'ready',
    package: {
      provenance: 'usgs-live',
      approachFrom: approachFor( facts.longitude ),
      asOfUtc,
      event: { ...facts, status: facts.status },
      narration: draft.narration
    }
  };
}
