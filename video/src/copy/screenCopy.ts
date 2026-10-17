/**
 * All on-screen text for a video, produced from the VideoSpec by fixed templates.
 * Scenes and components only display these strings; they never build text from facts themselves.
 *
 * Wording rules (editorial policy, reviewed at M2.1 Gate A):
 * - PAGER describes modeled potential impacts, never confirmed damage or casualties.
 * - The tsunami flag is described only as the USGS flag; it never implies a tsunami, a warning or a linked resource.
 * - Felt reports are a count of reports, not of individual people.
 * - Anything not reviewed by USGS is labelled preliminary, and every video says data may be revised.
 * - Historical events (by origin time, see isArchive) carry an ARCHIVE indicator from frame 0.
 * - On-screen card text stays short (CARD_LIMITS); longer explanation goes in `extended`, which is never displayed.
 */
import { isArchive, isPreliminary } from '../spec/schema.js';
import type { ContextItem, QuakeEvent, VideoSpec } from '../spec/schema.js';
import { PAGER_CAVEAT, TSUNAMI_CAVEAT } from './caveats.js';
import {
  DEPTH_CLASS_BOUNDS_KM, depthClass, formatClockUtc, formatCoordinates, formatCount, formatDateUtc, formatDepthKm,
  formatDepthMiles, formatMagnitude, formatShortDateUtc, isCoordinatePlace, magTypeName, placeName
} from './format.js';

export type DataRow = { label: string; value: string; detail: string | null };

/**
 * A context card. `title`, `value`, `line` and `note` are the on-screen text: one short line and one short caveat,
 * readable on a phone within the scene. `extended` is optional longer explanation for later use (descriptions,
 * captions) and is never displayed in the video.
 */
export type ContextCard = { item: ContextItem; title: string; value: string; line: string; note: string | null; extended: string | null };

/** Maximum on-screen lengths for card text, in characters. */
export const CARD_LIMITS = { value: 12, line: 60, note: 80 } as const;

export type ScreenCopy = {
  chrome: {
    tag: string;
    updated: string;
    source: string;
    mapCredit: string | null;
    archive: { badge: string; detail: string } | null;
    preliminary: { badge: string; detail: string } | null;
    testData: string | null;
  };
  /** `name` is null when USGS gave no place name, so layouts can avoid showing the coordinates twice. */
  location: { name: string | null; coordinates: string };
  hook: { kicker: string; magnitude: string; magType: string | null; place: string; when: string };
  facts: { lowerThird: { kicker: string; title: string; subtitle: string }; rows: DataRow[] };
  context: { cards: ContextCard[] };
  closing: { source: string; eventId: string; url: string; updated: string; mapCredit: string | null; disclaimers: string[] };
};

const SEP = ' · ';
const MAP_CREDIT = 'Natural Earth';

const PAGER_LEVEL: Record<NonNullable<QuakeEvent['pagerAlert']>, string> = {
  green: 'Lowest impact alert level.',
  yellow: 'Second-lowest impact alert level.',
  orange: 'Second-highest impact alert level.',
  red: 'Highest impact alert level.'
};

const DEPTH_RANGE = {
  shallow: `0–${DEPTH_CLASS_BOUNDS_KM.shallow} km`,
  intermediate: `${DEPTH_CLASS_BOUNDS_KM.shallow}–${DEPTH_CLASS_BOUNDS_KM.intermediate} km`,
  deep: `${DEPTH_CLASS_BOUNDS_KM.intermediate}–${DEPTH_CLASS_BOUNDS_KM.deep} km`
};

const timestamp = ( iso: string ) => `${formatShortDateUtc( iso )}${SEP}${formatClockUtc( iso )}`;

function preliminaryNotice( event: QuakeEvent ): ScreenCopy['chrome']['preliminary'] {
  if ( !isPreliminary( event ) ) {
    return null;
  }
  return {
    badge: 'PRELIMINARY',
    detail: event.status === 'automatic' ? 'Automatic USGS solution, not yet reviewed' : 'USGS review status not available'
  };
}

function contextCard( item: ContextItem, event: QuakeEvent ): ContextCard {
  switch ( item ) {
    case 'depth-class': {
      const depth = event.depthKm!;
      const cls = depthClass( depth );
      return {
        item,
        title: 'Depth',
        value: cls.toUpperCase(),
        line: `${formatDepthKm( depth )} · USGS ${cls} range: ${DEPTH_RANGE[cls]}`,
        note: 'Earthquake depth indicates where the rupture began beneath the surface.',
        extended: null
      };
    }
    case 'pager':
      return {
        item,
        title: 'USGS PAGER',
        value: event.pagerAlert!.toUpperCase(),
        line: PAGER_LEVEL[event.pagerAlert!],
        note: PAGER_CAVEAT,
        extended: 'PAGER alert levels are rapid USGS model estimates, set from estimated fatalities or economic losses, whichever is higher. They may be revised.'
      };
    case 'felt-reports':
      return {
        item,
        title: 'Felt reports',
        value: formatCount( event.feltReports! ),
        line: 'Submitted to USGS "Did You Feel It?"',
        note: 'A count of reports, not of individual people.',
        extended: null
      };
    case 'tsunami-flag':
      return {
        item,
        title: 'USGS TSUNAMI FLAG',
        value: 'SET',
        line: 'Flag present in USGS event data.',
        note: TSUNAMI_CAVEAT,
        extended: null
      };
    case 'review-status':
      if ( event.status === 'reviewed' ) {
        return { item, title: 'Review status', value: 'REVIEWED', line: 'USGS has reviewed this solution.', note: 'Values may still be revised.', extended: null };
      }
      return event.status === 'automatic' ?
        { item, title: 'Review status', value: 'PRELIMINARY', line: 'Automatic USGS solution, not yet reviewed.', note: 'Magnitude, location and depth may change.', extended: null } :
        { item, title: 'Review status', value: 'PRELIMINARY', line: 'USGS review status not available.', note: 'Treat all values as preliminary.', extended: null };
  }
}

export function buildScreenCopy( spec: VideoSpec ): ScreenCopy {
  const { event } = spec;
  const mapCredit = spec.map.mode === 'live' ? MAP_CREDIT : null;
  const preliminary = preliminaryNotice( event );
  const typeName = magTypeName( event.magType );
  const coordinates = formatCoordinates( event.latitude, event.longitude );
  const name = isCoordinatePlace( event.place ) ? null : placeName( event.place );
  const place = name ?? event.place;
  const updated = event.updatedUtc ? `USGS update${SEP}${timestamp( event.updatedUtc )}` : 'USGS update time not available';

  return {
    chrome: {
      tag: 'EARTHQUAKE',
      updated,
      source: mapCredit ? `Source: USGS${SEP}Map: ${mapCredit}` : 'Source: USGS',
      mapCredit,
      archive: isArchive( spec ) ? { badge: 'ARCHIVE', detail: `Earthquake of ${formatDateUtc( event.timeUtc )}` } : null,
      preliminary,
      testData: spec.provenance === 'synthetic-test' ? 'TEST DATA · NOT FOR PUBLICATION' : null
    },
    location: { name, coordinates },
    hook: {
      kicker: 'MAGNITUDE',
      magnitude: formatMagnitude( event.magnitude ),
      magType: event.magType,
      place,
      when: `${formatDateUtc( event.timeUtc )}${SEP}${formatClockUtc( event.timeUtc )}`
    },
    facts: {
      lowerThird: {
        kicker: preliminary ? 'PRELIMINARY USGS DATA' : 'REVIEWED USGS DATA',
        title: place,
        subtitle: `USGS event ${event.id}`
      },
      rows: [
        {
          label: 'Magnitude',
          value: formatMagnitude( event.magnitude ),
          detail: event.magType === null ? 'Magnitude type not reported' : typeName ? `${typeName} (${event.magType})` : event.magType
        },
        event.depthKm === null ?
          { label: 'Depth', value: 'Not reported', detail: null } :
          { label: 'Depth', value: formatDepthKm( event.depthKm ), detail: formatDepthMiles( event.depthKm ) },
        { label: 'Time', value: formatClockUtc( event.timeUtc ), detail: formatDateUtc( event.timeUtc ) },
        { label: 'Epicenter', value: coordinates, detail: 'USGS location' }
      ]
    },
    context: { cards: spec.scenes[2].items.map( item => contextCard( item, event ) ) },
    closing: {
      source: 'Source: U.S. Geological Survey',
      eventId: `Event ID ${event.id}`,
      url: event.url.replace( /^https?:\/\//, '' ),
      updated: event.updatedUtc ? `Last updated ${timestamp( event.updatedUtc )}` : 'Last update time not available',
      mapCredit: mapCredit ? `Map data: ${mapCredit}` : null,
      disclaimers: [
        ...( preliminary ? [ `Preliminary data. ${preliminary.detail}.` ] : [] ),
        'Data may be revised as USGS updates this event.'
      ]
    }
  };
}

/** Every string in the copy, for the guard and the review export. */
export function allScreenText( copy: ScreenCopy ): string[] {
  const out: string[] = [];
  const walk = ( value: unknown ) => {
    if ( typeof value === 'string' ) {
      out.push( value );
    } else if ( Array.isArray( value ) ) {
      value.forEach( walk );
    } else if ( value && typeof value === 'object' ) {
      Object.values( value ).forEach( walk );
    }
  };
  walk( copy );
  return out;
}
