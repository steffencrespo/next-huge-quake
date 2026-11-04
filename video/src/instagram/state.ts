/**
 * Instagram staging state (publish/instagram/state.json), keyed by Reel manifest id. Separate from the YouTube state.
 * Each status is written BEFORE the write it describes, so an interrupted run leaves a record that blocks a blind retry:
 *
 *   creating   container POST sent; outcome unknown until it returns. A human must check and clear the entry.
 *   created    container exists (containerId known), no bytes sent yet. Safe to continue with the upload.
 *   uploading  bytes POST sent; outcome unknown until it returns. Run `status` (read-only) before doing anything else.
 *   uploaded   Meta accepted the bytes; processing.
 *   staged     container status FINISHED: processed and ready. Not public. Expires 24 h after creation.
 *   failed     container status ERROR or EXPIRED.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentHash, isApproved, manifestDir, validateManifest, type ReelManifest } from './manifest.js';

export interface StageRecord {
  status: 'creating' | 'created' | 'uploading' | 'uploaded' | 'staged' | 'failed';
  contentHash: string;
  fileSize: number;
  containerId?: string;
  uploadUrl?: string;
  containerStatus?: string;
  updatedAt: string;
}
export type State = Record<string, StageRecord>;

const path = () => join( manifestDir(), 'state.json' );
export const loadState = (): State => existsSync( path() ) ? JSON.parse( readFileSync( path(), 'utf8' ) ) : {};

/** Atomic write (temp file + rename) so a crash never leaves a half-written state. */
export function saveRecord( id: string, patch: Partial<StageRecord> & Pick<StageRecord, 'status'> ): StageRecord {
  const state = loadState();
  const next = { ...state[ id ], ...patch, updatedAt: new Date().toISOString() } as StageRecord;
  writeFileSync( `${ path() }.tmp`, JSON.stringify( { ...state, [ id ]: next }, null, 2 ) + '\n' );
  renameSync( `${ path() }.tmp`, path() );
  return next;
}

/**
 * What `stage` may do next for this Reel. Only a fresh start or a container that certainly exists ("created") may proceed;
 * every uncertain or finished state stops here for a human.
 */
export function stagePreflight( m: ReelManifest, state: State ): { problems: string[]; resumeFrom?: 'created' } {
  const problems = validateManifest( m );
  if ( !problems.length && !isApproved( m ) ) problems.push( m.approval ? 'Approval is stale: the caption, options or video file changed. Review and run approve again.' : 'Not approved. Review the preview, then run approve.' );
  const rec = state[ m.id ];
  if ( !rec ) return { problems };
  if ( rec.status === 'created' ) {
    if ( !problems.length && rec.contentHash !== contentHash( m ) ) problems.push( 'Manifest changed since the container was created. Clear its state entry deliberately before staging again.' );
    return { problems, resumeFrom: 'created' };
  }
  const why: Record<Exclude<StageRecord[ 'status' ], 'created'>, string> = {
    creating: 'An earlier container request has an unknown outcome. Not retrying. Check the account, then remove this entry from publish/instagram/state.json by hand.',
    uploading: 'An earlier upload has an unknown outcome. Not retrying. Run "status" (read-only) first.',
    uploaded: 'Already uploaded; Meta is processing it. Run "status".',
    staged: `Already staged (container ${ rec.containerId }). Not staging again.`,
    failed: `Container ${ rec.containerId } ended as ${ rec.containerStatus }. Remove this entry from publish/instagram/state.json by hand to try again.`,
  };
  problems.push( why[ rec.status ] );
  return { problems };
}

/** Removes an entry. Used only when Meta definitively rejected the container request, so no container exists. */
export function clearRecord( id: string ): void {
  const { [ id ]: _, ...rest } = loadState();
  writeFileSync( `${ path() }.tmp`, JSON.stringify( rest, null, 2 ) + '\n' );
  renameSync( `${ path() }.tmp`, path() );
}
