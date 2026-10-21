import { describe, expect, it } from 'vitest';
import { DEMO_AS_OF_UTC, FIXTURES } from '../fixtures/index.js';
import { buildVideoSpec } from './build.js';
import { isArchive, isPreliminary, videoSpecSchema } from './schema.js';
import type { VideoSpec } from './schema.js';

const valid = (): VideoSpec => structuredClone( buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } ) );
const reject = ( spec: unknown ) => expect( videoSpecSchema.safeParse( spec ).success ).toBe( false );

describe( 'videoSpecSchema', () => {
  it( 'accepts specs built from every fixture', () => {
    for ( const fixture of Object.values( FIXTURES ) ) {
      expect( videoSpecSchema.safeParse( buildVideoSpec( fixture, { asOfUtc: DEMO_AS_OF_UTC } ) ).success ).toBe( true );
    }
  } );

  it( 'rejects an unknown spec version', () => {
    reject( { ...valid(), specVersion: '2.0' } );
  } );

  it( 'rejects a format other than 1080x1920 at 30 fps', () => {
    reject( { ...valid(), format: { width: 1920, height: 1080, fps: 30 } } );
    reject( { ...valid(), format: { width: 1080, height: 1920, fps: 60 } } );
  } );

  it( 'rejects out-of-range coordinates and magnitudes', () => {
    for ( const patch of [ { latitude: 91 }, { longitude: -181 }, { magnitude: 11 } ] ) {
      const spec = valid();
      reject( { ...spec, event: { ...spec.event, ...patch } } );
    }
  } );

  it( 'rejects deleted events, non-USGS URLs and malformed IDs or times', () => {
    for ( const patch of [
      { status: 'deleted' },
      { url: 'https://example.com/earthquakes/eventpage/us6000m0xl' },
      { id: 'Noto quake' },
      { timeUtc: 'January 1, 2024' }
    ] ) {
      const spec = valid();
      reject( { ...spec, event: { ...spec.event, ...patch } } );
    }
  } );

  it( 'rejects free-text fields anywhere (strict objects)', () => {
    reject( { ...valid(), headline: 'Massive quake devastates Japan' } );
    const spec = valid();
    reject( { ...spec, event: { ...spec.event, summary: 'Thousands feared dead' } } );
    const withCaption = valid();
    reject( { ...withCaption, scenes: [ { ...withCaption.scenes[0], caption: 'BREAKING' }, ...withCaption.scenes.slice( 1 ) ] } );
  } );

  it( 'rejects a total duration outside 24-45 s', () => {
    const short = valid();
    short.scenes[1].frames = 10;
    reject( short );
    const long = valid();
    long.scenes[1].frames = 1000;
    reject( long );
  } );

  it( 'rejects context items whose facts are missing, and duplicate items', () => {
    const spec = structuredClone( buildVideoSpec( FIXTURES.preliminaryTest, { asOfUtc: DEMO_AS_OF_UTC } ) );
    for ( const item of [ 'depth-class', 'pager', 'tsunami-flag', 'felt-reports' ] as const ) {
      reject( { ...spec, scenes: [ spec.scenes[0], spec.scenes[1], { ...spec.scenes[2], items: [ item ] }, spec.scenes[3] ] } );
    }
    const noto = valid();
    reject( { ...noto, scenes: [ noto.scenes[0], noto.scenes[1], { ...noto.scenes[2], items: [ 'pager', 'pager' ] }, noto.scenes[3] ] } );
  } );

  it( 'rejects an asOfUtc before the earthquake origin time', () => {
    reject( { ...valid(), asOfUtc: '2023-12-31T00:00:00.000Z' } );
  } );

  it( 'classifies archive events by origin time, not by USGS update time', () => {
    const spec = valid(); // Noto, origin 2024-01-01, updated 2026-10-10
    expect( isArchive( spec ) ).toBe( true );
    expect( isArchive( { ...spec, event: { ...spec.event, updatedUtc: spec.asOfUtc } } ) ).toBe( true );
    expect( isArchive( { ...spec, asOfUtc: '2024-01-03T07:10:09.476Z' } ) ).toBe( false );
    expect( isArchive( { ...spec, asOfUtc: '2024-01-08T07:10:09.477Z' } ) ).toBe( true ); // just over 7 days
    expect( isArchive( { ...spec, asOfUtc: '2024-01-03T07:10:09.476Z' }, 1 ) ).toBe( true ); // threshold is configurable
  } );

  it( 'never shows the tsunami card when the flag is not set', () => {
    const spec = valid();
    const scenes = [ spec.scenes[0], spec.scenes[1], { ...spec.scenes[2], items: [ 'tsunami-flag' ] }, spec.scenes[3] ];
    expect( videoSpecSchema.safeParse( { ...spec, scenes } ).success ).toBe( true );
    reject( { ...spec, scenes, event: { ...spec.event, tsunamiFlag: false } } );
  } );

  it( 'treats every status other than reviewed as preliminary (same rule as M1)', () => {
    const { event } = valid();
    expect( isPreliminary( event ) ).toBe( false );
    expect( isPreliminary( { ...event, status: 'automatic' } ) ).toBe( true );
    expect( isPreliminary( { ...event, status: 'unknown' } ) ).toBe( true );
  } );
} );
