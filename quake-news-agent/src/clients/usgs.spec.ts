import { describe, expect, it } from 'vitest';
import { buildUsgsListUrl } from './usgs.js';

describe( 'buildUsgsListUrl', () => {
  it( 'asks for earthquakes only, newest first, with a limit', () => {
    const url = new URL( buildUsgsListUrl( { startTimeUtc: '2026-10-18T00:00:00.000Z', minMagnitude: 5.5 } ) );
    expect( Object.fromEntries( url.searchParams ) ).toEqual( {
      format: 'geojson', starttime: '2026-10-18T00:00:00.000Z', minmagnitude: '5.5', eventtype: 'earthquake', orderby: 'time', limit: '50'
    } );
  } );
} );
