import { describe, expect, it } from 'vitest';
import { MUSIC, DEFAULT_MUSIC, RETIRED_MUSIC_FILES } from '../audio/music.js';
import { episodeSeconds, plannedBeats } from '../edu/episodes.js';
import { KIDS_EPISODE, KIDS_MUSIC, KIDS_VOICE } from './config.js';
import { creditsPerCharacter, kidsCredits } from './credits.js';
import { KIDS_SCRIPT, kidsScriptCharacters } from './script.js';

const text = KIDS_SCRIPT.map( l => l.text ).join( ' ' );

describe( 'kids series configuration', () => {
  it( 'uses the Max voice and keeps the adult music defaults untouched', () => {
    expect( KIDS_VOICE.id ).toBe( '467tX2b9Bky3cD6jXpNa' );
    expect( Object.values( MUSIC ).map( m => m.file ) ).not.toContain( KIDS_MUSIC.file );
    expect( DEFAULT_MUSIC ).toBe( 'deified' );
    expect( RETIRED_MUSIC_FILES ).not.toContain( KIDS_MUSIC.file );
    expect( KIDS_MUSIC.file ).toMatch( /summer-thyme/ );
  } );

  it( 'credits the music and carries the Output.ai block', () => {
    const credits = kidsCredits( false );
    expect( credits ).toContain( '"Summer Thyme" by Jeremy Korpas.' );
    expect( credits ).toContain( 'Source: YouTube Audio Library.' );
    expect( credits ).toMatch( /Production Technology[\s\S]*Output\.ai[\s\S]*https:\/\/output\.ai/ );
  } );

  it( 'estimates credits per character by model family', () => {
    expect( creditsPerCharacter( 'eleven_multilingual_v2' ) ).toBe( 1 );
    expect( creditsPerCharacter( 'eleven_flash_v2_5' ) ).toBe( 0.5 );
  } );
} );

describe( 'kids script', () => {
  it( 'has unique ids, ordered starts and a Shorts-friendly length', () => {
    expect( new Set( KIDS_SCRIPT.map( l => l.id ) ).size ).toBe( KIDS_SCRIPT.length );
    expect( KIDS_SCRIPT.every( ( l, i ) => i === 0 || l.start > KIDS_SCRIPT[i - 1].start ) ).toBe( true );
    expect( kidsScriptCharacters() ).toBeLessThan( 700 );
    const seconds = episodeSeconds( KIDS_EPISODE );
    expect( seconds ).toBeGreaterThanOrEqual( 45 );
    expect( seconds ).toBeLessThanOrEqual( 60 );
  } );

  it( 'covers the six science beats and every scene id the composition uses', () => {
    const beats = plannedBeats( KIDS_SCRIPT );
    for ( const id of [ 'hook', 'puzzle', 'plates', 'slow', 'stuck', 'stress', 'snap', 'energy', 'waves', 'shake', 'learn', 'end', 'cta' ] ) {
      expect( beats[id] ).toBeDefined();
    }
    expect( text ).toMatch( /tectonic plates/ );
    expect( text ).toMatch( /stuck/ );
    expect( text ).toMatch( /[Ss]tress builds/ );
    expect( text ).toMatch( /seismic waves/ );
  } );

  it( 'stays calm and makes no prediction or prevention claims', () => {
    expect( text ).not.toMatch( /destroy|collaps|deadly|die|kill|scary|terrif|danger|disaster|predict|prevent/i );
  } );
} );
