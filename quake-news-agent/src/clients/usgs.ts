import { outputFetch } from '@outputai/http';
import { ValidationError } from '@outputai/core';

/** Overridable with USGS_QUERY_URL, only so tests can point the workflows at a local fake service. */
export const USGS_QUERY_URL = process.env.USGS_QUERY_URL ?? 'https://earthquake.usgs.gov/fdsnws/event/1/query';

export type UsgsQuery =
  | { eventId: string } |
  { startTimeUtc: string; endTimeUtc: string; minMagnitude: number };

export type UsgsResponse =
  | { found: false } |
  { found: true; body: unknown };

export function buildUsgsQueryUrl( query: UsgsQuery ): string {
  const params = new URLSearchParams( { format: 'geojson' } );
  if ( 'eventId' in query ) {
    params.set( 'eventid', query.eventId );
  } else {
    params.set( 'starttime', query.startTimeUtc );
    params.set( 'endtime', query.endTimeUtc );
    params.set( 'minmagnitude', String( query.minMagnitude ) );
    params.set( 'eventtype', 'earthquake' );
    params.set( 'orderby', 'magnitude' );
    params.set( 'limit', '1' );
  }
  return `${USGS_QUERY_URL}?${params.toString()}`;
}

/**
 * Query the USGS FDSN event service.
 * A 404 (unknown event ID) or 204 (no content) is reported as `found: false`;
 * any other non-2xx status throws so the step can be retried.
 */
export async function queryUsgs( query: UsgsQuery ): Promise<UsgsResponse> {
  const response = await outputFetch( buildUsgsQueryUrl( query ), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout( 30_000 )
  } );

  if ( response.status === 404 || response.status === 204 ) {
    return { found: false };
  }
  if ( !response.ok ) {
    throw new Error( `USGS request failed with HTTP ${response.status}` );
  }

  const text = await response.text();
  try {
    return { found: true, body: JSON.parse( text ) };
  } catch {
    throw new ValidationError( 'USGS returned a response that is not valid JSON' );
  }
}

export type UsgsListQuery = { startTimeUtc: string; minMagnitude: number; limit?: number };

export function buildUsgsListUrl( { startTimeUtc, minMagnitude, limit = 50 }: UsgsListQuery ): string {
  const params = new URLSearchParams( {
    format: 'geojson',
    starttime: startTimeUtc,
    minmagnitude: String( minMagnitude ),
    eventtype: 'earthquake',
    orderby: 'time',
    limit: String( limit )
  } );
  return `${USGS_QUERY_URL}?${params.toString()}`;
}

/**
 * List recent earthquakes (newest first) as a GeoJSON FeatureCollection, for the monitor. Throws on any failure so
 * the caller can skip the poll without changing state; 204 is an empty collection.
 */
export async function queryUsgsList( query: UsgsListQuery ): Promise<unknown> {
  const response = await outputFetch( buildUsgsListUrl( query ), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout( 30_000 )
  } );
  if ( response.status === 204 ) {
    await response.body?.cancel();
    return { type: 'FeatureCollection', features: [] };
  }
  if ( !response.ok ) {
    await response.body?.cancel();
    throw new Error( `USGS request failed with HTTP ${response.status}` );
  }
  try {
    return JSON.parse( await response.text() );
  } catch {
    throw new ValidationError( 'USGS returned a response that is not valid JSON' );
  }
}
