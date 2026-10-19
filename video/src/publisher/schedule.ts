/** Editorial calendar: evergreen Shorts go out Tuesday, Thursday and Saturday at 18:00 America/Sao_Paulo. */
export const EDITORIAL_TZ = 'America/Sao_Paulo';
const SLOT_WEEKDAYS = new Set( [ 2, 4, 6 ] ); // Tue, Thu, Sat (Date#getDay)
const SLOT_HOUR = 18;
/** A scheduled video needs time to be reviewed, and YouTube needs the publish time well in the future. */
export const MIN_LEAD_MS = 24 * 3600 * 1000;

function wallClock( date: Date, tz: string ) {
  const p = Object.fromEntries( new Intl.DateTimeFormat( 'en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' } )
    .formatToParts( date ).map( x => [ x.type, x.value ] ) );
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, weekday: p.weekday };
}

/** "2026-10-22T18:00" in America/Sao_Paulo -> UTC Date. Rejects wall-clock times that do not exist or are ambiguous. */
export function localToUtc( local: string, tz = EDITORIAL_TZ ): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec( local );
  if ( !m ) throw new Error( `Bad local time "${ local }".` );
  const [ y, mo, d, h, mi ] = m.slice( 1 ).map( Number );
  const asUtc = Date.UTC( y, mo - 1, d, h, mi );
  let guess = asUtc;
  for ( let i = 0; i < 2; i++ ) { // converge on the zone offset at that instant
    const w = wallClock( new Date( guess ), tz );
    guess += asUtc - Date.UTC( w.y, w.mo - 1, w.d, w.h, w.mi );
  }
  const w = wallClock( new Date( guess ), tz );
  if ( Date.UTC( w.y, w.mo - 1, w.d, w.h, w.mi ) !== asUtc ) throw new Error( `"${ local }" does not exist in ${ tz }.` );
  return new Date( guess );
}

export const toApiTimestamp = ( d: Date ) => d.toISOString().replace( '.000Z', 'Z' );
export const formatLocal = ( d: Date, tz = EDITORIAL_TZ ) => {
  const w = wallClock( d, tz );
  const pad = ( n: number ) => String( n ).padStart( 2, '0' );
  return `${ w.weekday } ${ w.y }-${ pad( w.mo ) }-${ pad( w.d ) } ${ pad( w.h ) }:${ pad( w.mi ) }`;
};

export function isEditorialSlot( local: string ): boolean {
  const d = localToUtc( local );
  const w = wallClock( d, EDITORIAL_TZ );
  return SLOT_WEEKDAYS.has( new Date( Date.UTC( w.y, w.mo - 1, w.d ) ).getUTCDay() ) && w.h === SLOT_HOUR && w.mi === 0;
}

/** Next `count` free editorial slots (as local strings) at least MIN_LEAD_MS after `now`, skipping `occupied` UTC instants. */
export function proposeSlots( count: number, occupied: Date[], now = new Date() ): string[] {
  const taken = new Set( occupied.map( d => d.getTime() ) );
  const out: string[] = [];
  const start = wallClock( now, EDITORIAL_TZ );
  for ( let day = 0; out.length < count && day < 366; day++ ) {
    const dt = new Date( Date.UTC( start.y, start.mo - 1, start.d + day ) );
    if ( !SLOT_WEEKDAYS.has( dt.getUTCDay() ) ) continue;
    const pad = ( n: number ) => String( n ).padStart( 2, '0' );
    const local = `${ dt.getUTCFullYear() }-${ pad( dt.getUTCMonth() + 1 ) }-${ pad( dt.getUTCDate() ) }T${ SLOT_HOUR }:00`;
    const utc = localToUtc( local );
    if ( utc.getTime() - now.getTime() >= MIN_LEAD_MS && !taken.has( utc.getTime() ) ) out.push( local );
  }
  return out;
}
