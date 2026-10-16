import { outputFetch } from '@outputai/http';
import { ValidationError } from '@outputai/core';

export const USGS_QUERY_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

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
