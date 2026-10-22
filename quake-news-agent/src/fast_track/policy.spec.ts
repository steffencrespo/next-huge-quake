import { describe, expect, it } from 'vitest';
import { loadFastTrackConfig } from './config.js';
import { decide, distanceKm, isCandidate, tierOf } from './policy.js';
import type { PolicyInput } from './policy.js';
import { TIBET_NOW, tibetFacts, tibetImpact } from './testing.js';

const config = loadFastTrackConfig( {} );
const input = ( over: Partial<PolicyInput> = {} ): PolicyInput =>
  ( { facts: tibetFacts(), type: 'earthquake', sig: 1000, impact: tibetImpact(), nearbyPublished: [], nowMs: TIBET_NOW, ...over } );

describe( 'tiers', () => {
  it( 'publishes the Tibet M7.0 (tier A) automatically', () => {
    expect( decide( input(), config ) ).toEqual( {
      autoPublish: true, tier: 'A', signals: [ 'pager_orange', 'significance_1000', 'exposed_mmi6_45450' ], reasons: []
    } );
  } );

  it( 'does not treat magnitude alone as relevance: an M7 with no impact signal is manual', () => {
    const remote = input( { facts: tibetFacts( { pagerAlert: 'green' } ), sig: 550, impact: tibetImpact( { exposedMmi6Plus: 0 } ) } );
    expect( decide( remote, config ) ).toMatchObject( { autoPublish: false, tier: 'none', reasons: [ 'no_impact_signal' ] } );
  } );

  it( 'needs a populated-area or impact signal between M6.0 and M6.9', () => {
    const m6 = ( over: Partial<PolicyInput> ) => decide( input( { facts: tibetFacts( { magnitude: 6.4, pagerAlert: 'green' } ), sig: 500, impact: tibetImpact( { exposedMmi6Plus: 0 } ), ...over } ), config );
    expect( m6( {} ) ).toMatchObject( { autoPublish: false, tier: 'none', reasons: [ 'no_impact_signal' ] } );
    expect( m6( { sig: 650 } ) ).toMatchObject( { autoPublish: true, tier: 'B' } );
    expect( m6( { impact: tibetImpact( { exposedMmi6Plus: 12_000 } ) } ) ).toMatchObject( { autoPublish: true, tier: 'B' } );
    expect( m6( { impact: tibetImpact( { exposedMmi6Plus: 9_999 } ) } ).autoPublish ).toBe( false );
    expect( m6( { facts: tibetFacts( { magnitude: 6.4, pagerAlert: 'yellow' } ) } ) ).toMatchObject( { autoPublish: true, tier: 'B', signals: [ 'pager_yellow' ] } );
  } );

  it( 'recognizes the M5.5-5.9 populated-area rule as tier C but keeps it manual in v1', () => {
    const c = decide( input( { facts: tibetFacts( { magnitude: 5.7, pagerAlert: 'yellow' } ), sig: 400 } ), config );
    expect( c ).toMatchObject( { autoPublish: false, tier: 'C', reasons: [ 'tier_c_manual_in_v1' ] } );
    expect( tierOf( input( { facts: tibetFacts( { magnitude: 5.7, pagerAlert: 'green' } ), sig: 400 } ) ).tier ).toBe( 'none' );
  } );
} );

describe( 'exclusions', () => {
  it( 'keeps PAGER red manual', () => {
    expect( decide( input( { facts: tibetFacts( { pagerAlert: 'red' } ) } ), config ).reasons ).toEqual( [ 'pager_red' ] );
  } );

  it( 'keeps sequences near a recent publication manual, and fails closed when that cannot be checked', () => {
    expect( decide( input( { nearbyPublished: [ 'us6000u3bc' ] } ), config ).reasons ).toEqual( [ 'near_recent_publication' ] );
    expect( decide( input( { nearbyPublished: null } ), config ).reasons ).toEqual( [ 'sequence_check_unavailable' ] );
  } );

  it( 'waits for PAGER, refuses deleted, non-earthquake and stale events', () => {
    expect( decide( input( { impact: null } ), config ).reasons ).toEqual( [ 'pager_pending' ] );
    expect( decide( input( { facts: tibetFacts( { status: 'deleted' } ) } ), config ).reasons ).toContain( 'deleted' );
    expect( decide( input( { type: 'explosion' } ), config ).reasons ).toContain( 'not_an_earthquake' );
    expect( decide( input( { nowMs: TIBET_NOW + 6 * 3_600_000 } ), config ).reasons ).toEqual( [ 'too_old' ] );
  } );

  it( 'sends the event to a human when USGS revised it after production', () => {
    const produced = tibetFacts();
    expect( decide( input( { produced } ), config ).autoPublish ).toBe( true );
    expect( decide( input( { produced, facts: tibetFacts( { magnitude: 7.1 } ) } ), config ).reasons ).toEqual( [] );
    expect( decide( input( { produced, facts: tibetFacts( { magnitude: 7.2 } ) } ), config ).reasons ).toEqual( [ 'magnitude_revised' ] );
    expect( decide( input( { produced, facts: tibetFacts( { pagerAlert: 'yellow' } ) } ), config ).reasons ).toEqual( [ 'pager_revised' ] );
    expect( decide( input( { produced, facts: tibetFacts( { latitude: 32.7 } ) } ), config ).reasons ).toEqual( [ 'location_revised' ] );
  } );
} );

describe( 'helpers', () => {
  it( 'measures great-circle distance', () => {
    expect( distanceKm( { latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 } ) ).toBeCloseTo( 111.2, 0 );
  } );

  it( 'produces with the fast-track flag only events that could qualify', () => {
    expect( isCandidate( tibetFacts(), 'earthquake' ) ).toBe( true );
    expect( isCandidate( tibetFacts( { magnitude: 5.9 } ), 'earthquake' ) ).toBe( false );
    expect( isCandidate( tibetFacts( { pagerAlert: 'red' } ), 'earthquake' ) ).toBe( false );
  } );

  it( 'is off and private unless explicitly enabled, and fails closed without prices', () => {
    expect( config ).toMatchObject( { enabled: false, finalPrivacy: 'private', budget: null } );
    expect( config.budgetProblems ).toContain( 'FAST_TRACK_ELEVENLABS_USD_PER_1K_CHARS is not set' );
    expect( loadFastTrackConfig( { FAST_TRACK_ENABLED: 'yes', FAST_TRACK_FINAL_PRIVACY: 'PUBLIC' } ) ).toMatchObject( { enabled: false, finalPrivacy: 'public' } );
  } );
} );
