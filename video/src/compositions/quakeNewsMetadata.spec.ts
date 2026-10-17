import { describe, expect, it } from 'vitest';
import { DEMO_AS_OF_UTC, FIXTURES } from '../fixtures/index.js';
import { allScreenText, buildScreenCopy } from '../copy/screenCopy.js';
import { buildVideoSpec } from '../spec/build.js';
import { resolveQuakeNewsMetadata } from './quakeNewsMetadata.js';

describe( 'resolveQuakeNewsMetadata', () => {
  it( 'derives a 35 s 1080x1920 30 fps composition from every fixture spec', () => {
    for ( const fixture of Object.values( FIXTURES ) ) {
      const spec = buildVideoSpec( fixture, { asOfUtc: DEMO_AS_OF_UTC } );
      expect( resolveQuakeNewsMetadata( JSON.parse( JSON.stringify( spec ) ) ) ).toEqual( { spec, durationInFrames: 1050, fps: 30, width: 1080, height: 1920 } );
    }
  } );

  it( 'fails before rendering when the spec is invalid', () => {
    const spec = buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } );
    expect( () => resolveQuakeNewsMetadata( { ...spec, headline: 'Thousands feared dead' } ) ).toThrow();
    expect( () => resolveQuakeNewsMetadata( { ...spec, event: { ...spec.event, magnitude: 12 } } ) ).toThrow();
  } );

  it( 'guards the terrain credits shown in production', () => {
    const spec = buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } );
    const copy = buildScreenCopy( spec, { mapCredits: 'terrain' } );
    expect( copy.chrome.source ).toBe( 'Source: USGS · Terrain: Mapzen' );
    expect( allScreenText( copy ).join( ' ' ) ).toContain( 'Map data: Natural Earth · Terrain: Mapzen' );
    expect( () => resolveQuakeNewsMetadata( spec ) ).not.toThrow();
  } );
} );
