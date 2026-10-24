import { describe, expect, it } from 'vitest';
import { latencyOf } from './latency.js';

describe( 'latency', () => {
  it( 'measures each stage and the whole path, null for stages that did not happen', () => {
    expect( latencyOf( {
      originUtc: '2026-10-22T14:33:40Z', detectedAtUtc: '2026-10-22T14:40:00Z', productionStartedAtUtc: '2026-10-22T14:40:05Z',
      renderCompletedAtUtc: '2026-10-22T14:46:00Z', uploadedAtUtc: '2026-10-22T14:47:00Z', publishedAtUtc: null
    } ) ).toEqual( {
      originToDetectionMs: 380_000, detectionToProductionMs: 5_000, productionToRenderMs: 355_000, renderToUploadMs: 60_000, uploadToPublicMs: null, originToPublicMs: null
    } );
  } );
} );
