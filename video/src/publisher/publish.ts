/** Pure-ish checks shared by the publish CLI: channel guard, duplicate detection, scheduled-queue reading, preflight. */
import { AUTHORIZED_CHANNEL_ID, composeDescription, contentHash, isApproved, validateManifest, type Manifest } from './manifest.js';
import { isEditorialSlot, localToUtc, MIN_LEAD_MS } from './schedule.js';
import type { State, UploadRecord } from './state.js';
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
  const ex = m.scheduleException;
  if ( ex && ( !ex.reason?.trim() || !( ex.minLeadMinutes >= 60 ) ) ) problems.push( 'scheduleException needs a reason and minLeadMinutes >= 60.' );
  if ( !ex && !isEditorialSlot( m.publishAtLocal ) ) problems.push( `${ m.publishAtLocal } is not a Tue/Thu/Sat 18:00 America/Sao_Paulo slot.` );
  const at = localToUtc( m.publishAtLocal );
  const lead = ex ? ex.minLeadMinutes * 60000 : MIN_LEAD_MS;
  if ( at.getTime() - now.getTime() < lead ) problems.push( ex ? `Publication time is less than ${ ex.minLeadMinutes } minutes away (exception lead).` : 'Publication time is less than 24 hours away.' );
  const clash = scheduledVideos( existing, now ).find( v => v.id !== rec?.videoId && new Date( v.publishAt! ).getTime() === at.getTime() );
  if ( clash ) problems.push( `Slot already booked by ${ clash.id } "${ clash.title }".` );
  return { problems, warnings: [] };
}

export const fullDescription = composeDescription;

export type Privacy = 'private' | 'public';

/** Inputs of a strict inspection, as read from the manifest, the state file and YouTube. */
export interface StrictInput {
  m: Manifest;
  rec: UploadRecord | undefined;
  channels: Channel[];
  video: VideoInfo | undefined;
  playlistMemberships: number;
  expect: Privacy;
}

/**
 * Everything that must hold for an uploaded video before (expect private) and after (expect public) it is made public.
 * Fails closed: any mismatch in channel, licensing/credits, approval, content hash, metadata, playlist, schedule or
 * privacy is a problem, and a public video must be fully processed.
 */
export function strictInspection( { m, rec, channels, video, playlistMemberships, expect }: StrictInput ): string[] {
  const problems: string[] = [];
  try { assertAuthorizedChannel( channels ); } catch ( e ) { problems.push( ( e as Error ).message ); }
  problems.push( ...validateManifest( m ) );
  if ( !isApproved( m ) ) problems.push( 'Manifest is not approved or changed after approval.' );
  if ( !rec?.videoId ) return [ ...problems, 'No uploaded video is recorded for this manifest.' ];
  if ( rec.contentHash !== contentHash( m ) ) problems.push( 'Manifest differs from what was uploaded (content hash).' );
  if ( rec.status === 'scheduled' ) problems.push( 'Recorded as scheduled: this flow never touches scheduled videos.' );
  if ( !video ) return [ ...problems, `Video ${ rec.videoId } not found on YouTube.` ];
  const text: [ string, unknown, unknown ][] = [
    [ 'title', video.title, m.approved.title ], [ 'description', video.description.trim(), composeDescription( m ) ],
    [ 'tags', [ ...video.tags ].sort().join( '|' ), [ ...m.approved.tags ].sort().join( '|' ) ], [ 'category', video.categoryId, m.categoryId ],
    [ 'language', video.language, m.language ], [ 'madeForKids', video.madeForKids, m.madeForKids ],
  ];
  for ( const [ k, got, want ] of text ) if ( got !== want ) problems.push( `${ k } on YouTube differs from the manifest.` );
  if ( playlistMemberships !== 1 ) problems.push( `Expected exactly one membership in playlist ${ m.playlistId }, found ${ playlistMemberships }.` );
  if ( video.publishAt ) problems.push( `Video has a publishAt (${ video.publishAt }); expected none.` );
  if ( video.privacy !== expect ) problems.push( `Privacy is ${ video.privacy }, expected ${ expect }.` );
  if ( expect === 'public' && video.uploadStatus !== 'processed' ) problems.push( `Upload status is ${ video.uploadStatus }, expected processed.` );
  if ( [ 'failed', 'rejected', 'deleted' ].includes( video.uploadStatus ?? '' ) ) problems.push( `YouTube reports upload status ${ video.uploadStatus }.` );
  return problems;
}

export interface ReconcileInput {
  m: Manifest;
  rec: UploadRecord | undefined;
  /** The recorded video as YouTube returns it (undefined when none is recorded or YouTube does not have it). */
  video: VideoInfo | undefined;
  /** Channel videos whose title matches this manifest. */
  titleMatches: VideoInfo[];
  playlistItemIds: string[];
}

export interface ReconcilePlan { problems: string[]; notes: string[]; patch?: Partial<UploadRecord> & Pick<UploadRecord, 'status'> }

/**
 * Compares the local record with YouTube after a crash or an uncertain step, so a retry never relies on state.json
 * alone. It only ever moves the local record forward to what YouTube shows (an upload that did finish, a playlist
 * insert or publication whose result was lost); anything it cannot explain is a problem for a person.
 */
export function reconcilePlan( { m, rec, video, titleMatches, playlistItemIds }: ReconcileInput ): ReconcilePlan {
  const problems: string[] = [];
  const notes: string[] = [];
  const others = titleMatches.filter( v => v.id !== rec?.videoId );
  if ( !rec ) {
    if ( others.length ) problems.push( `Untracked video(s) with this title already on the channel: ${ others.map( v => v.id ).join( ', ' ) }. A person must decide.` );
    else notes.push( 'Nothing uploaded yet; nothing on the channel matches.' );
    return { problems, notes };
  }
  if ( rec.status === 'uploading' ) {
    notes.push( 'An upload session is open; upload resumes it and asks YouTube what it received.' );
    if ( others.length ) problems.push( `Video(s) with this title exist while the upload is unconfirmed: ${ others.map( v => v.id ).join( ', ' ) }. A person must decide.` );
    return { problems, notes };
  }
  if ( rec.status === 'scheduled' ) return { problems: [ 'Recorded as scheduled: not reconciled by this flow.' ], notes };
  if ( others.length ) problems.push( `Other video(s) with this title on the channel: ${ others.map( v => v.id ).join( ', ' ) }.` );
  if ( !video ) return { problems: [ ...problems, `Recorded video ${ rec.videoId } is not on YouTube.` ], notes };
  if ( rec.contentHash !== contentHash( m ) ) problems.push( 'Manifest differs from what was uploaded (content hash).' );
  if ( playlistItemIds.length > 1 ) problems.push( `Video is in playlist ${ m.playlistId } ${ playlistItemIds.length } times.` );
  if ( problems.length ) return { problems, notes };
  if ( video.privacy === 'public' && rec.status !== 'published' ) {
    notes.push( `YouTube shows the video public while the record says ${ rec.status }: recording it as published.` );
    return { problems, notes, patch: { status: 'published', ...( playlistItemIds[ 0 ] ? { playlistItemId: playlistItemIds[ 0 ] } : {} ) } };
  }
  if ( rec.status === 'published' && video.privacy !== 'public' ) problems.push( `Recorded as published but YouTube shows ${ video.privacy }.` );
  if ( rec.status === 'uploaded' && playlistItemIds.length === 1 ) {
    notes.push( 'The playlist insert went through but was not recorded: recording it.' );
    return { problems, notes, patch: { status: 'playlisted', playlistItemId: playlistItemIds[ 0 ] } };
  }
  if ( !problems.length ) notes.push( `Record (${ rec.status }) matches YouTube (${ video.privacy }).` );
  return { problems, notes };
}

/** What upload does for an existing record: resume the playlist step, report done, or refuse. */
export function uploadResume( m: Manifest, rec: UploadRecord | undefined ): 'new' | 'resume_session' | 'resume_playlist' | 'done' | 'refuse' {
  if ( !rec ) return 'new';
  if ( rec.status === 'uploading' ) return 'resume_session';
  if ( !rec.videoId || rec.contentHash !== contentHash( m ) || rec.status === 'scheduled' ) return 'refuse';
  return rec.status === 'uploaded' ? 'resume_playlist' : 'done';
}
