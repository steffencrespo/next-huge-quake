import { describe, expect, it } from 'vitest';
import { panama } from '../fixtures/panama.js';
import { videoSpecSchema } from './schema.js';
import { countWords, scriptText, specFromPackage } from './package.js';

const pkg = {
  provenance: 'usgs-live',
  approachFrom: 'west',
  asOfUtc: '2026-10-18T12:00:00.000Z',
  event: panama.event,
  narration: 'A magnitude 7.7 earthquake struck Panama on October 9, 2026, the USGS reports.'
};

describe( 'video package', () => {
  it( 'builds a valid VideoSpec with the existing builder', () => {
    const { spec } = specFromPackage( pkg );
    expect( videoSpecSchema.parse( spec ) ).toEqual( spec );
    expect( spec ).toMatchObject( { provenance: 'usgs-live', asOfUtc: pkg.asOfUtc, map: { approachFrom: 'west' } } );
    expect( spec.event ).toEqual( panama.event );
  } );

  it( 'rejects missing fields, unknown fields and deleted events', () => {
    expect( () => specFromPackage( { ...pkg, narration: undefined } ) ).toThrow();
    expect( () => specFromPackage( { ...pkg, extra: 1 } ) ).toThrow();
    expect( () => specFromPackage( { ...pkg, event: { ...panama.event, status: 'deleted' } } ) ).toThrow();
    expect( () => specFromPackage( { ...pkg, asOfUtc: '2020-01-01T00:00:00.000Z' } ) ).toThrow();
  } );

  it( 'writes the script with the event, URL, word count and an approximate duration', () => {
    const text = scriptText( specFromPackage( pkg ).pkg );
    expect( text ).toContain( 'Event: us6000u18k' );
    expect( text ).toContain( panama.event.url );
    expect( text ).toContain( `Words: ${countWords( pkg.narration )}` );
    expect( text ).toMatch( /Approximate narration duration: ~\d+ s \(estimate/ );
    expect( text ).toContain( pkg.narration );
  } );
} );
