/** Pure-ish checks shared by the publish CLI: channel guard, duplicate detection, scheduled-queue reading, preflight. */
import { AUTHORIZED_CHANNEL_ID, composeDescription, contentHash, isApproved, validateManifest, type Manifest } from './manifest.js';
import { isEditorialSlot, localToUtc, MIN_LEAD_MS } from './schedule.js';
import type { State } from './state.js';
import type { Channel, VideoInfo } from './youtube.js';

/** Refuses anything but the single authorized channel. Called before every write and in every preview. */
export function assertAuthorizedChannel( channels: Channel[] ): void {
  if ( channels.length !== 1 || channels[ 0 ].id !== AUTHORIZED_CHANNEL_ID ) {
    throw new Error( `Connected channel is ${ channels.map( c => c.id ).join( ', ' ) || 'none' }, expected only ${ AUTHORIZED_CHANNEL_ID }. Refusing.` );
  }
}

const norm = ( s: string ) => s.toLowerCase().replace( /[^a-z0-9]+/g, ' ' ).trim();

/** Videos already on the channel that look like this one (same normalized title). */
export const likelyDuplicates = ( m: Manifest, existing: VideoInfo[], ownVideoId?: string ) =>
  existing.filter( v => v.id !== ownVideoId && norm( v.title ?? '' ) === norm( m.approved.title ) );

/** Videos on the channel with a future publishAt: the occupied editorial slots. */
export const scheduledVideos = ( existing: VideoInfo[], now = new Date() ) =>
  existing.filter( v => v.publishAt && new Date( v.publishAt ).getTime() > now.getTime() );

export interface Preflight { problems: string[]; warnings: string[] }

/** Everything that must hold before a private upload. `existing` is the channel's current video list. */
export function uploadPreflight( m: Manifest, state: State, existing: VideoInfo[] ): Preflight {
  const problems = validateManifest( m );
  const warnings: string[] = [];
  if ( !isApproved( m ) ) problems.push( m.approval ? 'Approval is stale: the manifest changed after approval. Review and run approve again.' : 'Not approved. Review the preview, then run approve.' );
  const rec = state[ m.id ];
  if ( rec && rec.status !== 'uploading' ) problems.push( `Already ${ rec.status } (video ${ rec.videoId }). Not uploading again.` );
  if ( rec?.status === 'uploading' ) {
    warnings.push( 'An earlier upload attempt has an unknown outcome: it will be RESUMED from its saved session, not restarted.' );
    if ( rec.contentHash !== contentHash( m ) ) problems.push( 'Metadata changed since the interrupted upload started. Clear its state entry deliberately before re-uploading.' );
  } else {
    const dupes = likelyDuplicates( m, existing );
    if ( dupes.length ) problems.push( `Likely duplicate already on the channel: ${ dupes.map( d => `${ d.id } "${ d.title }"` ).join( ', ' ) }.` );
    const sizeTwin = Object.entries( state ).find( ( [ id, r ] ) => id !== m.id && r.videoId && r.fileSize === rec?.fileSize );
    if ( sizeTwin ) warnings.push( `State shows ${ sizeTwin[ 0 ] } with the same file size.` );
  }
  return { problems, warnings };
}

/** Checks a schedule request. `existing` = channel videos, `state` = what this tool already scheduled, `others` = other manifests' desired slots. */
export function schedulePreflight( m: Manifest, state: State, existing: VideoInfo[], now = new Date() ): Preflight {
  const problems: string[] = [];
  const rec = state[ m.id ];
  if ( !rec?.videoId || rec.status === 'uploading' ) problems.push( 'Video is not uploaded yet.' );
  if ( rec?.status === 'scheduled' ) problems.push( `Already scheduled for ${ rec.publishAt }.` );
  if ( !isApproved( m ) || rec?.contentHash !== contentHash( m ) ) problems.push( 'Manifest is not approved or differs from what was uploaded.' );
  if ( !m.publishAtLocal ) { problems.push( 'No publishAtLocal in the manifest.' ); return { problems, warnings: [] }; }
  if ( !isEditorialSlot( m.publishAtLocal ) ) problems.push( `${ m.publishAtLocal } is not a Tue/Thu/Sat 18:00 America/Sao_Paulo slot.` );
  const at = localToUtc( m.publishAtLocal );
  if ( at.getTime() - now.getTime() < MIN_LEAD_MS ) problems.push( 'Publication time is less than 24 hours away.' );
  const clash = scheduledVideos( existing, now ).find( v => v.id !== rec?.videoId && new Date( v.publishAt! ).getTime() === at.getTime() );
  if ( clash ) problems.push( `Slot already booked by ${ clash.id } "${ clash.title }".` );
  return { problems, warnings: [] };
}

export const fullDescription = composeDescription;
