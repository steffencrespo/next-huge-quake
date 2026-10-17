/**
 * Deterministic formatters for on-screen values. Conventions follow M1's `describeFacts`
 * (quake-news-agent/src/workflows/quake_news/facts.ts): magnitude to one decimal, depth in km with miles
 * at 1.609344 km per mile, UTC times, and the USGS "<year> <Place> Earthquake" label stripped.
 */
export const KM_PER_MILE = 1.609344;

const MONTHS = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
const MONTHS_SHORT = MONTHS.map( m => m.slice( 0, 3 ) );

const pad2 = ( value: number ) => String( value ).padStart( 2, '0' );

export const round = ( value: number, decimals: number ): number => {
  const factor = 10 ** decimals;
  return Math.round( value * factor ) / factor;
};

export const formatMagnitude = ( magnitude: number ): string => magnitude.toFixed( 1 );

/** Strip USGS's notable-event label: "2024 Noto Peninsula, Japan Earthquake" -> "Noto Peninsula, Japan". */
export const placeName = ( place: string ): string =>
  place.replace( /^\d{4}\s+/, '' ).replace( /\s+earthquakes?$/i, '' ).trim();

/** M1 falls back to "near 52.49°N, 160.24°E" when USGS gives no place name. */
export const isCoordinatePlace = ( place: string ): boolean => /^near \d+(?:\.\d+)?°[NS], \d+(?:\.\d+)?°[EW]$/.test( place );

export const formatDepthKm = ( depthKm: number ): string => `${round( depthKm, 1 )} km`;
export const formatDepthMiles = ( depthKm: number ): string => `${round( depthKm / KM_PER_MILE, 1 )} mi`;

/** "37.49°N, 137.27°E" */
export const formatCoordinates = ( latitude: number, longitude: number ): string =>
  `${Math.abs( latitude ).toFixed( 2 )}°${latitude >= 0 ? 'N' : 'S'}, ${Math.abs( longitude ).toFixed( 2 )}°${longitude >= 0 ? 'E' : 'W'}`;

/** "January 1, 2024" (UTC calendar date) */
export const formatDateUtc = ( iso: string ): string => {
  const d = new Date( iso );
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

/** "Jan 1, 2024" (UTC calendar date) */
export const formatShortDateUtc = ( iso: string ): string => {
  const d = new Date( iso );
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
};

/** "07:10 UTC" */
export const formatClockUtc = ( iso: string ): string => {
  const d = new Date( iso );
  return `${pad2( d.getUTCHours() )}:${pad2( d.getUTCMinutes() )} UTC`;
};

/** "1,234" */
export const formatCount = ( value: number ): string => value.toLocaleString( 'en-US' );

/** Plain-English names for common USGS magnitude types. Unknown types are shown as their code only. */
const MAG_TYPE_NAMES: Record<string, string> = {
  mww: 'Moment magnitude',
  mwc: 'Moment magnitude',
  mwb: 'Moment magnitude',
  mwr: 'Moment magnitude',
  mw: 'Moment magnitude',
  ml: 'Local magnitude',
  mb: 'Body-wave magnitude',
  ms: 'Surface-wave magnitude',
  md: 'Duration magnitude'
};

export const magTypeName = ( magType: string | null ): string | null =>
  magType === null ? null : MAG_TYPE_NAMES[magType.toLowerCase()] ?? null;

/** USGS depth classes: shallow 0-70 km, intermediate 70-300 km, deep 300-700 km. */
export const DEPTH_CLASS_BOUNDS_KM = { shallow: 70, intermediate: 300, deep: 700 } as const;

export function depthClass( depthKm: number ): 'shallow' | 'intermediate' | 'deep' {
  if ( depthKm < DEPTH_CLASS_BOUNDS_KM.shallow ) {
    return 'shallow';
  }
  return depthKm < DEPTH_CLASS_BOUNDS_KM.intermediate ? 'intermediate' : 'deep';
}
