import type { QuakeFacts } from './types.js';

export const KM_PER_MILE = 1.609344;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const WEEKDAYS = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

// PAGER levels are rapid model estimates. The level is set by whichever is higher of
// estimated fatalities or estimated economic losses, so a level never confirms either outcome.
const PAGER_MEANING: Record<string, string> = {
  green: 'a low modeled impact: little or no estimated fatalities and low estimated economic losses',
  yellow: 'a limited modeled impact, based on estimated fatalities or estimated economic losses, whichever is higher',
  orange: 'a significant modeled impact, based on estimated fatalities or estimated economic losses, whichever is higher',
  red: 'an extensive modeled impact, based on estimated fatalities or estimated economic losses, whichever is higher'
};

/**
 * USGS labels notable events as "<year> <Place> Earthquake" (e.g. "2024 Noto Peninsula, Japan Earthquake").
 * Strip that label so prose reads "the Noto Peninsula, Japan".
 */
export const placeName = ( place: string ): string =>
  place.replace( /^\d{4}\s+/, '' ).replace( /\s+earthquakes?$/i, '' ).trim();

export const round = ( value: number, decimals: number ): number => {
  const factor = 10 ** decimals;
  return Math.round( value * factor ) / factor;
};

const pad2 = ( value: number ): string => String( value ).padStart( 2, '0' );

/** Human-readable fact strings passed to the writing and review prompts. */
export function describeFacts( facts: QuakeFacts ) {
  const time = new Date( facts.timeUtc );
  const depthText = facts.depthKm === null ?
    'unknown' :
    `${round( facts.depthKm, 1 )} km (${round( facts.depthKm / KM_PER_MILE, 1 )} miles)`;

  return {
    magnitude: facts.magnitude.toFixed( 1 ),
    magType: facts.magType ?? 'unknown',
    place: placeName( facts.place ),
    usgsPlaceLabel: facts.place,
    dateUtc: `${WEEKDAYS[time.getUTCDay()]}, ${MONTHS[time.getUTCMonth()]} ${time.getUTCDate()}, ${time.getUTCFullYear()}`,
    timeUtc: `${pad2( time.getUTCHours() )}:${pad2( time.getUTCMinutes() )} UTC`,
    depth: depthText,
    latitude: facts.latitude.toFixed( 2 ),
    longitude: facts.longitude.toFixed( 2 ),
    status: facts.status,
    isPreliminary: facts.status !== 'reviewed',
    updatedUtc: facts.updatedUtc ?? 'unknown',
    tsunami: facts.tsunamiFlag === true ?
      'USGS tsunami flag is set (tsunami information is linked; this does NOT confirm a tsunami or a warning)' :
      'USGS tsunami flag is not set',
    tsunamiFlagSet: facts.tsunamiFlag === true,
    pagerAlert: facts.pagerAlert ?? 'none',
    pagerMeaning: facts.pagerAlert ? PAGER_MEANING[facts.pagerAlert] : 'no PAGER alert issued',
    feltReports: facts.feltReports === null ?
      'none recorded' :
      `${facts.feltReports} reports submitted (a count of reports, not of unique people)`,
    url: facts.url
  };
}
