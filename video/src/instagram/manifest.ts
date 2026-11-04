/**
 * Instagram Publisher v1: per-Reel manifest (publish/instagram/<id>.json), kept apart from the YouTube manifests.
 *
 * `generated` is what the pipeline proposed; `approved` is the human-reviewed caption that is actually sent. The approval
 * hash covers the caption, the options and the SHA-256 of the MP4 itself, so a re-render (or the music version of the
 * file) invalidates the approval until `approve` is run again.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export class ManifestError extends Error {}

export interface ReelManifest {
  id: string;
  /** The YouTube manifest this Reel reuses (publish/<id>.json). Informational. */
  sourceYoutubeId?: string;
  /** Path of the final, music-free MP4, relative to the video/ directory. */
  file: string;
  generated: { caption: string };
  /** Full caption as sent, credits included. */
  approved: { caption: string };
  shareToFeed: boolean;
  thumbOffsetMs: number;
  /** Set when this Reel was already posted by hand: staging is then a pipeline test only, and it must never be published by API. */
  publishedManually?: { date: string; note: string };
  approval?: { status: 'approved'; approvedAt: string; contentHash: string };
}

const root = () => process.env.NHQ_VIDEO_DIR ?? resolve( import.meta.dirname, '..', '..' );
export const manifestDir = () => join( root(), 'publish', 'instagram' );
export const manifestPath = ( id: string ) => join( manifestDir(), `${ id }.json` );
export const resolveFile = ( rel: string ) => join( root(), rel );

export function loadManifest( id: string ): ReelManifest {
  if ( !/^[a-z0-9-]+$/.test( id ) ) throw new ManifestError( `Invalid reel id "${ id }".` );
  const path = manifestPath( id );
  if ( !existsSync( path ) ) throw new ManifestError( `No manifest at ${ path }.` );
  return JSON.parse( readFileSync( path, 'utf8' ) ) as ReelManifest;
}
export const saveManifest = ( m: ReelManifest ) => writeFileSync( manifestPath( m.id ), JSON.stringify( m, null, 2 ) + '\n' );

export const fileSha256 = ( m: ReelManifest ) => createHash( 'sha256' ).update( readFileSync( resolveFile( m.file ) ) ).digest( 'hex' );

/** Hash of everything the human approved: caption, options and the exact video bytes. */
export const contentHash = ( m: ReelManifest ) =>
  createHash( 'sha256' ).update( JSON.stringify( [ m.approved.caption, m.shareToFeed, m.thumbOffsetMs, fileSha256( m ) ] ) ).digest( 'hex' );

export const isApproved = ( m: ReelManifest ) => m.approval?.status === 'approved' && m.approval.contentHash === contentHash( m );

/** Top-level MP4 box types in file order (enough to check that moov precedes mdat). */
export function topLevelBoxes( bytes: Buffer ): string[] {
  const boxes: string[] = [];
  for ( let at = 0; at + 8 <= bytes.length; ) {
    let size = bytes.readUInt32BE( at );
    const type = bytes.toString( 'latin1', at + 4, at + 8 );
    if ( size === 1 && at + 16 <= bytes.length ) size = Number( bytes.readBigUInt64BE( at + 8 ) );
    else if ( size === 0 ) size = bytes.length - at;
    boxes.push( type );
    if ( size < 8 ) break;
    at += size;
  }
  return boxes;
}

const MAX_BYTES = 300 * 1024 * 1024;

/** Returns a list of problems; empty means valid. Does not look at approval. Limits: Instagram Reels publishing docs. */
export function validateManifest( m: ReelManifest ): string[] {
  const problems: string[] = [];
  const need = ( ok: unknown, msg: string ) => { if ( !ok ) problems.push( msg ); };
  const path = m.file ? resolveFile( m.file ) : '';
  if ( !m.file?.endsWith( '.mp4' ) || !existsSync( path ) ) problems.push( `Video file missing: ${ m.file }` );
  else {
    need( statSync( path ).size <= MAX_BYTES, 'Video file exceeds 300 MB.' );
    const boxes = topLevelBoxes( readFileSync( path ) );
    need( boxes.includes( 'moov' ) && boxes.indexOf( 'moov' ) < boxes.indexOf( 'mdat' ), 'MP4 moov atom must come before mdat (faststart).' );
  }
  const c = m.approved?.caption ?? '';
  need( c.trim(), 'Caption is empty.' );
  need( [ ...c ].length <= 2200, 'Caption exceeds 2200 characters.' );
  need( ( c.match( /#[\p{L}\p{N}_]+/gu ) ?? [] ).length <= 30, 'Caption has more than 30 hashtags.' );
  need( ( c.match( /@[A-Za-z0-9._]+/g ) ?? [] ).length <= 20, 'Caption has more than 20 @mentions.' );
  need( /Output\.ai/.test( c ) && c.includes( 'https://output.ai' ), 'Caption lacks the Output.ai production credit.' );
  if ( /terrain|Mapzen|Joerd/i.test( c ) ) need( /Joerd/.test( c ) && /Mapzen/.test( c ) && /Open Government Licence – Canada/.test( c ), 'Terrain Reel caption lacks the full terrain attribution block.' );
  need( typeof m.shareToFeed === 'boolean', 'shareToFeed must be true or false.' );
  need( Number.isInteger( m.thumbOffsetMs ) && m.thumbOffsetMs >= 0, 'thumbOffsetMs must be a non-negative integer.' );
  return problems;
}
