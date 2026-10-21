import { describe, expect, it } from 'vitest';
import { CTA_LINE, EPISODE_LIST, EPISODES, episodeSeconds, placeholderCaptions, plannedBeats } from './episodes.js';
import { placeClips } from './narration.js';

describe( 'educational episodes 02 to 04', () => {
  it( 'have ordered scripts that end with the approved CTA and fit a Short', () => {
    for ( const ep of EPISODE_LIST ) {
      expect( ep.script.every( ( l, i ) => i === 0 || l.start > ep.script[i - 1].start ) ).toBe( true );
      expect( ep.script.at( -1 )!.text ).toBe( CTA_LINE.text );
      expect( new Set( ep.script.map( l => l.id ) ).size ).toBe( ep.script.length );
      expect( episodeSeconds( ep ) ).toBeGreaterThanOrEqual( 50 );
      expect( episodeSeconds( ep ) ).toBeLessThanOrEqual( 70 );
      expect( ep.script.slice( 0, -1 ).reduce( ( n, l ) => n + l.text.length, 0 ) ).toBeLessThan( 700 );
    }
  } );

  it( 'builds timed placeholder captions and beats from placed clips', () => {
    const ep = EPISODE_LIST[0];
    expect( placeholderCaptions( ep.script ).every( c => c.end > c.start && c.text.length <= 44 ) ).toBe( true );
    expect( plannedBeats( ep.script ).cta.start ).toBe( ep.script.at( -1 )!.start );
    const placed = placeClips( ep.script, ep.script.map( l => ( { id: l.id, file: `audio/edu/${l.id}.mp3`, duration: 2, captions: [ { text: l.text, start: 0, end: 2 } ] } ) ) );
    expect( placed.clips.length ).toBe( ep.script.length );
  } );
} );

describe( 'paced episode length', () => {
  const audio = ( pacing?: string ) => ( { ...placeClips( EPISODES.predict.script, EPISODES.predict.script.map( l => ( { id: l.id, file: `audio/edu/${l.id}.mp3`, duration: 2, captions: [ { text: l.text, start: 0, end: 2 } ] } ) ), { gap: 0.04 } ), musicFile: 'audio/m.mp3', musicCredit: 'm', pacing } );
  it( 'keeps the storyboard length as a floor for natural pacing only', () => {
    expect( episodeSeconds( EPISODES.predict, audio() ) ).toBe( EPISODES.predict.baseSeconds );
    expect( episodeSeconds( EPISODES.predict, audio( 'fast' ) ) ).toBeLessThan( EPISODES.predict.baseSeconds );
  } );
} );
