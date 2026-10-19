/**
 * Upload state (publish/state.json), keyed by manifest id. It is the guard against duplicate submissions:
 * a video with any state other than "none" is never uploaded again without a human clearing the entry.
 *
 *   uploading  a resumable session was opened (uploadUrl saved); outcome not yet known. Resume that session, never start another.
 *   uploaded   videos.insert finished; videoId known. Private.
 *   playlisted the video is verified in its playlist.
 *   scheduled  publishAt was set.
 *   published  made public immediately (publish-now exception).
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface UploadRecord {
  status: 'uploading' | 'uploaded' | 'playlisted' | 'scheduled' | 'published';
  contentHash: string;
  fileSize: number;
  uploadUrl?: string;
  videoId?: string;
  playlistItemId?: string;
  publishAt?: string;
  updatedAt: string;
}
export type State = Record<string, UploadRecord>;

const path = () => join( process.env.NHQ_VIDEO_DIR ?? resolve( import.meta.dirname, '..', '..' ), 'publish', 'state.json' );
export const loadState = (): State => existsSync( path() ) ? JSON.parse( readFileSync( path(), 'utf8' ) ) : {};

/** Atomic write (temp file + rename) so a crash never leaves a half-written state. */
export function saveRecord( id: string, patch: Partial<UploadRecord> & Pick<UploadRecord, 'status'> ): UploadRecord {
  const state = loadState();
  const next = { ...state[ id ], ...patch, updatedAt: new Date().toISOString() } as UploadRecord;
  writeFileSync( `${ path() }.tmp`, JSON.stringify( { ...state, [ id ]: next }, null, 2 ) + '\n' );
  renameSync( `${ path() }.tmp`, path() );
  return next;
}
