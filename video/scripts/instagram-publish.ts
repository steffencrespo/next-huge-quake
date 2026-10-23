/**
 * Instagram Publisher v1: validate, approve and STAGE a Reel. Nothing here publishes: there is no media_publish call.
 *
 *   preview [id...]          offline: checks, caption as sent, approval and staging state
 *   approve <id>             record that the human reviewed this exact caption, options and video file
 *   stage   <id> [--confirm] create a resumable Reels container, upload the local MP4, wait until Meta has processed it
 *   status  <id>             read-only: the container's processing status
 *
 * A staged container is not public and expires 24 h after creation. Ambiguous writes are never retried automatically.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { AuthError, assertAuthorizedAccount, getAccessToken } from '../src/instagram/auth.js';
import * as ig from '../src/instagram/graph.js';
import { contentHash, fileSha256, isApproved, loadManifest, manifestDir, resolveFile, saveManifest, validateManifest, type ReelManifest } from '../src/instagram/manifest.js';
import { clearRecord, loadState, saveRecord, stagePreflight } from '../src/instagram/state.js';

const args = process.argv.slice( 3 );
const confirm = args.includes( '--confirm' );
const rest = args.filter( a => !a.startsWith( '--' ) );
const POLL_MS = 20_000;
const POLL_LIMIT_MS = 5 * 60_000;

const allIds = () => readdirSync( manifestDir() ).filter( f => f.endsWith( '.json' ) && f !== 'state.json' ).map( f => f.slice( 0, -5 ) ).sort();
const mb = ( n: number ) => `${ ( n / 1e6 ).toFixed( 1 ) } MB`;
const bullets = ( title: string, items: string[] ) => items.length && console.log( `  ${ title }\n${ items.map( i => `    - ${ i }` ).join( '\n' ) }` );
function need( id?: string ): ReelManifest { if ( !id ) throw new Error( 'Missing reel id.' ); return loadManifest( id ); }

/** Token for the authorized account, verified against Instagram and against the stored user id. */
async function session() {
  const t = await getAccessToken( console.log );
  const me = await ig.getMe( t.accessToken );
  assertAuthorizedAccount( me );
  if ( me.userId !== t.userId ) throw new AuthError( `Instagram user id ${ me.userId } differs from the stored ${ t.userId }. Refusing.` );
  return { token: t.accessToken, userId: me.userId, username: me.username };
}

function preview() {
  const state = loadState();
  console.log( 'OFFLINE PREVIEW: no Instagram calls.\n' );
  for ( const id of rest.length ? rest : allIds() ) {
    const m = loadManifest( id );
    const { problems } = stagePreflight( m, state );
    const file = resolveFile( m.file );
    console.log( `=== ${ m.id } ${ '='.repeat( 60 ) }` );
    console.log( `File:          ${ m.file }  (${ mb( statSync( file ).size ) }, sha256 ${ fileSha256( m ).slice( 0, 12 ) })` );
    console.log( `Source:        YouTube manifest ${ m.sourceYoutubeId ?? 'none' }` );
    console.log( `Options:       share_to_feed=${ m.shareToFeed }  thumb_offset=${ m.thumbOffsetMs } ms` );
    console.log( `Caption:       generated -> approved ${ m.generated.caption === m.approved.caption ? '(identical)' : '(edited by human)' }; approval: ${ isApproved( m ) ? 'APPROVED' : m.approval ? 'STALE' : 'not approved' }` );
    if ( m.publishedManually ) console.log( `NOTE:          already posted by hand on ${ m.publishedManually.date }; staging is a pipeline test only and must never be published.` );
    console.log( `Caption (as sent, ${ [ ...m.approved.caption ].length } chars):\n${ m.approved.caption.split( '\n' ).map( l => `    | ${ l }` ).join( '\n' ) }` );
    console.log( `State:         ${ state[ m.id ] ? `${ state[ m.id ].status }${ state[ m.id ].containerId ? ` (container ${ state[ m.id ].containerId })` : '' }` : 'none' }` );
    bullets( 'Blocking problems for stage:', problems );
    console.log( '  Writes that stage --confirm would make (none publish):' );
    console.log( '    1. POST graph.instagram.com/<IG_ID>/media  media_type=REELS upload_type=resumable (container, not public)' );
    console.log( `    2. POST rupload.facebook.com upload of ${ mb( statSync( file ).size ) }` );
    console.log( '    then read-only status polling until FINISHED\n' );
  }
}

function approve() {
  const m = need( rest[ 0 ] );
  const problems = validateManifest( m );
  if ( problems.length ) throw new Error( `Cannot approve:\n  - ${ problems.join( '\n  - ' ) }` );
  m.approval = { status: 'approved', approvedAt: new Date().toISOString(), contentHash: contentHash( m ) };
  saveManifest( m );
  console.log( `Approved ${ m.id } (${ m.approval.contentHash.slice( 0, 12 ) }). Any later change to the caption, options or video file invalidates this.` );
}

async function stage() {
  const m = need( rest[ 0 ] );
  const { problems, resumeFrom } = stagePreflight( m, loadState() );
  if ( problems.length ) throw new Error( `Preflight failed:\n  - ${ problems.join( '\n  - ' ) }` );
  const { token, userId, username } = await session();
  const bytes = readFileSync( resolveFile( m.file ) );
  console.log( `${ confirm ? 'STAGING' : 'DRY RUN (add --confirm to stage)' }: ${ m.id } -> Reels container on @${ username } (${ mb( bytes.length ) }). Not published.` );
  if ( !confirm ) return;

  let rec = loadState()[ m.id ];
  if ( resumeFrom === 'created' ) {
    if ( rec.fileSize !== bytes.length ) throw new Error( 'File size differs from when the container was created. Aborting.' );
    console.log( `Continuing with existing container ${ rec.containerId } (created, no bytes sent yet).` );
  } else {
    rec = saveRecord( m.id, { status: 'creating', contentHash: contentHash( m ), fileSize: bytes.length } );
    let container: { id: string; uri?: string };
    try {
      container = await ig.createResumableReelContainer( userId, { caption: m.approved.caption, shareToFeed: m.shareToFeed, thumbOffsetMs: m.thumbOffsetMs }, token );
    } catch ( e ) {
      // A definite rejection means no container exists: clear the entry. An ambiguous one stays "creating" for a human.
      if ( e instanceof ig.GraphError ) clearRecord( m.id );
      throw e;
    }
    rec = saveRecord( m.id, { status: 'created', containerId: container.id, uploadUrl: ig.uploadUrl( container.id, container.uri ) } );
    console.log( `Container ${ container.id } created (upload URL ${ container.uri ? 'returned by Meta' : 'not returned; using the documented rupload URL' }).` );
  }

  saveRecord( m.id, { status: 'uploading' } );
  await ig.uploadVideo( rec.uploadUrl!, bytes, token );
  saveRecord( m.id, { status: 'uploaded' } );
  console.log( `Upload accepted (${ mb( bytes.length ) }). Waiting for Meta to process it (up to ${ POLL_LIMIT_MS / 60000 } minutes)...` );
  await poll( m.id, rec.containerId!, token );
}

/** Read-only polling. Records FINISHED as staged and ERROR/EXPIRED as failed. */
async function poll( id: string, containerId: string, token: string, limitMs = POLL_LIMIT_MS ) {
  const until = Date.now() + limitMs;
  for ( ;; ) {
    const c = await ig.getContainer( containerId, token );
    console.log( `  ${ new Date().toISOString() }  ${ c.statusCode }${ c.status && c.status !== c.statusCode ? `  (${ c.status })` : '' }` );
    if ( c.statusCode === 'PUBLISHED' ) throw new Error( `Container ${ containerId } reports PUBLISHED. This tool never publishes: check @nexthugequake now.` );
    if ( c.statusCode === 'FINISHED' ) { saveRecord( id, { status: 'staged', containerStatus: c.statusCode } ); console.log( `Staged: container ${ containerId } is processed and ready. Not published; it expires 24 h after creation.` ); return; }
    if ( c.statusCode === 'ERROR' || c.statusCode === 'EXPIRED' ) { saveRecord( id, { status: 'failed', containerStatus: c.statusCode } ); throw new Error( `Container ${ containerId } ended as ${ c.statusCode }${ c.status ? `: ${ c.status }` : '' }.` ); }
    if ( Date.now() + POLL_MS > until ) { console.log( `Still ${ c.statusCode }. Run "npm run instagram:publish status ${ id }" later.` ); return; }
    await new Promise( r => setTimeout( r, POLL_MS ) );
  }
}

async function status() {
  const m = need( rest[ 0 ] );
  const rec = loadState()[ m.id ];
  if ( !rec?.containerId ) throw new Error( `No container recorded for ${ m.id } (state: ${ rec?.status ?? 'none' }).` );
  const { token } = await session();
  console.log( `${ m.id }: container ${ rec.containerId }, local state ${ rec.status }` );
  // One read; reports without changing state unless the container reached a final status.
  await poll( m.id, rec.containerId, token, 0 );
}

const commands: Record<string, () => unknown> = { preview, approve, stage, status };
const run = commands[ process.argv[ 2 ] ?? 'preview' ];
if ( !run ) { console.error( `Usage: instagram-publish <${ Object.keys( commands ).join( '|' ) }> [id] [--confirm]` ); process.exit( 2 ); }
Promise.resolve().then( run ).catch( error => { console.error( `\nFailed: ${ error instanceof Error ? error.message : 'unknown error' }` ); process.exit( 1 ); } );
