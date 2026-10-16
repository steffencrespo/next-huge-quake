import { describe, expect, it } from 'vitest';
import { checkDraft, combineValidation, countWords, placeKeywords, revisionFeedback } from './validation.js';
import { normalizeUsgsResponse } from './normalize.js';
import eventFixture from './__fixtures__/event_us6000m0xl.json';
import type { NewsDraft, QuakeFacts } from './types.js';

// Noto Peninsula, 2024-01-01T07:10:09Z (Monday), M7.5 mww, 10 km deep, red PAGER, tsunami flag set, reviewed
const facts = normalizeUsgsResponse( eventFixture ) as QuakeFacts;

const goodDraft: NewsDraft = {
  headline: 'Magnitude 7.5 earthquake strikes Noto Peninsula, Japan',
  dek: 'The U.S. Geological Survey reports a powerful quake near the coast of central Japan on New Year\'s Day.',
  article: [
    'A magnitude 7.5 earthquake struck the Noto Peninsula in Japan on Monday, January 1, 2024, at 07:10 UTC, ' +
      'according to the U.S. Geological Survey.',
    'The USGS located the quake at a depth of 10 kilometers (6.2 miles), near 37.49 degrees north and 137.27 degrees east. ' +
      'The agency has reviewed the event data.',
    'USGS issued a red PAGER alert for the earthquake, a model estimate of potential fatalities or economic losses. ' +
      'The agency also lists tsunami information for the event. In total, 422 reports were submitted through the USGS ' +
      '"Did You Feel It?" system, and further details are available on the USGS event page.'
  ].join( '\n\n' ),
  narration: 'A powerful magnitude 7.5 earthquake struck Japan\'s Noto Peninsula on January 1, 2024. ' +
    'The U.S. Geological Survey says the quake hit at a shallow depth of about 10 kilometers. ' +
    'USGS issued a red alert, its model estimate of potential fatalities or economic losses. ' +
    'Tsunami information is listed for the event.'
};

const withArticle = ( article: string, overrides: Partial<NewsDraft> = {} ): NewsDraft =>
  ( { ...goodDraft, article, ...overrides } );

const replaceInArticle = ( search: string, replacement: string ) => {
  expect( goodDraft.article ).toContain( search );
  return withArticle( goodDraft.article.replace( search, replacement ) );
};

describe( 'checkDraft', () => {
  it( 'passes a grounded draft', () => {
    const report = checkDraft( facts, goodDraft );
    expect( report ).toMatchObject( { contradictions: [], unsupportedClaims: [], missing: [], shapeIssues: [] } );
    expect( report.passed ).toBe( true );
    expect( report.wordCounts.article ).toBeGreaterThanOrEqual( 100 );
    expect( report.wordCounts.article ).toBeLessThanOrEqual( 150 );
  } );

  describe( 'factual contradictions', () => {
    it( 'flags a wrong magnitude', () => {
      const report = checkDraft( facts, replaceInArticle( 'A magnitude 7.5', 'A magnitude 7.8' ) );
      expect( report.passed ).toBe( false );
      expect( report.contradictions ).toEqual( [ expect.stringMatching( /^\[article\] Magnitude 7.8 contradicts USGS magnitude 7.5/ ) ] );
      expect( report.unsupportedClaims ).toEqual( [] );
    } );

    it( 'flags a wrong depth in km and miles', () => {
      const report = checkDraft( facts, replaceInArticle( '10 kilometers (6.2 miles)', '35 kilometers (21.7 miles)' ) );
      expect( report.contradictions ).toHaveLength( 2 );
      expect( report.contradictions[0] ).toMatch( /Depth 35 kilometers contradicts USGS depth of 10 km/ );
      expect( report.contradictions[1] ).toMatch( /Depth 21.7 miles contradicts USGS depth of 6.2 miles/ );
    } );

    it( 'flags a wrong date, weekday and UTC time', () => {
      const report = checkDraft( facts, replaceInArticle( 'Monday, January 1, 2024, at 07:10 UTC', 'Thursday, January 4, 2024, at 09:45 UTC' ) );
      expect( report.contradictions ).toEqual( [
        expect.stringMatching( /Date "January 4, 2024" contradicts/ ),
        expect.stringMatching( /Weekday "thursday" contradicts/ ),
        expect.stringMatching( /Time "09:45 utc" contradicts/ )
      ] );
    } );

    it( 'flags qualifiers that misstate the exact felt-report count', () => {
      const report = checkDraft( facts, replaceInArticle( 'In total, 422 reports', 'Nearly 422 reports' ) );
      expect( report.contradictions ).toEqual( [ expect.stringMatching( /"nearly 422" misstates the exact USGS count of 422/ ) ] );
    } );

    it( 'flags a PAGER alert level that differs from USGS', () => {
      const report = checkDraft( facts, replaceInArticle( 'a red PAGER alert', 'an orange PAGER alert' ) );
      expect( report.contradictions ).toEqual( [ expect.stringMatching( /PAGER alert "orange" contradicts USGS alert level "red"/ ) ] );
    } );
  } );

  describe( 'unsupported claims (reported separately from contradictions)', () => {
    it( 'flags casualty claims and invented numbers', () => {
      const report = checkDraft( facts, withArticle( `${goodDraft.article} Officials said at least 200 people were killed.` ) );
      expect( report.contradictions ).toEqual( [] );
      expect( report.unsupportedClaims ).toEqual( [
        expect.stringMatching( /Impact claim \("killed"\) not supported/ ),
        expect.stringMatching( /Number "200" cannot be traced/ )
      ] );
    } );

    it( 'allows impact language only when it describes the PAGER estimate', () => {
      const report = checkDraft( facts, withArticle( `${goodDraft.article} Economic losses are expected.` ) );
      expect( report.unsupportedClaims ).toEqual( [ expect.stringMatching( /Impact claim \("losses"\) not supported/ ) ] );
      expect( checkDraft( { ...facts, pagerAlert: null }, goodDraft ).unsupportedClaims ).toEqual( [
        expect.stringMatching( /PAGER alert "red" stated but USGS issued no PAGER alert/ ),
        expect.stringMatching( /\[article\] Impact claim \("fatalities"\)/ ),
        expect.stringMatching( /PAGER alert "red" stated/ ),
        expect.stringMatching( /\[narration\] Impact claim \("fatalities"\)/ )
      ] );
    } );

    it( 'flags tsunami claims the data does not support', () => {
      const asserted = checkDraft( facts, replaceInArticle( 'The agency also lists tsunami information for the event.', 'The quake triggered a tsunami.' ) );
      expect( asserted.unsupportedClaims ).toEqual( [ expect.stringMatching( /Asserts a tsunami/ ) ] );

      const noFlag = checkDraft( { ...facts, tsunamiFlag: false }, goodDraft );
      expect( noFlag.unsupportedClaims ).toEqual( [
        expect.stringMatching( /\[article\] Mentions a tsunami, but the USGS tsunami flag is not set/ ),
        expect.stringMatching( /\[narration\] Mentions a tsunami/ )
      ] );
      expect( noFlag.contradictions ).toEqual( [] );
    } );

    it( 'accepts an accurate caveat that the tsunami flag confirms nothing', () => {
      const report = checkDraft( facts, replaceInArticle(
        'The agency also lists tsunami information for the event.',
        'The USGS links tsunami information to this event; this does not confirm that a tsunami occurred or that any warning was issued.'
      ) );
      expect( report.unsupportedClaims ).toEqual( [] );
      // Without the caveat, the same words are an unsupported assertion.
      const asserted = checkDraft( facts, replaceInArticle( 'The agency also lists tsunami information for the event.', 'A tsunami warning was issued.' ) );
      expect( asserted.unsupportedClaims ).toEqual( [ expect.stringMatching( /Asserts a tsunami/ ) ] );
    } );

    it( 'flags aftershock forecasts', () => {
      const report = checkDraft( facts, withArticle( `${goodDraft.article} Aftershocks are expected.` ) );
      expect( report.unsupportedClaims ).toEqual( [ expect.stringMatching( /Aftershock forecast/ ) ] );
    } );

    it( 'does not mistake a distance from a town for the depth', () => {
      const report = checkDraft( facts, replaceInArticle( 'near 37.49 degrees north', '35 km NE of Wajima, near 37.49 degrees north' ) );
      expect( report.contradictions ).toEqual( [] );
      expect( report.unsupportedClaims ).toEqual( [ expect.stringMatching( /Number "35" cannot be traced/ ) ] );
    } );
  } );

  describe( 'equivalent formats are accepted', () => {
    it.each( [
      [ 'A magnitude 7.5 earthquake', 'An M7.5 earthquake' ],
      [ 'A magnitude 7.5 earthquake', 'A 7.5-magnitude earthquake' ],
      [ 'A magnitude 7.5 earthquake', 'A magnitude-7.5 (Mww 7.5) earthquake' ],
      [ 'Monday, January 1, 2024', 'Jan. 1' ],
      [ 'Monday, January 1, 2024', '1 January 2024' ],
      [ 'Monday, January 1, 2024', '2024-01-01' ],
      [ 'Monday, January 1, 2024', 'New Year\'s Day, Jan 1st' ],
      [ 'Monday, January 1, 2024, at 07:10 UTC', 'Monday, January 1, 2024, at 7:10 a.m. UTC' ],
      [ 'a depth of 10 kilometers (6.2 miles)', 'a depth of about 10 km (6 miles)' ],
      [ 'at a depth of 10 kilometers (6.2 miles)', '10 km deep' ],
      [ 'at a depth of 10 kilometers (6.2 miles)', 'about 6 miles below the surface' ],
      [ 'at a depth of 10 kilometers (6.2 miles)', 'at a 10-kilometer depth' ],
      [ 'the Noto Peninsula in Japan', 'the NOTO peninsula of central JAPAN' ]
    ] )( 'accepts "%s" written as "%s"', ( search, replacement ) => {
      const report = checkDraft( facts, replaceInArticle( search, replacement ) );
      expect( { contradictions: report.contradictions, unsupportedClaims: report.unsupportedClaims, missing: report.missing } )
        .toEqual( { contradictions: [], unsupportedClaims: [], missing: [] } );
    } );

    it( 'accepts the USGS last-updated date', () => {
      const updated = new Date( facts.updatedUtc! );
      const label = `${[ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ][updated.getUTCMonth()]} ${updated.getUTCDate()}, ${updated.getUTCFullYear()}`;
      const report = checkDraft( facts, replaceInArticle( 'The agency has reviewed the event data.', `The agency last updated the data on ${label}.` ) );
      expect( { contradictions: report.contradictions, unsupportedClaims: report.unsupportedClaims } ).toEqual( { contradictions: [], unsupportedClaims: [] } );
    } );

    it( 'accepts a local date one day off the UTC date', () => {
      const lateUtc = { ...facts, timeUtc: '2024-01-01T22:30:00.000Z' };
      const report = checkDraft( lateUtc, replaceInArticle( 'Monday, January 1, 2024, at 07:10 UTC', 'Tuesday, January 2' ) );
      expect( report.contradictions ).toEqual( [] );
    } );

    it( 'matches location words without accents or case', () => {
      expect( placeKeywords( '2024 Noto Peninsula, Japan Earthquake' ) ).toEqual( [ 'noto', 'japan' ] );
      expect( placeKeywords( '12 km SSW of Ocós, Guatemala' ) ).toEqual( [ 'ocos', 'guatemala' ] );
      expect( placeKeywords( '10 km NE of Ridgecrest, CA' ) ).toEqual( [ 'ridgecrest', 'california' ] );
    } );
  } );

  describe( 'required content', () => {
    it( 'requires magnitude, location, date and USGS attribution', () => {
      const report = checkDraft( facts, withArticle( 'An earthquake struck. '.repeat( 30 ), { narration: 'An earthquake struck somewhere. '.repeat( 12 ) } ) );
      expect( report.missing ).toEqual( [
        'Article does not state the magnitude',
        'Narration does not state the magnitude',
        'Article does not name the location (expected one of: noto, japan)',
        'Narration does not name the location (expected one of: noto, japan)',
        'Article does not state when the earthquake occurred',
        'Article does not attribute the data to the USGS'
      ] );
    } );

    it( 'requires a preliminary caveat for automatic (unreviewed) events', () => {
      const automatic = { ...facts, status: 'automatic' as const };
      const draft = replaceInArticle( 'The agency has reviewed the event data.', 'The figures are preliminary.' );
      expect( checkDraft( automatic, goodDraft ).missing ).toEqual( [ expect.stringMatching( /does not say the data is preliminary/ ) ] );
      expect( checkDraft( automatic, draft ).missing ).toEqual( [] );
    } );
  } );

  describe( 'shape', () => {
    it( 'enforces article and narration length and headline size', () => {
      const report = checkDraft( facts, {
        ...goodDraft,
        headline: 'x'.repeat( 101 ),
        article: goodDraft.article.split( '\n\n' )[0],
        narration: `${goodDraft.narration} ${goodDraft.narration}`
      } );
      expect( report.shapeIssues ).toEqual( [
        'Headline must be 1-100 characters (got 101)',
        expect.stringMatching( /Article should be about 100-150 words \(got \d+\)/ ),
        expect.stringMatching( /Narration should be 40-80 words for 15-30 seconds \(got \d+\)/ )
      ] );
    } );

    it( 'rejects unspeakable narration', () => {
      const report = checkDraft( facts, { ...goodDraft, narration: `${goodDraft.narration} See https://usgs.gov.` } );
      expect( report.shapeIssues ).toEqual( [ 'Narration contains URLs or markup that cannot be spoken' ] );
    } );

    it( 'counts words', () => {
      expect( countWords( '  A magnitude 7.5 quake — struck.  ' ) ).toBe( 5 );
    } );
  } );
} );

describe( 'combineValidation', () => {
  const passingReview = { passed: true, confidence: 0.95, reasoning: 'Looks good', feedback: [] };

  it( 'never lets a passing LLM review override a failed fact check', () => {
    const factCheck = checkDraft( facts, replaceInArticle( 'A magnitude 7.5', 'A magnitude 6.1' ) );
    const validation = combineValidation( factCheck, passingReview );
    expect( validation.passed ).toBe( false );
    expect( revisionFeedback( validation ) ).toEqual( [ expect.stringMatching( /^Factual contradiction: \[article\] Magnitude 6.1/ ) ] );
  } );

  it( 'fails when the review fails even if the fact check passes', () => {
    const validation = combineValidation( checkDraft( facts, goodDraft ), { ...passingReview, passed: false, feedback: [ 'Too sensational' ] } );
    expect( validation.passed ).toBe( false );
    expect( revisionFeedback( validation ) ).toEqual( [ 'Editor: Too sensational' ] );
  } );

  it( 'passes only when both pass', () => {
    expect( combineValidation( checkDraft( facts, goodDraft ), passingReview ).passed ).toBe( true );
  } );
} );

describe( 'placeName', async () => {
  const { placeName } = await import( './facts.js' );
  it( 'strips the USGS event label but keeps ordinary place strings', () => {
    expect( placeName( '2024 Noto Peninsula, Japan Earthquake' ) ).toBe( 'Noto Peninsula, Japan' );
    expect( placeName( '10 km NE of Ridgecrest, CA' ) ).toBe( '10 km NE of Ridgecrest, CA' );
  } );
} );

// Regression cases taken from the live run for USGS event us6000u18k (M7.7, Panama, orange PAGER, 1,911 felt reports).
describe( 'editorial regressions from live runs', () => {
  const panama: QuakeFacts = {
    ...facts,
    id: 'us6000u18k',
    magnitude: 7.7,
    place: '12 km WSW of Pitaloza Arriba, Panama',
    timeUtc: '2026-10-09T17:56:06.036Z',
    updatedUtc: '2026-10-16T00:24:08.828Z',
    latitude: 7.5868,
    longitude: -80.769,
    depthKm: 12.647,
    tsunamiFlag: false,
    pagerAlert: 'orange',
    feltReports: 1911,
    url: 'https://earthquake.usgs.gov/earthquakes/eventpage/us6000u18k'
  };
  const unsupported = ( sentence: string ) =>
    checkDraft( panama, { ...goodDraft, article: sentence, narration: 'n' } ).unsupportedClaims.filter( c => c.startsWith( '[article]' ) );

  describe( 'PAGER alerts are model estimates, not confirmed outcomes', () => {
    it( 'rejects an alert presented as an outcome', () => {
      expect( unsupported( 'The USGS issued an orange PAGER alert, indicating that significant casualties and damage are likely.' ) )
        .toEqual( [ expect.stringMatching( /PAGER impact stated as an outcome; describe it as a model estimate/ ) ] );
    } );

    it( 'rejects an estimate that implies both casualties and damage', () => {
      expect( unsupported( 'USGS issued an orange PAGER alert, estimating that significant casualties and damage are likely.' ) )
        .toEqual( [ expect.stringMatching( /reflects estimated fatalities OR economic losses \(whichever is higher\), not both/ ) ] );
    } );

    it( 'accepts a follow-up sentence that refers to the alert by its level', () => {
      expect( unsupported(
        'The USGS PAGER system issued an orange alert, which is a model-based estimate, not a confirmed outcome, of potential impact. ' +
        'The orange level is set by whichever is higher between estimated fatalities and estimated economic losses, ' +
        'and it indicates a significant modeled impact.'
      ) ).toEqual( [] );
    } );

    it.each( [
      'The orange designation is a model-based estimate indicating a significant potential impact, ' +
        'determined by whichever is higher between estimated fatalities and estimated economic losses.',
      'The orange designation reflects a model estimate of potential fatalities or economic losses - whichever is higher.'
    ] )( 'accepts a follow-up sentence that names the alert color: "%s"', sentence => {
      expect( unsupported( `The USGS issued an orange PAGER alert. ${sentence}` ) ).toEqual( [] );
    } );

    it( 'accepts an alert described as a model estimate of fatalities or losses', () => {
      expect( unsupported(
        'The USGS issued an orange PAGER alert, a model estimate of potential fatalities or economic losses, whichever is higher.'
      ) ).toEqual( [] );
    } );
  } );

  describe( 'felt reports count reports, not people', () => {
    it.each( [
      'As of the latest USGS update, 1,911 people had submitted reports through the "Did You Feel It?" system.',
      'Exactly 1,911 people submitted felt reports to the USGS.',
      'The USGS received felt reports from 1911 local residents.'
    ] )( 'rejects "%s"', sentence => {
      expect( unsupported( sentence ) ).toEqual( [ expect.stringMatching( /presents the USGS felt count as people; it counts submitted reports/ ) ] );
    } );

    it( 'accepts the count described as reports', () => {
      expect( unsupported( 'The USGS received 1,911 "Did You Feel It?" reports.' ) ).toEqual( [] );
    } );
  } );
} );
