/**
 * VideoSpec v1: the data contract for one earthquake news video.
 *
 * The spec carries facts, enums and durations only. It has no free-form display text: every on-screen string
 * is produced from these facts by the fixed templates in src/copy/. The event schema mirrors M1's
 * `quakeFactsSchema` (quake-news-agent/src/workflows/quake_news/types.ts) instead of importing it, so the
 * renderer stays independent of Output.ai and Temporal.
 */
import { z } from 'zod';

export const SPEC_VERSION = '1.0';
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const MIN_DURATION_FRAMES = 30 * FPS;
export const MAX_DURATION_FRAMES = 45 * FPS;
export const MAX_CONTEXT_ITEMS = 3;
/** An earthquake whose origin time is older than this, relative to the spec's asOfUtc, is shown as ARCHIVE. */
export const ARCHIVE_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** USGS event IDs are a network code followed by the event code, e.g. us6000m0xl, ci40161279. */
const USGS_EVENT_ID = /^[a-z]{2}[a-z0-9]{4,}$/;
const USGS_HOST = 'earthquake.usgs.gov';

export const eventSchema = z.strictObject( {
  id: z.string().regex( USGS_EVENT_ID, 'not a USGS event ID' ),
  magnitude: z.number().min( -2 ).max( 10 ),
  magType: z.string().min( 1 ).nullable(),
  place: z.string().min( 1 ),
  timeUtc: z.iso.datetime().describe( 'Origin time, ISO 8601 UTC' ),
  updatedUtc: z.iso.datetime().nullable().describe( 'Last USGS update, ISO 8601 UTC' ),
  // M1 also allows 'deleted'. A deleted event must never be rendered, so v1 rejects it.
  status: z.enum( [ 'reviewed', 'automatic', 'unknown' ] ),
  latitude: z.number().min( -90 ).max( 90 ),
  longitude: z.number().min( -180 ).max( 180 ),
  depthKm: z.number().min( -10 ).max( 800 ).nullable(),
  tsunamiFlag: z.boolean().nullable().describe( 'USGS tsunami flag: tsunami info is linked, not proof a tsunami occurred' ),
  pagerAlert: z.enum( [ 'green', 'yellow', 'orange', 'red' ] ).nullable(),
  feltReports: z.number().int().min( 0 ).nullable(),
  url: z.url().refine( value => new URL( value ).hostname === USGS_HOST, `must be on ${USGS_HOST}` )
} );

/**
 * Context cards. Each one is a fixed template that needs its fact to be present (see CONTEXT_ITEM_REQUIRES).
 * 'review-status' needs no optional fact, so a video always has at least one context card.
 */
export const contextItemSchema = z.enum( [ 'depth-class', 'pager', 'tsunami-flag', 'felt-reports', 'review-status' ] );

const frames = z.number().int().positive();

export const videoSpecSchema = z.strictObject( {
  specVersion: z.literal( SPEC_VERSION ),
  format: z.strictObject( { width: z.literal( WIDTH ), height: z.literal( HEIGHT ), fps: z.literal( FPS ) } ),
  locale: z.literal( 'en' ),
  /** 'synthetic-test' marks data altered for tests; such renders carry a permanent TEST DATA watermark. */
  provenance: z.enum( [ 'usgs-fixture', 'usgs-live', 'synthetic-test' ] ),
  /** When the video is produced for. Fixed in the spec so renders are deterministic; drives the ARCHIVE indicator. */
  asOfUtc: z.iso.datetime(),
  event: eventSchema,
  map: z.strictObject( {
    mode: z.enum( [ 'live', 'static' ] ),
    /** Which side the globe approach starts from. */
    approachFrom: z.enum( [ 'west', 'east' ] )
  } ),
  scenes: z.tuple( [
    z.strictObject( { kind: z.literal( 'hook' ), frames } ),
    z.strictObject( { kind: z.literal( 'facts' ), frames } ),
    z.strictObject( { kind: z.literal( 'context' ), frames, items: z.array( contextItemSchema ).min( 1 ).max( MAX_CONTEXT_ITEMS ) } ),
    z.strictObject( { kind: z.literal( 'closing' ), frames } )
  ] )
} ).superRefine( ( spec, ctx ) => {
  const total = spec.scenes.reduce( ( sum, scene ) => sum + scene.frames, 0 );
  if ( total < MIN_DURATION_FRAMES || total > MAX_DURATION_FRAMES ) {
    ctx.addIssue( { code: 'custom', path: [ 'scenes' ], message: `total duration ${total} frames is outside ${MIN_DURATION_FRAMES}-${MAX_DURATION_FRAMES}` } );
  }
  if ( Date.parse( spec.asOfUtc ) < Date.parse( spec.event.timeUtc ) ) {
    ctx.addIssue( { code: 'custom', path: [ 'asOfUtc' ], message: 'asOfUtc is before the earthquake origin time' } );
  }
  const items = spec.scenes[2].items;
  if ( new Set( items ).size !== items.length ) {
    ctx.addIssue( { code: 'custom', path: [ 'scenes', 2, 'items' ], message: 'context items must be unique' } );
  }
  for ( const [ index, item ] of items.entries() ) {
    if ( !contextItemSupported( item, spec.event ) ) {
      ctx.addIssue( { code: 'custom', path: [ 'scenes', 2, 'items', index ], message: `context item '${item}' is not supported by the event facts` } );
    }
  }
} );

export type QuakeEvent = z.infer<typeof eventSchema>;
export type ContextItem = z.infer<typeof contextItemSchema>;
export type VideoSpec = z.infer<typeof videoSpecSchema>;
export type SceneKind = VideoSpec['scenes'][number]['kind'];

/** A context card may only be shown when the fact it describes is present. */
export function contextItemSupported( item: ContextItem, event: QuakeEvent ): boolean {
  switch ( item ) {
    case 'depth-class':
      return event.depthKm !== null && event.depthKm >= 0;
    case 'pager':
      return event.pagerAlert !== null;
    // Only a set flag is shown: "flag not set" could be misread as "no tsunami".
    case 'tsunami-flag':
      return event.tsunamiFlag === true;
    case 'felt-reports':
      return event.feltReports !== null && event.feltReports > 0;
    case 'review-status':
      return true;
  }
}

/** Same rule as M1's `describeFacts`: anything not reviewed is preliminary. */
export const isPreliminary = ( event: QuakeEvent ): boolean => event.status !== 'reviewed';

/**
 * Historical events are classified by the earthquake origin time, never by the USGS update time
 * (old events are updated years later).
 */
export const isArchive = ( spec: Pick<VideoSpec, 'asOfUtc' | 'event'>, afterDays = ARCHIVE_AFTER_DAYS ): boolean =>
  Date.parse( spec.asOfUtc ) - Date.parse( spec.event.timeUtc ) > afterDays * DAY_MS;
