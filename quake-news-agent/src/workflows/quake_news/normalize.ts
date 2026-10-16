import { ValidationError } from '@outputai/core';
import type { QuakeFacts } from './types.js';

type Json = Record<string, unknown>;

const STATUSES = [ 'reviewed', 'automatic', 'deleted' ] as const;
const ALERTS = [ 'green', 'yellow', 'orange', 'red' ] as const;

const isObject = ( value: unknown ): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray( value );

const finiteNumber = ( value: unknown ): number | null =>
  typeof value === 'number' && Number.isFinite( value ) ? value : null;

const nonEmptyString = ( value: unknown ): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const isoOrNull = ( epochMs: unknown ): string | null => {
  const ms = finiteNumber( epochMs );
  return ms === null ? null : new Date( ms ).toISOString();
};

const pick = <T extends string>( value: unknown, allowed: readonly T[] ): T | null =>
  typeof value === 'string' && ( allowed as readonly string[] ).includes( value ) ? value as T : null;

const describeCoordinates = ( latitude: number, longitude: number ): string =>
  `${Math.abs( latitude ).toFixed( 2 )}°${latitude >= 0 ? 'N' : 'S'}, ` +
  `${Math.abs( longitude ).toFixed( 2 )}°${longitude >= 0 ? 'E' : 'W'}`;

/**
 * Convert one USGS GeoJSON feature into normalized facts.
 * Required fields (id, magnitude, origin time, coordinates) must be present;
 * optional fields fall back to null.
 */
export function normalizeFeature( feature: unknown ): QuakeFacts {
  if ( !isObject( feature ) || !isObject( feature.properties ) || !isObject( feature.geometry ) ) {
    throw new ValidationError( 'USGS feature is missing properties or geometry' );
  }
  const props = feature.properties;
  const coordinates = Array.isArray( feature.geometry.coordinates ) ? feature.geometry.coordinates : [];

  const id = nonEmptyString( feature.id ) ?? nonEmptyString( props.code );
  const magnitude = finiteNumber( props.mag );
  const timeUtc = isoOrNull( props.time );
  const longitude = finiteNumber( coordinates[0] );
  const latitude = finiteNumber( coordinates[1] );

  const missing = Object.entries( { id, magnitude, time: timeUtc, latitude, longitude } )
    .filter( ( [ , value ] ) => value === null )
    .map( ( [ key ] ) => key );
  if ( missing.length > 0 ) {
    throw new ValidationError( `USGS feature is missing required fields: ${missing.join( ', ' )}` );
  }

  const tsunami = finiteNumber( props.tsunami );
  const felt = finiteNumber( props.felt );

  return {
    id: id!,
    magnitude: magnitude!,
    magType: nonEmptyString( props.magType ),
    place: nonEmptyString( props.place ) ?? `near ${describeCoordinates( latitude!, longitude! )}`,
    timeUtc: timeUtc!,
    updatedUtc: isoOrNull( props.updated ),
    status: pick( props.status, STATUSES ) ?? 'unknown',
    latitude: latitude!,
    longitude: longitude!,
    depthKm: finiteNumber( coordinates[2] ),
    tsunamiFlag: tsunami === null ? null : tsunami === 1,
    pagerAlert: pick( props.alert, ALERTS ),
    feltReports: felt === null ? null : Math.round( felt ),
    url: nonEmptyString( props.url ) ?? `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`
  };
}

/**
 * Accept either a single Feature (eventid query) or a FeatureCollection (search query).
 * Returns null when the collection is empty.
 */
export function normalizeUsgsResponse( body: unknown ): QuakeFacts | null {
  if ( !isObject( body ) ) {
    throw new ValidationError( 'USGS response is not a JSON object' );
  }
  if ( body.type === 'Feature' ) {
    return normalizeFeature( body );
  }
  if ( body.type === 'FeatureCollection' && Array.isArray( body.features ) ) {
    return body.features.length === 0 ? null : normalizeFeature( body.features[0] );
  }
  throw new ValidationError( `Unexpected USGS GeoJSON type: ${String( body.type )}` );
}
