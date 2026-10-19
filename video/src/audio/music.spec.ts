import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MUSIC, MUSIC, RETIRED_MUSIC_FILES } from './music.js';
import { notoSoundtrack } from './noto.js';
import { panamaSoundtrack } from './panama.js';

const root = join( import.meta.dirname, '..', '..' );
const sources = ( dir: string ): string[] => readdirSync( dir ).flatMap( name => {
  const path = join( dir, name );
  return statSync( path ).isDirectory() ? sources( path ) : /\.(ts|tsx)$/.test( name ) ? [ path ] : [];
} );

describe( 'music policy', () => {
  it( 'every allowed track is from the YouTube Audio Library and none is retired', () => {
    for ( const track of Object.values( MUSIC ) ) {
      expect( track.credit ).toMatch( /Source: YouTube Audio Library/ );
      expect( RETIRED_MUSIC_FILES ).not.toContain( track.file );
    }
  } );
  it( 'the default music and both news soundtracks use the default track', () => {
    expect( notoSoundtrack.musicFile ).toBe( MUSIC[DEFAULT_MUSIC].file );
    expect( panamaSoundtrack.musicFile ).toBe( MUSIC[DEFAULT_MUSIC].file );
    expect( notoSoundtrack.musicCredit ).toBe( MUSIC[DEFAULT_MUSIC].credit );
  } );
  it( 'no rendering source references the retired track', () => {
    const offenders = [ ...sources( join( root, 'src' ) ), ...sources( join( root, 'scripts' ) ) ]
      .filter( f => !f.endsWith( 'music.ts' ) && !f.endsWith( 'music.spec.ts' ) )
      .filter( f => /legendary-kulakovka|Kulakovka/i.test( readFileSync( f, 'utf8' ) ) );
    expect( offenders ).toEqual( [] );
  } );
} );
