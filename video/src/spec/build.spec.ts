import { describe, expect, it } from 'vitest';
import { DEMO_AS_OF_UTC, FIXTURES } from '../fixtures/index.js';
import { CONTEXT_PRIORITY, buildVideoSpec } from './build.js';
import { sceneRanges, totalFrames } from './timeline.js';

describe( 'buildVideoSpec', () => {
  it( 'is deterministic', () => {
    expect( buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } ) ).toEqual( buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } ) );
  } );

  it( 'builds a 35 s live-map spec by default', () => {
    const spec = buildVideoSpec( FIXTURES.kamchatka, { asOfUtc: DEMO_AS_OF_UTC } );
    expect( totalFrames( spec ) ).toBe( 1050 );
    expect( spec.map ).toEqual( { mode: 'live', approachFrom: 'east' } );
    expect( buildVideoSpec( FIXTURES.kamchatka, { asOfUtc: DEMO_AS_OF_UTC, mapMode: 'static' } ).map.mode ).toBe( 'static' );
  } );

  it( 'picks up to three context cards in priority order, only for facts that exist', () => {
    expect( CONTEXT_PRIORITY ).toEqual( [ 'depth-class', 'pager', 'felt-reports', 'tsunami-flag', 'review-status' ] );
    expect( buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } ).scenes[2].items ).toEqual( [ 'depth-class', 'pager', 'felt-reports' ] );
    expect( buildVideoSpec( FIXTURES.kamchatka, { asOfUtc: DEMO_AS_OF_UTC } ).scenes[2].items ).toEqual( [ 'depth-class', 'pager', 'felt-reports' ] );
    // Without felt reports, the tsunami flag takes the third slot.
    const noFelt = { ...FIXTURES.noto, event: { ...FIXTURES.noto.event, feltReports: null } };
    expect( buildVideoSpec( noFelt, { asOfUtc: DEMO_AS_OF_UTC } ).scenes[2].items ).toEqual( [ 'depth-class', 'pager', 'tsunami-flag' ] );
    expect( buildVideoSpec( FIXTURES.preliminaryTest, { asOfUtc: DEMO_AS_OF_UTC } ).scenes[2].items ).toEqual( [ 'review-status' ] );
  } );

  it( 'keeps the provenance of the fixture', () => {
    expect( buildVideoSpec( FIXTURES.preliminaryTest, { asOfUtc: DEMO_AS_OF_UTC } ).provenance ).toBe( 'synthetic-test' );
  } );
} );

describe( 'sceneRanges', () => {
  it( 'returns contiguous ranges that sum to the total duration', () => {
    const spec = buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } );
    const ranges = sceneRanges( spec );
    expect( ranges.map( r => r.kind ) ).toEqual( [ 'hook', 'facts', 'context', 'closing' ] );
    expect( ranges[0].from ).toBe( 0 );
    for ( let i = 1; i < ranges.length; i++ ) {
      expect( ranges[i].from ).toBe( ranges[i - 1].from + ranges[i - 1].durationInFrames );
    }
    const last = ranges[ranges.length - 1];
    expect( last.from + last.durationInFrames ).toBe( totalFrames( spec ) );
  } );
} );
