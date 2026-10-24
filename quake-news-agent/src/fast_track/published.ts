import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Publisher states that mean a video for the event is (or will become) public: a sequence check counts them all. */
const LIVE = new Set( [ 'uploading', 'uploaded', 'playlisted', 'scheduled', 'published' ] );
const EVENT_IN_PATH = /^out\/videos\/([a-z0-9]+)\//;

type ManifestLike = { id?: string; file?: string; fastTrack?: { facts?: { eventId?: string } } };

/** USGS event IDs of the videos the publisher has uploaded, scheduled or published (from manifests and state.json). */
export function publishedEventIds( manifests: ManifestLike[], state: Record<string, { status?: string }> ): string[] {
  const ids = manifests
    .filter( m => m.id && LIVE.has( state[m.id]?.status ?? '' ) )
    .map( m => m.fastTrack?.facts?.eventId ?? EVENT_IN_PATH.exec( m.file ?? '' )?.[1] )
    .filter( ( id ): id is string => Boolean( id ) );
  return [ ...new Set( ids ) ];
}

/** Reads video/publish/. Throws when the directory or state file cannot be read (the caller fails closed). */
export function readPublishedEventIds( videoDir: string ): string[] {
  const dir = join( videoDir, 'publish' );
  const statePath = join( dir, 'state.json' );
  const state = existsSync( statePath ) ? JSON.parse( readFileSync( statePath, 'utf8' ) ) : {};
  const manifests = readdirSync( dir )
    .filter( f => f.endsWith( '.json' ) && f !== 'state.json' )
    .map( f => JSON.parse( readFileSync( join( dir, f ), 'utf8' ) ) as ManifestLike );
  return publishedEventIds( manifests, state );
}

/** Published events near this one in the sequence window: USGS lists every ID of each nearby event. */
export function nearbyPublished( nearbyFeatures: unknown, published: string[], selfIds: string[] ): string[] {
  const wanted = new Set( published );
  const self = new Set( selfIds );
  const features = ( nearbyFeatures as { features?: Array<{ id?: string; properties?: { ids?: string } }> } )?.features;
  if ( !Array.isArray( features ) ) {
    throw new Error( 'USGS nearby query returned no features array' );
  }
  const hits = features.flatMap( f => {
    const ids = [ f.id ?? '', ...( f.properties?.ids ?? '' ).split( ',' ) ].map( id => id.trim() ).filter( Boolean );
    return ids.some( id => self.has( id ) ) ? [] : ids.filter( id => wanted.has( id ) );
  } );
  return [ ...new Set( hits ) ];
}
