import { describe, expect, it } from 'vitest';
import { approachFor, toVideoPackage } from './videoPackage.js';
import { normalizeUsgsResponse } from './normalize.js';
import { videoPackageResultSchema } from './types.js';
import noto from './__fixtures__/event_us6000m0xl.json';
import panama from './__fixtures__/event_us6000u18k.json';
import type { QuakeFacts, WorkflowOutput } from './types.js';

const AS_OF = '2026-10-18T12:00:00.000Z';
const criteria = { eventId: null, minMagnitude: null, startTimeUtc: null, endTimeUtc: null };
const passedValidation = {
  passed: true,
  factCheck: { passed: true, contradictions: [], unsupportedClaims: [], missing: [], shapeIssues: [], wordCounts: { article: 120, narration: 60 } },
  review: { passed: true, confidence: 0.9, reasoning: 'ok', feedback: [] }
};
const output = ( fixture: unknown, overrides: Partial<Extract<WorkflowOutput, { status: 'draft' }>> = {} ): WorkflowOutput => ( {
  status: 'draft',
  facts: normalizeUsgsResponse( fixture ) as QuakeFacts,
  draft: { headline: 'h', dek: 'd', article: 'a', narration: 'The validated narration.' },
  validation: passedValidation,
  attempts: [ { attempt: 1, passed: true, factCheckPassed: true, reviewPassed: true } ],
  ...overrides
} );

describe( 'toVideoPackage', () => {
  it( 'builds a package from validated output, keeping the narration unchanged', () => {
    const result = toVideoPackage( output( panama ), { asOfUtc: AS_OF } );
    expect( videoPackageResultSchema.parse( result ) ).toEqual( result );
    expect( result ).toMatchObject( {
      status: 'ready',
      package: { provenance: 'usgs-live', approachFrom: 'west', asOfUtc: AS_OF, narration: 'The validated narration.' }
    } );
    expect( result.status === 'ready' && result.package.event.id ).toBe( 'us6000u18k' );
  } );

  it( 'is deterministic', () => {
    expect( toVideoPackage( output( noto ), { asOfUtc: AS_OF } ) ).toEqual( toVideoPackage( output( noto ), { asOfUtc: AS_OF } ) );
  } );

  it( 'rejects failed validation with no content', () => {
    const failed = output( panama, { validation: { ...passedValidation, passed: false } } );
    expect( toVideoPackage( failed, { asOfUtc: AS_OF } ) ).toEqual( { status: 'rejected', reason: 'The draft did not pass validation' } );
  } );

  it( 'rejects no_candidate', () => {
    const result = toVideoPackage( { status: 'no_candidate', criteria, reason: 'none' }, { asOfUtc: AS_OF } );
    expect( result.status ).toBe( 'rejected' );
    expect( Object.keys( result ).sort() ).toEqual( [ 'reason', 'status' ] );
  } );

  it( 'rejects a deleted event', () => {
    const base = output( panama );
    const deleted = { ...base, facts: { ...( base as { facts: QuakeFacts } ).facts, status: 'deleted' as const } } as WorkflowOutput;
    expect( toVideoPackage( deleted, { asOfUtc: AS_OF } ) ).toEqual( { status: 'rejected', reason: 'USGS marks this event as deleted' } );
  } );

  it( 'rejects an asOfUtc before the origin time', () => {
    expect( toVideoPackage( output( panama ), { asOfUtc: '2020-01-01T00:00:00.000Z' } ).status ).toBe( 'rejected' );
  } );

  it( 'picks the approach side from the longitude sign', () => {
    expect( approachFor( -80.769 ) ).toBe( 'west' );
    expect( approachFor( 137.27 ) ).toBe( 'east' );
    expect( approachFor( 0 ) ).toBe( 'east' );
    expect( toVideoPackage( output( noto ), { asOfUtc: AS_OF } ) ).toMatchObject( { package: { approachFrom: 'east' } } );
  } );
} );
