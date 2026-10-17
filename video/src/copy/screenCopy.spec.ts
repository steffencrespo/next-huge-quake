import { describe, expect, it } from 'vitest';
import { DEMO_AS_OF_UTC, FIXTURES } from '../fixtures/index.js';
import type { Fixture } from '../fixtures/index.js';
import { CONTEXT_PRIORITY, buildVideoSpec } from '../spec/build.js';
import { contextItemSupported } from '../spec/schema.js';
import type { VideoSpec } from '../spec/schema.js';
import { PAGER_CAVEAT, TSUNAMI_CAVEAT } from './caveats.js';
import { checkScreenText } from './guard.js';
import { CARD_LIMITS, allScreenText, buildScreenCopy } from './screenCopy.js';

const specFor = ( fixture: Fixture, mapMode: 'live' | 'static' = 'live', asOfUtc = DEMO_AS_OF_UTC ) => buildVideoSpec( fixture, { asOfUtc, mapMode } );
const copyFor = ( key: keyof typeof FIXTURES, mapMode: 'live' | 'static' = 'live' ) => buildScreenCopy( specFor( FIXTURES[key], mapMode ) );

/** A spec whose context scene shows every card the facts support (in groups of three), for wording tests. */
function allCards( fixture: Fixture ) {
  const spec = specFor( fixture );
  const supported = CONTEXT_PRIORITY.filter( item => contextItemSupported( item, spec.event ) );
  const groups = [ supported.slice( 0, 3 ), supported.slice( 3 ) ].filter( g => g.length > 0 );
  return groups.flatMap( items => buildScreenCopy( {
    ...spec, scenes: [ spec.scenes[0], spec.scenes[1], { ...spec.scenes[2], items }, spec.scenes[3] ] as VideoSpec['scenes']
  } ).context.cards );
}

describe( 'buildScreenCopy', () => {
  it( 'shows the Noto facts', () => {
    const copy = copyFor( 'noto' );
    expect( copy.hook ).toEqual( { kicker: 'MAGNITUDE', magnitude: '7.5', magType: 'mww', place: 'Noto Peninsula, Japan', when: 'January 1, 2024 · 07:10 UTC' } );
    expect( copy.facts.rows.map( r => [ r.label, r.value, r.detail ] ) ).toEqual( [
      [ 'Magnitude', '7.5', 'Moment magnitude (mww)' ],
      [ 'Depth', '10 km', '6.2 mi' ],
      [ 'Time', '07:10 UTC', 'January 1, 2024' ],
      [ 'Epicenter', '37.49°N, 137.27°E', 'USGS location' ]
    ] );
    expect( copy.chrome.updated ).toBe( 'USGS update · Oct 10, 2026 · 06:13 UTC' );
    expect( copy.chrome.preliminary ).toBeNull();
    expect( copy.chrome.testData ).toBeNull();
  } );

  it( 'credits USGS everywhere and the map only when a map is shown', () => {
    expect( copyFor( 'noto' ).chrome.source ).toBe( 'Source: USGS · Map: Natural Earth' );
    expect( copyFor( 'noto', 'static' ).chrome.source ).toBe( 'Source: USGS' );
    expect( copyFor( 'noto', 'static' ).closing.mapCredit ).toBeNull();
    expect( copyFor( 'noto' ).closing.source ).toBe( 'Source: U.S. Geological Survey' );
    expect( copyFor( 'noto' ).closing.url ).toBe( 'earthquake.usgs.gov/earthquakes/eventpage/us6000m0xl' );
  } );

  it( 'presents PAGER as a modeled potential impact level', () => {
    const pager = copyFor( 'kamchatka' ).context.cards.find( c => c.item === 'pager' )!;
    expect( [ pager.title, pager.value, pager.line, pager.note ] ).toEqual( [ 'USGS PAGER', 'RED', 'Highest impact alert level.', PAGER_CAVEAT ] );
    expect( PAGER_CAVEAT ).toBe( 'Based on modeled potential impacts, not confirmed damage or casualties.' );
  } );

  it( 'describes the tsunami flag only as the USGS flag, with no warning, occurrence or external resource', () => {
    const tsunami = allCards( FIXTURES.noto ).find( c => c.item === 'tsunami-flag' )!;
    expect( [ tsunami.title, tsunami.value, tsunami.line, tsunami.note ] ).toEqual( [ 'USGS TSUNAMI FLAG', 'SET', 'Flag present in USGS event data.', TSUNAMI_CAVEAT ] );
    expect( TSUNAMI_CAVEAT ).toBe( 'Does not confirm a tsunami or an active warning.' );
    const text = [ tsunami.line, tsunami.extended ?? '' ].join( ' ' );
    expect( text ).not.toMatch( /tsunami\.gov|https?:|www\.|\blinked\b|warning|occurred/i );
  } );

  it( 'keeps felt reports distinct from people', () => {
    const felt = copyFor( 'noto' ).context.cards.find( c => c.item === 'felt-reports' )!;
    expect( felt.value ).toBe( '422' );
    expect( felt.note ).toBe( 'A count of reports, not of individual people.' );
  } );

  it( 'uses the approved depth explanation', () => {
    const depth = copyFor( 'noto' ).context.cards.find( c => c.item === 'depth-class' )!;
    expect( depth.value ).toBe( 'SHALLOW' );
    expect( depth.note ).toBe( 'Earthquake depth indicates where the rupture began beneath the surface.' );
  } );

  it( 'keeps on-screen card text within the mobile length limits', () => {
    for ( const fixture of Object.values( FIXTURES ) ) {
      for ( const card of allCards( fixture ) ) {
        expect( card.value.length, card.value ).toBeLessThanOrEqual( CARD_LIMITS.value );
        expect( card.line.length, card.line ).toBeLessThanOrEqual( CARD_LIMITS.line );
        expect( ( card.note ?? '' ).length, card.note ?? '' ).toBeLessThanOrEqual( CARD_LIMITS.note );
      }
    }
  } );

  it( 'marks historical events as ARCHIVE by origin time', () => {
    expect( copyFor( 'noto' ).chrome.archive ).toEqual( { badge: 'ARCHIVE', detail: 'Earthquake of January 1, 2024' } );
    expect( copyFor( 'kamchatka' ).chrome.archive?.badge ).toBe( 'ARCHIVE' );
    const recent = buildScreenCopy( specFor( FIXTURES.noto, 'live', '2024-01-02T00:00:00.000Z' ) );
    expect( recent.chrome.archive ).toBeNull();
  } );

  it( 'flags the coordinate fallback so layouts can avoid repeating it', () => {
    expect( copyFor( 'noto' ).location ).toEqual( { name: 'Noto Peninsula, Japan', coordinates: '37.49°N, 137.27°E' } );
    const copy = copyFor( 'preliminaryTest' );
    expect( copy.location ).toEqual( { name: null, coordinates: '52.49°N, 160.24°E' } );
    expect( copy.hook.place ).toBe( 'near 52.49°N, 160.24°E' );
  } );

  it( 'labels unreviewed data as preliminary everywhere and handles missing facts', () => {
    const copy = copyFor( 'preliminaryTest' );
    expect( copy.chrome.preliminary ).toEqual( { badge: 'PRELIMINARY', detail: 'USGS review status not available' } );
    expect( copy.chrome.testData ).toBe( 'TEST DATA · NOT FOR PUBLICATION' );
    expect( copy.chrome.updated ).toBe( 'USGS update time not available' );
    expect( copy.facts.lowerThird.kicker ).toBe( 'PRELIMINARY USGS DATA' );
    expect( copy.facts.rows[0].detail ).toBe( 'Magnitude type not reported' );
    expect( copy.facts.rows[1] ).toEqual( { label: 'Depth', value: 'Not reported', detail: null } );
    expect( copy.context.cards.map( c => c.value ) ).toEqual( [ 'PRELIMINARY' ] );
    expect( copy.closing.disclaimers ).toEqual( [ 'Preliminary data. USGS review status not available.', 'Data may be revised as USGS updates this event.' ] );
  } );

  it( 'labels automatic solutions as not yet reviewed', () => {
    const fixture = { ...FIXTURES.noto, event: { ...FIXTURES.noto.event, status: 'automatic' as const } };
    expect( buildScreenCopy( specFor( fixture ) ).chrome.preliminary?.detail ).toBe( 'Automatic USGS solution, not yet reviewed' );
  } );
} );

describe( 'guard', () => {
  for ( const key of Object.keys( FIXTURES ) as ( keyof typeof FIXTURES )[] ) {
    it( `passes all ${key} screen copy, including every supported card`, () => {
      const spec = specFor( FIXTURES[key] );
      const cards = allCards( FIXTURES[key] ).flatMap( c => [ c.title, c.value, c.line, c.note ?? '', c.extended ?? '' ] );
      expect( checkScreenText( [ ...allScreenText( buildScreenCopy( spec ) ), ...cards ], spec.event ) ).toEqual( [] );
    } );
  }

  it( 'flags numbers that do not come from the facts', () => {
    const { event } = specFor( FIXTURES.noto );
    expect( checkScreenText( [ 'Magnitude 7.8' ], event ) ).toHaveLength( 1 );
    expect( checkScreenText( [ 'At a depth of 15 km' ], event ) ).toHaveLength( 1 );
    expect( checkScreenText( [ 'Magnitude 7.5 at 10 km' ], event ) ).toEqual( [] );
  } );

  it( 'flags unsupported claims', () => {
    const { event } = specFor( FIXTURES.noto );
    for ( const text of [ 'Dozens killed', 'Buildings collapsed', 'Heavy damage', 'Aftershocks expected', 'A tsunami struck the coast', 'A tsunami occurred', 'Tsunami warning issued' ] ) {
      expect( checkScreenText( [ text ], event ), text ).not.toEqual( [] );
    }
  } );

  it( 'exempts the fixed caveats only verbatim', () => {
    const { event } = specFor( FIXTURES.noto );
    expect( checkScreenText( [ PAGER_CAVEAT, TSUNAMI_CAVEAT ], event ) ).toEqual( [] );
    expect( checkScreenText( [ 'Based on modeled potential impacts, with confirmed damage and casualties.' ], event ) ).not.toEqual( [] );
    expect( checkScreenText( [ `${TSUNAMI_CAVEAT} A tsunami occurred.` ], event ) ).not.toEqual( [] );
  } );
} );
