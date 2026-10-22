import { describe, expect, it } from 'vitest';
import { checkVideoText } from './guard.js';
import { parsePagerImpact, pagerUrls } from './impact.js';
import { describePlace, manifestIdFor, videoTextFor } from './templates.js';
import { TIBET_NARRATION, tibetFacts, tibetImpact } from './testing.js';

describe( 'templates', () => {
  it( 'writes a deterministic title, description and tags for the Tibet M7.0', () => {
    const text = videoTextFor( tibetFacts(), tibetImpact() );
    expect( text.title ).toBe( 'M7.0 Earthquake Strikes Near Nagqu, China' );
    expect( text.description ).toContain( 'struck 191 km east-northeast of Nagqu, China, on October 22, 2026 at 14:33 UTC, at a depth of 18 km' );
    expect( text.description ).toContain( 'The orange level comes from the modeled estimate of economic losses; the modeled estimate of fatalities is at the yellow level.' );
    expect( text.description ).toContain( 'not a report of what actually happened' );
    expect( text.description ).not.toMatch( /confirmed (casualties|damage)|no casualties/i );
    expect( text.description.endsWith( '#Shorts #earthquake #China #USGS' ) ).toBe( true );
    expect( text.tags ).toEqual( [ 'earthquake', 'earthquakes', 'China earthquake', 'M7.0 earthquake', 'magnitude 7.0', 'Nagqu', 'USGS', 'latest earthquakes', 'earthquake news', 'shorts' ] );
    expect( videoTextFor( tibetFacts(), tibetImpact() ) ).toEqual( text );
  } );

  it( 'passes the deterministic fact check, and the check catches unsupported impact claims', () => {
    expect( checkVideoText( tibetFacts(), videoTextFor( tibetFacts(), tibetImpact() ), TIBET_NARRATION ) ).toEqual( [] );
    const automatic = tibetFacts( { status: 'automatic', tsunamiFlag: true } );
    expect( checkVideoText( automatic, videoTextFor( automatic, tibetImpact() ), TIBET_NARRATION ) ).toEqual( [] );
    const bad = videoTextFor( tibetFacts(), tibetImpact() );
    expect( checkVideoText( tibetFacts(), { ...bad, title: 'Deadly M7.0 Earthquake Kills Dozens Near Nagqu' }, TIBET_NARRATION ).length ).toBeGreaterThan( 0 );
    expect( checkVideoText( tibetFacts(), { ...bad, title: 'M7.4 Earthquake Strikes Near Nagqu, China' }, TIBET_NARRATION ).length ).toBeGreaterThan( 0 );
  } );

  it( 'says plainly when there is no PAGER alert, and keeps the same driver when both levels match', () => {
    expect( videoTextFor( tibetFacts( { pagerAlert: null } ), null ).description ).toContain( 'had not issued a PAGER alert' );
    expect( videoTextFor( tibetFacts(), tibetImpact( { fatalityLevel: 'orange' } ) ).description ).not.toContain( 'comes from' );
  } );

  it( 'handles places without a distance and builds a safe manifest id', () => {
    expect( describePlace( 'south of the Fiji Islands' ) ).toEqual( { near: 'south of the Fiji Islands', spoken: 'south of the Fiji Islands', country: null } );
    expect( videoTextFor( tibetFacts( { place: 'south of the Fiji Islands' } ), null ).title ).toBe( 'M7.0 Earthquake Strikes South of the Fiji Islands' );
    expect( manifestIdFor( tibetFacts() ) ).toBe( 'nagqu-china-m70-us6000u43g' );
    expect( manifestIdFor( tibetFacts( { place: '12 km S of Ōfunato, Japan', magnitude: 6.25 } ) ) ).toMatch( /^ofunato-japan-m6\d-us6000u43g$/ );
  } );
} );

describe( 'PAGER impact', () => {
  it( 'reads the fatality and economic levels and the population at intensity VI+', () => {
    const alerts = { fatality: { level: 'yellow' }, economic: { level: 'orange' } };
    const exposures = { population_exposure: { mmi: [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ], aggregated_exposure: [ 0, 0, 10510, 721695, 85811, 38649, 4113, 2688, 0, 0 ] } };
    expect( parsePagerImpact( alerts, exposures, 8 ) ).toEqual( tibetImpact() );
    expect( parsePagerImpact( null, null, null ) ).toEqual( { fatalityLevel: null, economicLevel: null, exposedMmi6Plus: null, maxMmi: null } );
  } );

  it( 'finds the PAGER files in an event detail', () => {
    const detail = { properties: { products: { losspager: [ { properties: { maxmmi: '8' }, contents: { 'json/alerts.json': { url: 'a' }, 'json/exposures.json': { url: 'e' } } } ] } } };
    expect( pagerUrls( detail ) ).toEqual( { alerts: 'a', exposures: 'e', maxMmi: 8 } );
    expect( pagerUrls( { properties: { products: {} } } ) ).toBeNull();
  } );
} );
