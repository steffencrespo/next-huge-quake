import { describe, expect, it } from 'vitest';
import {
  depthClass, formatClockUtc, formatCoordinates, formatCount, formatDateUtc, formatDepthKm, formatDepthMiles,
  formatMagnitude, formatShortDateUtc, magTypeName, placeName
} from './format.js';

describe( 'formatters', () => {
  it( 'formats magnitude to one decimal', () => {
    expect( formatMagnitude( 7.5 ) ).toBe( '7.5' );
    expect( formatMagnitude( 8 ) ).toBe( '8.0' );
    expect( formatMagnitude( 6.05 ) ).toBe( '6.0' ); // toFixed rounding, as in M1's describeFacts
  } );

  it( 'formats depth in km and miles with M1 rounding', () => {
    expect( formatDepthKm( 10 ) ).toBe( '10 km' );
    expect( formatDepthMiles( 10 ) ).toBe( '6.2 mi' );
    expect( formatDepthKm( 35 ) ).toBe( '35 km' );
    expect( formatDepthMiles( 35 ) ).toBe( '21.7 mi' );
    expect( formatDepthKm( 12.34 ) ).toBe( '12.3 km' );
  } );

  it( 'formats UTC dates and clock times', () => {
    expect( formatDateUtc( '2024-01-01T07:10:09.476Z' ) ).toBe( 'January 1, 2024' );
    expect( formatShortDateUtc( '2025-07-29T23:24:52.483Z' ) ).toBe( 'Jul 29, 2025' );
    expect( formatClockUtc( '2024-01-01T07:10:09.476Z' ) ).toBe( '07:10 UTC' );
    expect( formatClockUtc( '2025-07-29T23:59:59.999Z' ) ).toBe( '23:59 UTC' ); // truncates, never rounds into the next day
  } );

  it( 'formats coordinates with hemispheres', () => {
    expect( formatCoordinates( 37.4874, 137.271 ) ).toBe( '37.49°N, 137.27°E' );
    expect( formatCoordinates( -33.45, -70.66 ) ).toBe( '33.45°S, 70.66°W' );
  } );

  it( 'strips the USGS notable-event label from place names', () => {
    expect( placeName( '2024 Noto Peninsula, Japan Earthquake' ) ).toBe( 'Noto Peninsula, Japan' );
    expect( placeName( '10 km SSW of Searles Valley, CA' ) ).toBe( '10 km SSW of Searles Valley, CA' );
  } );

  it( 'formats counts with thousands separators', () => {
    expect( formatCount( 422 ) ).toBe( '422' );
    expect( formatCount( 12345 ) ).toBe( '12,345' );
  } );

  it( 'names known magnitude types and leaves others unnamed', () => {
    expect( magTypeName( 'mww' ) ).toBe( 'Moment magnitude' );
    expect( magTypeName( 'ML' ) ).toBe( 'Local magnitude' );
    expect( magTypeName( 'mlv' ) ).toBeNull();
    expect( magTypeName( null ) ).toBeNull();
  } );

  it( 'classifies depth with the USGS bounds', () => {
    expect( depthClass( 0 ) ).toBe( 'shallow' );
    expect( depthClass( 69.9 ) ).toBe( 'shallow' );
    expect( depthClass( 70 ) ).toBe( 'intermediate' );
    expect( depthClass( 300 ) ).toBe( 'deep' );
  } );
} );
