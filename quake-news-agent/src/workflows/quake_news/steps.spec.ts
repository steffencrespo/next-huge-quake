import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@outputai/core';
import eventFixture from './__fixtures__/event_us6000m0xl.json';
import queryFixture from './__fixtures__/query_strongest.json';
import emptyFixture from './__fixtures__/query_empty.json';

vi.mock( '@outputai/http', () => ( { outputFetch: vi.fn() } ) );
vi.mock( '@outputai/llm', () => ( { generateText: vi.fn(), aiSdk: { Output: { object: vi.fn() } } } ) );

const { outputFetch } = await import( '@outputai/http' );
const { fetchEarthquake } = await import( './steps.js' );
const fetchMock = vi.mocked( outputFetch );

const respond = ( status: number, body: unknown ) =>
  fetchMock.mockResolvedValueOnce( new Response( typeof body === 'string' ? body : JSON.stringify( body ), { status } ) );

const requestedUrl = () => new URL( String( fetchMock.mock.calls[0][0] ) );

describe( 'fetchEarthquake step', () => {
  beforeEach( () => {
    fetchMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime( new Date( '2025-08-04T00:00:00Z' ) );
  } );
  afterEach( () => vi.useRealTimers() );

  it( 'looks up a specific event by ID', async () => {
    respond( 200, eventFixture );
    const result = await fetchEarthquake( { eventId: 'us6000m0xl', minMagnitude: 5.5, days: 7 } );

    expect( requestedUrl().searchParams.get( 'eventid' ) ).toBe( 'us6000m0xl' );
    expect( result.status ).toBe( 'found' );
    expect( result.status === 'found' && result.facts.magnitude ).toBe( 7.5 );
  } );

  it( 'searches the strongest earthquake in the window with the default threshold', async () => {
    respond( 200, queryFixture );
    const result = await fetchEarthquake( {} as never );

    const params = requestedUrl().searchParams;
    expect( params.get( 'minmagnitude' ) ).toBe( '5.5' );
    expect( params.get( 'orderby' ) ).toBe( 'magnitude' );
    expect( params.get( 'limit' ) ).toBe( '1' );
    expect( params.get( 'eventtype' ) ).toBe( 'earthquake' );
    expect( params.get( 'starttime' ) ).toBe( '2025-07-28T00:00:00.000Z' );
    expect( params.get( 'endtime' ) ).toBe( '2025-08-04T00:00:00.000Z' );
    expect( result ).toMatchObject( { status: 'found', facts: { id: 'us6000qw60' } } );
  } );

  it( 'returns no_candidate (not an error) when nothing matches', async () => {
    respond( 200, emptyFixture );
    const result = await fetchEarthquake( { minMagnitude: 9.5, days: 1 } );

    expect( result ).toEqual( {
      status: 'no_candidate',
      criteria: {
        eventId: null,
        minMagnitude: 9.5,
        startTimeUtc: '2025-08-03T00:00:00.000Z',
        endTimeUtc: '2025-08-04T00:00:00.000Z'
      },
      reason: 'No earthquake of magnitude 9.5 or greater in the last 1 day(s)'
    } );
  } );

  it( 'returns no_candidate for an unknown event ID (HTTP 404)', async () => {
    respond( 404, 'Error 404: Not Found' );
    const result = await fetchEarthquake( { eventId: 'us0000nonexistent', minMagnitude: 5.5, days: 7 } );

    expect( result ).toMatchObject( { status: 'no_candidate', reason: 'USGS has no event with ID "us0000nonexistent"' } );
  } );

  it( 'throws on USGS server errors so the step is retried', async () => {
    respond( 503, 'Service Unavailable' );
    await expect( fetchEarthquake( { minMagnitude: 5.5, days: 7 } ) ).rejects.toThrow( 'USGS request failed with HTTP 503' );
  } );

  it( 'throws a non-retryable error on malformed payloads', async () => {
    respond( 200, '<html>maintenance</html>' );
    await expect( fetchEarthquake( { minMagnitude: 5.5, days: 7 } ) ).rejects.toThrow( ValidationError );
  } );

  it( 'rejects invalid input', async () => {
    await expect( fetchEarthquake( { minMagnitude: 11, days: 7 } ) ).rejects.toThrow();
    expect( fetchMock ).not.toHaveBeenCalled();
  } );
} );
