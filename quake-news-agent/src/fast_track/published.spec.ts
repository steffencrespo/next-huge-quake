import { describe, expect, it } from 'vitest';
import { nearbyPublished, publishedEventIds } from './published.js';

describe( 'published events', () => {
  it( 'collects event IDs of uploaded, scheduled and published videos only', () => {
    const manifests = [
      { id: 'vanuatu-m63-us6000u3jl', file: 'out/videos/us6000u3jl/video.mp4' },
      { id: 'ft', file: 'out/videos/x/video.mp4', fastTrack: { facts: { eventId: 'us7' } } },
      { id: 'draft', file: 'out/videos/us9/video.mp4' },
      { id: 'chile1960', file: 'out/edu/final/chile1960.mp4' }
    ];
    const state = { 'vanuatu-m63-us6000u3jl': { status: 'published' }, ft: { status: 'playlisted' }, chile1960: { status: 'scheduled' } };
    expect( publishedEventIds( manifests, state ) ).toEqual( [ 'us6000u3jl', 'us7' ] );
  } );

  it( 'finds a published event nearby under any of its USGS IDs, ignoring the event itself', () => {
    const nearby = { features: [
      { id: 'us6000u3jl', properties: { ids: ',us6000u3jl,pt26293000,' } },
      { id: 'self', properties: { ids: ',self,alias,' } },
      { id: 'other', properties: { ids: ',other,' } }
    ] };
    expect( nearbyPublished( nearby, [ 'pt26293000', 'alias' ], [ 'self' ] ) ).toEqual( [ 'pt26293000' ] );
    expect( nearbyPublished( nearby, [], [ 'self' ] ) ).toEqual( [] );
    expect( () => nearbyPublished( {}, [], [] ) ).toThrow( 'no features' );
  } );
} );
