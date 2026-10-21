import { describe, expect, it } from 'vitest';
import { buildVideoSpec } from './build.js';
import { PACED_TAIL_SECONDS, pacedSpec } from './pacedTiming.js';
import { FPS, MIN_DURATION_FRAMES } from './schema.js';
import { totalFrames } from './timeline.js';
import { noto } from '../fixtures/noto.js';

const base = buildVideoSpec( noto, { asOfUtc: '2026-10-17T00:00:00Z' } );
const frames = ( s: typeof base ) => s.scenes.map( x => x.frames );

describe( 'pacedSpec', () => {
  it( 'ends the video a fixed tail after the voice and keeps hook and closing', () => {
    const spec = pacedSpec( base, 1.5, 24 );
    expect( totalFrames( spec ) ).toBe( Math.round( ( 1.5 + 24 + PACED_TAIL_SECONDS ) * FPS ) );
    expect( frames( spec )[0] ).toBe( frames( base )[0] );
    expect( frames( spec )[3] ).toBe( frames( base )[3] );
    expect( Math.abs( frames( spec )[1] - frames( spec )[2] ) ).toBeLessThanOrEqual( 1 );
  } );
  it( 'reproduces the default 35 s timing for the narration length it was derived from', () => {
    expect( totalFrames( pacedSpec( base, 1.5, 29.73 ) ) ).toBe( totalFrames( base ) );
  } );
  it( 'never goes below the minimum duration', () => {
    expect( totalFrames( pacedSpec( base, 1.5, 10 ) ) ).toBe( MIN_DURATION_FRAMES );
  } );
} );
