import { describe, expect, it } from 'vitest';
import { ValidationError } from '@outputai/core';
import { normalizeFeature, normalizeUsgsResponse } from './normalize.js';
import eventFixture from './__fixtures__/event_us6000m0xl.json';
import queryFixture from './__fixtures__/query_strongest.json';
import emptyFixture from './__fixtures__/query_empty.json';
import strippedFixture from './__fixtures__/feature_optional_fields_removed.json';

describe( 'normalizeUsgsResponse', () => {
  it( 'normalizes a real single-event response (eventid query)', () => {
    expect( normalizeUsgsResponse( eventFixture ) ).toEqual( {
      id: 'us6000m0xl',
      magnitude: 7.5,
      magType: 'mww',
      place: '2024 Noto Peninsula, Japan Earthquake',
      timeUtc: '2024-01-01T07:10:09.476Z',
      updatedUtc: new Date( eventFixture.properties.updated ).toISOString(),
      status: 'reviewed',
      latitude: 37.4874,
      longitude: 137.271,
      depthKm: 10,
      tsunamiFlag: true,
      pagerAlert: 'red',
      feltReports: 422,
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000m0xl'
    } );
  } );

  it( 'takes the first feature of a real search response', () => {
    const facts = normalizeUsgsResponse( queryFixture );
    expect( facts ).toMatchObject( {
      id: 'us6000qw60',
      magnitude: 8.8,
      place: '2025 Kamchatka Peninsula, Russia Earthquake',
      status: 'reviewed',
      depthKm: 35
    } );
  } );

  it( 'returns null for a real empty search response', () => {
    expect( normalizeUsgsResponse( emptyFixture ) ).toBeNull();
  } );

  it( 'rejects payloads that are not USGS GeoJSON', () => {
    expect( () => normalizeUsgsResponse( { type: 'Topology' } ) ).toThrow( ValidationError );
    expect( () => normalizeUsgsResponse( 'oops' ) ).toThrow( ValidationError );
  } );
} );

describe( 'normalizeFeature', () => {
  it( 'maps missing optional fields to null with safe fallbacks', () => {
    const facts = normalizeFeature( strippedFixture );
    expect( facts ).toMatchObject( {
      id: 'us6000qw60',
      magnitude: 8.8,
      magType: null,
      updatedUtc: null,
      status: 'unknown',
      depthKm: null,
      tsunamiFlag: null,
      pagerAlert: null,
      feltReports: null,
      place: 'near 52.49°N, 160.24°E',
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000qw60'
    } );
  } );

  it( 'treats null optional values like missing ones', () => {
    const feature = structuredClone( eventFixture );
    Object.assign( feature.properties, { alert: null, felt: null, tsunami: null, status: 'something-new' } );
    expect( normalizeFeature( feature ) ).toMatchObject( {
      pagerAlert: null, feltReports: null, tsunamiFlag: null, status: 'unknown'
    } );
  } );

  it( 'throws when required fields are missing', () => {
    const feature = structuredClone( eventFixture ) as { properties: Record<string, unknown> };
    delete feature.properties.mag;
    delete feature.properties.time;
    expect( () => normalizeFeature( feature ) ).toThrow( /missing required fields: magnitude, time/ );
  } );
} );
