import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkDraft } from './validation.js';
import { normalizeUsgsResponse } from './normalize.js';
import eventFixture from './__fixtures__/event_us6000m0xl.json';
import type { NewsDraft, QuakeFacts } from './types.js';

vi.mock( './steps.js', () => ( { fetchEarthquake: vi.fn(), writeDraft: vi.fn(), factCheckDraft: vi.fn() } ) );
vi.mock( './evaluators.js', () => ( { reviewDraft: vi.fn() } ) );

const steps = await import( './steps.js' );
const { reviewDraft } = await import( './evaluators.js' );
const { default: quakeNews } = await import( './workflow.js' );

const facts = normalizeUsgsResponse( eventFixture ) as QuakeFacts;
const criteria = { eventId: 'us6000m0xl', minMagnitude: null, startTimeUtc: null, endTimeUtc: null };
const draft: NewsDraft = { headline: 'h', dek: 'd', article: 'a', narration: 'n' };
const factCheck = ( passed: boolean ) => ( {
  passed,
  contradictions: passed ? [] : [ '[article] Magnitude 6.1 contradicts USGS magnitude 7.5' ],
  unsupportedClaims: [],
  missing: [],
  shapeIssues: [],
  wordCounts: { article: 120, narration: 60 }
} );
const review = ( value: boolean ) => ( { value, confidence: 0.9, reasoning: 'ok', feedback: [], dimensions: [] } );

describe( 'quake_news workflow', () => {
  beforeEach( () => {
    vi.clearAllMocks();
    vi.mocked( steps.fetchEarthquake ).mockResolvedValue( { status: 'found', criteria, facts } );
    vi.mocked( steps.writeDraft ).mockResolvedValue( draft );
  } );

  it( 'returns no_candidate without calling the LLM', async () => {
    vi.mocked( steps.fetchEarthquake ).mockResolvedValue( { status: 'no_candidate', criteria, reason: 'none' } );
    const result = await quakeNews( { minMagnitude: 9.5, days: 1 } );

    expect( result ).toEqual( { status: 'no_candidate', criteria, reason: 'none' } );
    expect( steps.writeDraft ).not.toHaveBeenCalled();
    expect( reviewDraft ).not.toHaveBeenCalled();
  } );

  it( 'returns after one attempt when both checks pass', async () => {
    vi.mocked( steps.factCheckDraft ).mockResolvedValue( factCheck( true ) );
    vi.mocked( reviewDraft ).mockResolvedValue( review( true ) as never );
    const result = await quakeNews( { eventId: 'us6000m0xl' } );

    expect( result.status ).toBe( 'draft' );
    expect( result.status === 'draft' && result.validation.passed ).toBe( true );
    expect( steps.writeDraft ).toHaveBeenCalledTimes( 1 );
    expect( steps.writeDraft ).toHaveBeenCalledWith( { facts, feedback: [] } );
  } );

  it( 'keeps a failed fact check failing even when the LLM review passes, and retries once with feedback', async () => {
    vi.mocked( steps.factCheckDraft ).mockResolvedValue( factCheck( false ) );
    vi.mocked( reviewDraft ).mockResolvedValue( review( true ) as never );
    const result = await quakeNews( { eventId: 'us6000m0xl' } );

    expect( steps.writeDraft ).toHaveBeenCalledTimes( 2 );
    expect( vi.mocked( steps.writeDraft ).mock.calls[1][0].feedback ).toEqual( [
      'Factual contradiction: [article] Magnitude 6.1 contradicts USGS magnitude 7.5'
    ] );
    expect( result.status === 'draft' && result.validation ).toMatchObject( {
      passed: false,
      factCheck: { passed: false },
      review: { passed: true }
    } );
    expect( result.status === 'draft' && result.attempts ).toEqual( [
      { attempt: 1, passed: false, factCheckPassed: false, reviewPassed: true },
      { attempt: 2, passed: false, factCheckPassed: false, reviewPassed: true }
    ] );
  } );

  it( 'uses the real deterministic checker contract', () => {
    // Guard: the mocked step output above has the same shape as checkDraft's report.
    expect( Object.keys( checkDraft( facts, { ...draft, article: 'x' } ) ).sort() ).toEqual( Object.keys( factCheck( true ) ).sort() );
  } );
} );

describe( 'quake_news workflow video package', () => {
  const run = async ( input: Parameters<typeof quakeNews>[0] ) => {
    vi.clearAllMocks();
    vi.mocked( steps.fetchEarthquake ).mockResolvedValue( { status: 'found', criteria, facts } );
    vi.mocked( steps.writeDraft ).mockResolvedValue( draft );
    vi.mocked( steps.factCheckDraft ).mockResolvedValue( factCheck( true ) );
    vi.mocked( reviewDraft ).mockResolvedValue( review( true ) as never );
    return quakeNews( input );
  };

  it( 'omits videoPackage unless asOfUtc is given', async () => {
    expect( await run( { eventId: 'us6000m0xl' } ) ).not.toHaveProperty( 'videoPackage' );
  } );

  it( 'adds a videoPackage when asOfUtc is given', async () => {
    const result = await run( { eventId: 'us6000m0xl', asOfUtc: '2026-10-18T12:00:00.000Z' } );
    expect( result.status === 'draft' && result.videoPackage?.status ).toBe( 'ready' );
  } );
} );
