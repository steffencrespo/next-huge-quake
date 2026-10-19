import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { clipKey, normalizeText, openLibrary } from './library.js';

const id = { text: 'Why does the ground suddenly start shaking?', voiceId: 'v1', modelId: 'm1', outputFormat: 'mp3_44100_128' };

describe( 'narration library', () => {
  it( 'matches on normalized text, voice, model and format only', () => {
    expect( normalizeText( '  Why  does\nthe ground ' ) ).toBe( 'Why does the ground' );
    expect( clipKey( { ...id, text: `  ${id.text.replace( ' ', '  ' )} ` } ) ).toBe( clipKey( id ) );
    expect( clipKey( { ...id, voiceId: 'v2' } ) ).not.toBe( clipKey( id ) );
    expect( clipKey( { ...id, modelId: 'm2' } ) ).not.toBe( clipKey( id ) );
    expect( clipKey( { ...id, text: 'Why does the ground suddenly start shaking.' } ) ).not.toBe( clipKey( id ) );
  } );

  it( 'copies a clip in without touching the source and never overwrites an existing key', () => {
    const dir = mkdtempSync( join( tmpdir(), 'lib-' ) );
    const src = mkdtempSync( join( tmpdir(), 'src-' ) );
    writeFileSync( join( src, 'a.mp3' ), 'AUDIO' );
    writeFileSync( join( src, 'a.json' ), '{}' );
    const lib = openLibrary( join( dir, 'library' ) );
    expect( lib.has( id ) ).toBe( false );
    expect( lib.addFiles( id, 'ep01', join( src, 'a.mp3' ), join( src, 'a.json' ) ) ).toBe( true );
    expect( lib.has( id ) ).toBe( true );
    expect( readFileSync( join( src, 'a.mp3' ), 'utf8' ) ).toBe( 'AUDIO' );
    writeFileSync( join( src, 'b.mp3' ), 'OTHER' );
    expect( lib.addFiles( id, 'ep02', join( src, 'b.mp3' ), join( src, 'a.json' ) ) ).toBe( false );
    expect( readFileSync( lib.paths( id ).mp3, 'utf8' ) ).toBe( 'AUDIO' );
    expect( lib.manifest()[clipKey( id )].source ).toBe( 'ep01' );
  } );
} );
