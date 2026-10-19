/**
 * Shared narration library for the educational Shorts: approved ElevenLabs clips, reused instead of regenerated.
 *
 * A clip is identified by what determines the audio: the normalized text, the voice, the model and the output format
 * (the request sends no other voice settings, so the provider defaults apply to every clip). The same key always finds
 * the same approved MP3 and character alignment, whichever episode asks for it. Files live in assets/audio/edu/library/
 * (git-ignored, like all licensed audio) as <key>.mp3 and <key>.alignment.json, with manifest.json recording what each
 * key is. Existing per-episode caches are copied in, never moved or altered.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type ClipIdentity = { text: string; voiceId: string; modelId: string; outputFormat: string };
export type LibraryEntry = ClipIdentity & { source: string; characters: number };
export type Manifest = Record<string, LibraryEntry>;

/** Unicode NFC, whitespace collapsed and trimmed. Nothing else is touched: other changes (quotes, digits) change the speech. */
export const normalizeText = ( text: string ) => text.normalize( 'NFC' ).replace( /\s+/g, ' ' ).trim();

export const clipKey = ( identity: ClipIdentity ): string =>
  createHash( 'sha256' ).update( JSON.stringify( [ normalizeText( identity.text ), identity.voiceId, identity.modelId, identity.outputFormat ] ) ).digest( 'hex' ).slice( 0, 16 );

export type Library = {
  dir: string;
  manifest: () => Manifest;
  has: ( identity: ClipIdentity ) => boolean;
  paths: ( identity: ClipIdentity ) => { key: string; mp3: string; alignment: string };
  /** Copies a clip into the library (the source files stay untouched). An existing key is never overwritten. */
  addFiles: ( identity: ClipIdentity, source: string, mp3: string, alignment: string ) => boolean;
  /** Stores freshly generated audio. */
  addGenerated: ( identity: ClipIdentity, mp3: Uint8Array, alignment: unknown, source: string ) => void;
};

export function openLibrary( dir: string ): Library {
  const manifestPath = join( dir, 'manifest.json' );
  const manifest = (): Manifest => ( existsSync( manifestPath ) ? JSON.parse( readFileSync( manifestPath, 'utf8' ) ) : {} );
  const paths = ( identity: ClipIdentity ) => {
    const key = clipKey( identity );
    return { key, mp3: join( dir, `${key}.mp3` ), alignment: join( dir, `${key}.alignment.json` ) };
  };
  const has = ( identity: ClipIdentity ) => {
    const p = paths( identity );
    return p.key in manifest() && existsSync( p.mp3 ) && existsSync( p.alignment );
  };
  const record = ( identity: ClipIdentity, source: string ) => {
    const all = manifest();
    all[clipKey( identity )] = { ...identity, text: normalizeText( identity.text ), source, characters: normalizeText( identity.text ).length };
    writeFileSync( manifestPath, `${JSON.stringify( all, null, 2 )}\n` );
  };
  return {
    dir,
    manifest,
    has,
    paths,
    addFiles( identity, source, mp3, alignment ) {
      if ( has( identity ) ) {
        return false;
      }
      mkdirSync( dir, { recursive: true } );
      const p = paths( identity );
      copyFileSync( mp3, p.mp3 );
      copyFileSync( alignment, p.alignment );
      record( identity, source );
      return true;
    },
    addGenerated( identity, mp3, alignment, source ) {
      mkdirSync( dir, { recursive: true } );
      const p = paths( identity );
      writeFileSync( p.mp3, mp3 );
      writeFileSync( p.alignment, `${JSON.stringify( alignment )}\n` );
      record( identity, source );
    }
  };
}
