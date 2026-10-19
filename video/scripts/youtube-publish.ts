/**
 * YouTube Publisher M2: upload approved Shorts privately, file them in a playlist, and schedule them. Dry-run by default.
 *
 *   preview  [id...]            read-only: checks, full metadata, proposed slots, and the writes that would happen
 *   approve  <id>               record that the human reviewed this exact title/description/credits/tags
 *   upload   <id> [--confirm]   PRIVATE upload + playlist assignment (resumes an interrupted upload; never restarts it)
 *   inspect  <id>               read the uploaded video back and compare it with the manifest
 *   schedule <id> [--confirm]   set publishAt (the only way a video becomes public); separate from upload
 *   queue                       scheduled and private videos currently on the channel
 *
 * Write commands need the write authorization: `npm run youtube:connect -- --write`. They never open a browser themselves.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { AuthError, READ_SCOPES, WRITE_SCOPES, getAccessToken, loadClient } from '../src/publisher/auth.js';
import { AUTHORIZED_CHANNEL_ID, PLAYLISTS, composeDescription, contentHash, isApproved, loadManifest, resolveFile, saveManifest, validateManifest, type Manifest } from '../src/publisher/manifest.js';
import { assertAuthorizedChannel, likelyDuplicates, schedulePreflight, scheduledVideos, uploadPreflight } from '../src/publisher/publish.js';
import { EDITORIAL_TZ, formatLocal, localToUtc, proposeSlots, toApiTimestamp } from '../src/publisher/schedule.js';
import { loadState, saveRecord } from '../src/publisher/state.js';
import * as yt from '../src/publisher/youtube.js';

const args = process.argv.slice( 3 );
const confirm = args.includes( '--confirm' );
const rest = args.filter( a => !a.startsWith( '--' ) );

async function token( write: boolean ): Promise<string> {
  const client = loadClient();
  if ( !client ) throw new AuthError( 'No stored OAuth client. Run "npm run youtube:connect" first.' );
  return getAccessToken( client, { openUrl: () => {}, log: console.log, scopes: write ? WRITE_SCOPES : READ_SCOPES, interactive: false } );
}
const allIds = () => readdirSync( new URL( '../publish', import.meta.url ) ).filter( f => f.endsWith( '.json' ) && f !== 'state.json' ).map( f => f.slice( 0, -5 ) ).sort();
const mb = ( n: number ) => `${ ( n / 1e6 ).toFixed( 1 ) } MB`;
const bullets = ( title: string, items: string[] ) => items.length && console.log( `  ${ title }\n${ items.map( i => `    - ${ i }` ).join( '\n' ) }` );
function need( id?: string ): Manifest { if ( !id ) throw new Error( 'Missing video id.' ); return loadManifest( id ); }

async function preview() {
  const at = await token( false );
  const channels = await yt.getMyChannels( at );
  assertAuthorizedChannel( channels );
  const playlists = await yt.getPlaylistsById( Object.values( PLAYLISTS ), at );
  const existing = await yt.listChannelVideos( at );
  const state = loadState();
  const ids = rest.length ? rest : allIds();
  const manifests = ids.map( loadManifest );

  console.log( 'DRY RUN: nothing below has been written to YouTube.\n' );
  console.log( `Channel:   ${ channels[ 0 ].title } (${ channels[ 0 ].customUrl }) ${ channels[ 0 ].id }  [authorized channel matches]` );
  console.log( `Videos on channel: ${ existing.length }` );
  console.log( 'Playlists:' );
  for ( const [ key, id ] of Object.entries( PLAYLISTS ) ) {
    const p = playlists.find( x => x.id === id );
    console.log( `  ${ id }  ${ p ? `${ p.title } [${ p.itemCount } items, ${ p.privacy }${ p.channelId === AUTHORIZED_CHANNEL_ID ? ', owned by this channel' : ', OWNER MISMATCH' }]` : `NOT FOUND (${ key })` }` );
  }
  const booked = scheduledVideos( existing );
  console.log( `Already scheduled on channel: ${ booked.length ? '' : 'none' }` );
  for ( const v of booked ) console.log( `  ${ formatLocal( new Date( v.publishAt! ) ) } ${ EDITORIAL_TZ }  ${ v.id }  ${ v.title }` );

  const suggestions = proposeSlots( manifests.length + 3, booked.map( v => new Date( v.publishAt! ) ) );

  let writes = 0;
  for ( const m of manifests ) {
    const file = resolveFile( m.file );
    const { problems, warnings } = uploadPreflight( m, state, existing );
    const pl = playlists.find( p => p.id === m.playlistId );
    if ( !pl ) problems.push( 'Target playlist not found on this channel.' );
    // Slot checks only: pretend the upload happened, then keep the slot-related problems.
    const slotProblems = m.publishAtLocal
      ? schedulePreflight( m, { ...state, [ m.id ]: { status: 'uploaded', videoId: 'PENDING', contentHash: contentHash( m ), fileSize: 0, updatedAt: '' } }, existing ).problems.filter( p => !p.startsWith( 'Manifest is not approved' ) )
      : [ 'No publishAtLocal set: choose one of the free slots below.' ];
    console.log( `\n=== ${ m.id } ${ '='.repeat( 60 ) }` );
    console.log( `File:        ${ m.file }  (${ mb( statSync( file ).size ) })` );
    console.log( `Title:       ${ m.approved.title }` );
    console.log( `Category:    ${ m.categoryId }   Language: ${ m.language }   Made for kids: ${ m.madeForKids }   Visibility on upload: private` );
    console.log( `Tags:        ${ m.approved.tags.join( ', ' ) }` );
    console.log( `Playlist:    ${ m.playlistId } ${ pl?.title ?? '' }` );
    console.log( `Publish at:  ${ m.publishAtLocal ? `${ m.publishAtLocal } ${ EDITORIAL_TZ } = ${ toApiTimestamp( localToUtc( m.publishAtLocal ) ) }` : 'not set' }` );
    console.log( `Metadata:    generated -> approved ${ JSON.stringify( m.generated ) === JSON.stringify( m.approved ) ? '(identical)' : '(edited by human)' }; approval: ${ isApproved( m ) ? 'APPROVED' : m.approval ? 'STALE' : 'not approved' }` );
    console.log( `Description (as uploaded):\n${ composeDescription( m ).split( '\n' ).map( l => `    | ${ l }` ).join( '\n' ) }` );
    bullets( 'Blocking problems:', problems.concat( slotProblems ) );
    bullets( 'Warnings:', warnings );
    const rec = state[ m.id ];
    console.log( '  Writes that would occur:' );
    console.log( `    1. videos.insert (resumable, private, ${ mb( statSync( file ).size ) })  ${ rec ? `[state: ${ rec.status }]` : '' }` );
    console.log( `    2. playlistItems.insert -> ${ m.playlistId } (after checking it is not already a member)` );
    console.log( `    3. videos.update status.publishAt=${ m.publishAtLocal ? toApiTimestamp( localToUtc( m.publishAtLocal ) ) : '?' } (only on the separate schedule command)` );
    writes += 3;
    if ( likelyDuplicates( m, existing ).length ) console.log( '  Duplicate check: FOUND on channel' ); else console.log( '  Duplicate check: no title match among existing channel videos' );
  }
  console.log( `\nFree editorial slots (${ EDITORIAL_TZ }, Tue/Thu/Sat 18:00, >=24h ahead): ${ suggestions.join( ', ' ) }` );
  console.log( `Total YouTube write calls if everything is approved: ${ writes } across ${ manifests.length } videos (upload counts 1600 quota units each of the free 10,000/day; no billing).` );
}

function approve() {
  const m = need( rest[ 0 ] );
  const problems = validateManifest( m );
  if ( problems.length ) throw new Error( `Cannot approve:\n  - ${ problems.join( '\n  - ' ) }` );
  m.approval = { status: 'approved', approvedAt: new Date().toISOString(), contentHash: contentHash( m ) };
  saveManifest( m );
  console.log( `Approved ${ m.id } (${ m.approval.contentHash.slice( 0, 12 ) }). Any later edit to the approved text invalidates this.` );
}

async function upload() {
  const m = need( rest[ 0 ] );
  const at = await token( true );
  assertAuthorizedChannel( await yt.getMyChannels( at ) );
  const existing = await yt.listChannelVideos( at );
  const { problems, warnings } = uploadPreflight( m, loadState(), existing );
  bullets( 'Warnings:', warnings );
  if ( problems.length ) throw new Error( `Preflight failed:\n  - ${ problems.join( '\n  - ' ) }` );
  const file = resolveFile( m.file );
  const bytes = readFileSync( file );
  console.log( `${ confirm ? 'UPLOADING' : 'DRY RUN (add --confirm to upload)' }: ${ m.id } -> private, then playlist ${ m.playlistId }` );
  if ( !confirm ) return;

  let rec = loadState()[ m.id ];
  if ( rec && rec.fileSize !== bytes.length ) throw new Error( 'File size differs from the interrupted upload. Aborting.' );
  if ( !rec?.videoId ) {
    const meta = { title: m.approved.title, description: composeDescription( m ), tags: m.approved.tags, categoryId: m.categoryId, language: m.language, madeForKids: m.madeForKids };
    // Persist the session URI BEFORE sending bytes: whatever happens next, a rerun resumes this session instead of creating a second video.
    const resuming = rec?.status === 'uploading';
    const uploadUrl = rec?.uploadUrl ?? await yt.startResumableUpload( meta, bytes.length, at );
    rec = saveRecord( m.id, { status: 'uploading', uploadUrl, contentHash: contentHash( m ), fileSize: bytes.length } );
    let outcome: yt.UploadOutcome;
    try {
      outcome = resuming ? await yt.queryUpload( uploadUrl, bytes.length, at ) : await yt.sendUpload( uploadUrl, bytes, 0, at );
    } catch {
      console.log( 'Upload response uncertain; asking YouTube what it received (not retrying the whole upload)...' );
      outcome = await yt.queryUpload( uploadUrl, bytes.length, at );
    }
    if ( !outcome.done ) {
      console.log( `Session has ${ outcome.received } of ${ bytes.length } bytes; sending the remainder.` );
      outcome = await yt.sendUpload( uploadUrl, bytes, outcome.received, at );
    }
    if ( !outcome.done ) throw new Error( 'Upload incomplete; rerun the same command to resume.' );
    const v = outcome.video;
    if ( v.status?.privacyStatus !== 'private' ) console.log( `WARNING: video ${ v.id } privacy is ${ v.status?.privacyStatus }, expected private. Check it in YouTube Studio now.` );
    rec = saveRecord( m.id, { status: 'uploaded', videoId: v.id, uploadUrl: undefined } );
    console.log( `Uploaded: https://youtu.be/${ v.id } (private)` );
  }
  await addToPlaylist( m, rec.videoId!, at );
}

async function addToPlaylist( m: Manifest, videoId: string, at: string ) {
  let items = await yt.findPlaylistItems( m.playlistId, videoId, at );
  if ( items.length === 0 ) {
    const item = await yt.insertPlaylistItem( m.playlistId, videoId, at );
    if ( item.videoId !== videoId || item.playlistId !== m.playlistId ) throw new Error( 'Playlist item response does not match the request. Verify in YouTube Studio.' );
    items = await yt.findPlaylistItems( m.playlistId, videoId, at );
  }
  if ( items.length !== 1 ) throw new Error( `Expected exactly one playlist membership, found ${ items.length }.` );
  if ( loadState()[ m.id ]?.status !== 'scheduled' ) saveRecord( m.id, { status: 'playlisted', playlistItemId: items[ 0 ].id } );
  console.log( `In playlist ${ m.playlistId } (item ${ items[ 0 ].id }), verified.` );
}

async function inspect() {
  const m = need( rest[ 0 ] );
  const rec = loadState()[ m.id ];
  if ( !rec?.videoId ) throw new Error( 'No uploaded video recorded for this id.' );
  const at = await token( false );
  assertAuthorizedChannel( await yt.getMyChannels( at ) );
  const [ v ] = await yt.getVideos( [ rec.videoId ], at );
  if ( !v ) throw new Error( 'Video not found on YouTube.' );
  const inPlaylist = ( await yt.findPlaylistItems( m.playlistId, v.id, at ) ).length;
  const rows: [ string, unknown, unknown ][] = [
    [ 'title', v.title, m.approved.title ], [ 'description', v.description.trim(), composeDescription( m ) ], [ 'tags (order-insensitive)', [ ...v.tags ].sort().join( '|' ), [ ...m.approved.tags ].sort().join( '|' ) ],
    [ 'category', v.categoryId, m.categoryId ], [ 'language', v.language, m.language ], [ 'madeForKids', v.madeForKids, m.madeForKids ],
    [ 'playlist memberships', inPlaylist, 1 ],
  ];
  console.log( `https://youtu.be/${ v.id }   privacy: ${ v.privacy }   publishAt: ${ v.publishAt ?? 'none' }   upload: ${ v.uploadStatus }   duration: ${ v.durationIso }` );
  for ( const [ k, got, want ] of rows ) console.log( `  ${ got === want ? 'ok  ' : 'DIFF' } ${ k }${ got === want ? '' : `\n         on YouTube: ${ JSON.stringify( got ) }\n         manifest:   ${ JSON.stringify( want ) }` }` );
}

async function schedule() {
  const m = need( rest[ 0 ] );
  const at = await token( true );
  assertAuthorizedChannel( await yt.getMyChannels( at ) );
  const existing = await yt.listChannelVideos( at );
  const { problems } = schedulePreflight( m, loadState(), existing );
  if ( problems.length ) throw new Error( `Preflight failed:\n  - ${ problems.join( '\n  - ' ) }` );
  const when = toApiTimestamp( localToUtc( m.publishAtLocal! ) );
  const videoId = loadState()[ m.id ].videoId!;
  console.log( `${ confirm ? 'SCHEDULING' : 'DRY RUN (add --confirm to schedule)' }: ${ videoId } (${ m.approved.title }) goes public at ${ m.publishAtLocal } ${ EDITORIAL_TZ } = ${ when }` );
  if ( !confirm ) return;
  const v = await yt.scheduleVideo( videoId, when, at );
  if ( v.privacy !== 'private' || !v.publishAt || new Date( v.publishAt ).getTime() !== new Date( when ).getTime() ) throw new Error( 'Schedule response does not match. Run inspect.' );
  saveRecord( m.id, { status: 'scheduled', publishAt: when } );
  console.log( 'Scheduled and verified.' );
}

async function queue() {
  const at = await token( false );
  assertAuthorizedChannel( await yt.getMyChannels( at ) );
  const videos = ( await yt.listChannelVideos( at ) ).filter( v => v.privacy !== 'public' );
  const sched = videos.filter( v => v.publishAt ).sort( ( a, b ) => a.publishAt!.localeCompare( b.publishAt! ) );
  console.log( `Publication queue (${ EDITORIAL_TZ }):${ sched.length ? '' : ' no scheduled videos' }` );
  for ( const v of sched ) console.log( `  ${ formatLocal( new Date( v.publishAt! ) ) }  ${ v.id }  ${ v.title }` );
  const unsched = videos.filter( v => !v.publishAt );
  console.log( `Not public and not scheduled:${ unsched.length ? '' : ' none' }` );
  for ( const v of unsched ) console.log( `  [${ v.privacy }] ${ v.id }  ${ v.title }` );
}

const commands: Record<string, () => unknown> = { preview, approve, upload, inspect, schedule, queue };
const run = commands[ process.argv[ 2 ] ?? 'preview' ];
if ( !run ) { console.error( `Usage: youtube-publish <${ Object.keys( commands ).join( '|' ) }> [id] [--confirm]` ); process.exit( 2 ); }
Promise.resolve().then( run ).catch( error => { console.error( `\nFailed: ${ error instanceof Error ? error.message : 'unknown error' }` ); process.exit( 1 ); } );
