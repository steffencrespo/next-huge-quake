/**
 * YouTube Publisher M2: per-video publication manifest (publish/<id>.json).
 *
 * `generated` is what the pipeline proposed; `approved` is the human-reviewed copy that is actually uploaded. They are separate
 * on purpose: nothing is uploaded from `generated`. `approval` records a hash of the approved content, so any later edit
 * invalidates the approval until `approve` is run again.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const AUTHORIZED_CHANNEL_ID = 'UCgJzKvpcPvzQT-YtBsJb6eQ';
export const PLAYLISTS = {
  historic: 'PLKnoffH2oH5s',
  science: 'PLDquHuxZZySw',
  latest: 'PLPsR74lIhWgI',
  kids: 'PLZRNSXEHIr_A',
} as const;

export class ManifestError extends Error {}

export interface VideoText { title: string; description: string; tags: string[] }
export interface Manifest {
  id: string;
  /** Path of the final MP4, relative to the video/ directory. */
  file: string;
  /** Path of the credits file whose text is appended verbatim to the description. */
  creditsFile: string;
  generated: VideoText;
  /** Human-reviewed title/description body/tags. The description here has NO credits; they are appended at publish time. */
  approved: VideoText;
  categoryId: string;
  language: string;
  /** Audience declaration: always an explicit boolean (YouTube "made for kids"). */
  madeForKids: boolean;
  /** YouTube "altered or synthetic content" disclosure. Absent = not declared (every earlier manifest). */
  containsSyntheticMedia?: boolean;
  playlistId: string;
  /** Editorial calendar slot, America/Sao_Paulo wall-clock "YYYY-MM-DDTHH:mm". Optional until scheduling. */
  publishAtLocal?: string;
  /** One-video override of the Tue/Thu/Sat 18:00 cadence and the 24 h lead time (live API test). Absent on every normal manifest. */
  scheduleException?: { reason: string; minLeadMinutes: number };
  approval?: { status: 'approved'; approvedAt: string; contentHash: string };
}

const root = () => process.env.NHQ_VIDEO_DIR ?? resolve( import.meta.dirname, '..', '..' );
export const manifestPath = ( id: string ) => join( root(), 'publish', `${ id }.json` );
export const resolveFile = ( rel: string ) => join( root(), rel );

export function loadManifest( id: string ): Manifest {
  if ( !/^[a-z0-9-]+$/.test( id ) ) throw new ManifestError( `Invalid video id "${ id }".` );
  const path = manifestPath( id );
  if ( !existsSync( path ) ) throw new ManifestError( `No manifest at ${ path }.` );
  return JSON.parse( readFileSync( path, 'utf8' ) ) as Manifest;
}
export const saveManifest = ( m: Manifest ) => writeFileSync( manifestPath( m.id ), JSON.stringify( m, null, 2 ) + '\n' );

export function readCredits( m: Manifest ): string {
  const path = resolveFile( m.creditsFile );
  if ( !existsSync( path ) ) throw new ManifestError( `Credits file missing: ${ m.creditsFile }` );
  return readFileSync( path, 'utf8' ).trim();
}

/** The exact description uploaded: approved body, then the credits file verbatim. */
export const composeDescription = ( m: Manifest ) => `${ m.approved.description.trim() }\n\n${ readCredits( m ) }`;

/** Hash of everything the human approved: text, credits, playlist, language, audience, category. */
export function contentHash( m: Manifest ): string {
  return createHash( 'sha256' ).update( JSON.stringify( [
    m.approved.title, composeDescription( m ), m.approved.tags, m.categoryId, m.language, m.madeForKids, m.playlistId,
    ...( m.containsSyntheticMedia === undefined ? [] : [ m.containsSyntheticMedia ] ),
  ] ) ).digest( 'hex' );
}

/** Returns a list of problems; empty means valid. Does not look at approval. */
export function validateManifest( m: Manifest ): string[] {
  const problems: string[] = [];
  const need = ( ok: unknown, msg: string ) => { if ( !ok ) problems.push( msg ); };
  if ( !m.file?.endsWith( '.mp4' ) || !existsSync( resolveFile( m.file ) ) ) problems.push( `Video file missing: ${ m.file }` );
  let credits = '';
  try { credits = readCredits( m ); } catch ( e ) { problems.push( ( e as Error ).message ); }
  if ( credits ) {
    need( /Production Technology/.test( credits ) && /Output\.ai/.test( credits ) && credits.includes( 'https://output.ai' ), 'Credits lack the Production Technology / Output.ai block.' );
    if ( /terrain|Mapzen|Joerd/i.test( credits ) ) need( /Joerd/.test( credits ) && /Mapzen/.test( credits ) && /Open Government Licence – Canada/.test( credits ) && credits.includes( 'https://open.canada.ca/en/open-government-licence-canada' ), 'Terrain video credits lack the full terrain attribution block.' );
    need( /^Source:/m.test( credits ) || /^Music:/m.test( credits ), 'Credits file has no Source/Music lines.' );
  }
  const t = m.approved;
  need( t?.title?.trim() && t.title.length <= 100, 'Title missing or over 100 characters.' );
  need( t?.description?.trim(), 'Description body is empty.' );
  need( !/[<>]/.test( `${ t?.title }${ t?.description }${ credits }` ), 'Title/description may not contain < or >.' );
  need( Array.isArray( t?.tags ) && t.tags.length > 0 && t.tags.join( ',' ).length <= 450, 'Tags missing or too long (500 character YouTube limit).' );
  try { need( Buffer.byteLength( composeDescription( m ) ) <= 5000, 'Full description exceeds 5000 bytes.' ); } catch { /* credits problem already reported */ }
  need( /^\d+$/.test( m.categoryId ), 'categoryId must be a YouTube category id (e.g. "27").' );
  need( /^[a-z]{2}(-[A-Za-z]+)?$/.test( m.language ), 'language must be a BCP-47 code such as "en".' );
  need( typeof m.madeForKids === 'boolean', 'madeForKids (audience declaration) must be true or false.' );
  need( Object.values<string>( PLAYLISTS ).includes( m.playlistId ), 'playlistId is not one of the verified playlists.' );
  if ( m.publishAtLocal ) need( /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test( m.publishAtLocal ), 'publishAtLocal must look like 2026-10-22T18:00.' );
  return problems;
}

export const isApproved = ( m: Manifest ) => m.approval?.status === 'approved' && m.approval.contentHash === contentHash( m );
