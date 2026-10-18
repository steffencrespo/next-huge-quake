import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeUsgsResponse } from '../quake_news/normalize.js';
import eventFixture from '../quake_news/__fixtures__/event_us6000u18k.json';
import type { QuakeFacts, WorkflowOutput } from '../quake_news/types.js';

vi.mock( '../quake_news/workflow.js', () => ( { default: vi.fn() } ) );
vi.mock( './steps.js', () => ( { clock: vi.fn(), buildSpec: vi.fn(), generateNarration: vi.fn(), prepareTerrain: vi.fn(), renderVideo: vi.fn() } ) );

const { default: quakeNews } = await import( '../quake_news/workflow.js' );
const steps = await import( './steps.js' );
const { default: quakeVideo } = await import( './workflow.js' );

const AS_OF = '2026-10-18T18:00:00.000Z';
const facts = normalizeUsgsResponse( eventFixture ) as QuakeFacts;
const draft = { headline: 'HEADLINE', dek: 'dek', article: 'article', narration: 'The validated narration.' };
const validation = {
  passed: true,
  factCheck: { passed: true, contradictions: [], unsupportedClaims: [], missing: [], shapeIssues: [], wordCounts: { article: 120, narration: 60 } },
  review: { passed: true, confidence: 0.9, reasoning: 'ok', feedback: [] }
};
const draftOutput = ( videoPackage: WorkflowOutput extends infer O ? O extends { videoPackage?: infer V } ? V : never : never ): WorkflowOutput =>
  ( { status: 'draft', facts, draft, validation, attempts: [], videoPackage } as WorkflowOutput );
const readyPackage = () => ( {
  status: 'ready' as const,
  package: { provenance: 'usgs-live' as const, approachFrom: 'west' as const, asOfUtc: AS_OF, event: { ...facts, status: 'reviewed' as const }, narration: draft.narration }
} );
const input = { eventId: 'us6000u18k', minMagnitude: 5.5, days: 7, asOfUtc: AS_OF };
const stageNames = ( result: { stages: Array<{ name: string }> } ) => result.stages.map( s => s.name );
const videoStepsNotCalled = () => {
  for ( const step of [ steps.buildSpec, steps.generateNarration, steps.prepareTerrain, steps.renderVideo ] ) {
    expect( step ).not.toHaveBeenCalled();
  }
};

describe( 'quake_video workflow', () => {
  let tick: number;
  beforeEach( () => {
    vi.clearAllMocks();
    tick = 0;
    vi.mocked( steps.clock ).mockImplementation( async () => ( { ms: ( tick += 1000 ) } ) );
    vi.mocked( steps.buildSpec ).mockResolvedValue( { ms: 50, detail: null, package: '/o/package.json', spec: '/o/spec.json', script: '/o/script.txt' } );
    vi.mocked( steps.generateNarration ).mockResolvedValue( { ms: 4000, detail: null, narration: '/o/narration.mp3', soundtrack: '/o/soundtrack.json' } );
    vi.mocked( steps.prepareTerrain ).mockResolvedValue( { ms: 300, detail: 'cached 10 (1 MB); to download 0' } );
    vi.mocked( steps.renderVideo ).mockResolvedValue( { ms: 180000, detail: null, mp4: '/o/video.mp4', credits: '/o/credits.txt' } );
  } );

  it( 'runs every stage in order for a validated event and stops ready for approval', async () => {
    vi.mocked( quakeNews ).mockResolvedValue( draftOutput( readyPackage() ) );
    const result = await quakeVideo( input );

    expect( quakeNews ).toHaveBeenCalledWith( input );
    expect( steps.generateNarration ).toHaveBeenCalledWith( { eventId: 'us6000u18k', narration: draft.narration } );
    expect( result ).toMatchObject( {
      status: 'ready_for_approval',
      eventId: 'us6000u18k',
      outputs: { spec: '/o/spec.json', soundtrack: '/o/soundtrack.json', mp4: '/o/video.mp4', credits: '/o/credits.txt' },
      news: { headline: 'HEADLINE' }
    } );
    expect( stageNames( result as never ) ).toEqual( [ 'quake_news', 'build_spec', 'narration', 'terrain', 'render' ] );
    expect( result.totalMs ).toBeGreaterThan( 0 );
  } );

  it( 'stops at no_candidate without running any video stage', async () => {
    vi.mocked( quakeNews ).mockResolvedValue( { status: 'no_candidate', criteria: { eventId: null, minMagnitude: 9.5, startTimeUtc: null, endTimeUtc: null }, reason: 'none' } );
    const result = await quakeVideo( input );
    expect( result ).toMatchObject( { status: 'no_candidate', reason: 'none' } );
    videoStepsNotCalled();
  } );

  it( 'rejects failed validation: no video stage runs and no draft content is returned', async () => {
    vi.mocked( quakeNews ).mockResolvedValue( draftOutput( { status: 'rejected', reason: 'The draft did not pass validation' } ) );
    const result = await quakeVideo( input );
    expect( result ).toMatchObject( { status: 'rejected', reason: 'The draft did not pass validation' } );
    expect( JSON.stringify( result ) ).not.toContain( 'HEADLINE' );
    expect( JSON.stringify( result ) ).not.toContain( draft.narration );
    videoStepsNotCalled();
  } );

  it( 'rejects a result with no video package', async () => {
    vi.mocked( quakeNews ).mockResolvedValue( draftOutput( undefined as never ) );
    expect( await quakeVideo( input ) ).toMatchObject( { status: 'rejected' } );
    videoStepsNotCalled();
  } );

  it( 'reports a failed stage with its name and skips the later stages', async () => {
    vi.mocked( quakeNews ).mockResolvedValue( draftOutput( readyPackage() ) );
    vi.mocked( steps.generateNarration ).mockRejectedValue( new Error( 'ElevenLabs returned HTTP 401' ) );
    const result = await quakeVideo( input );
    expect( result ).toMatchObject( { status: 'failed', eventId: 'us6000u18k', failedStage: 'narration', error: 'ElevenLabs returned HTTP 401' } );
    expect( steps.prepareTerrain ).not.toHaveBeenCalled();
    expect( steps.renderVideo ).not.toHaveBeenCalled();
  } );

  it( 'reports the innermost cause of a wrapped step failure', async () => {
    vi.mocked( quakeNews ).mockResolvedValue( draftOutput( readyPackage() ) );
    const wrapped = Object.assign( new Error( 'Activity task failed' ), { cause: Object.assign( new Error( 'wrapper' ), { cause: new Error( 'render failed (exit 1): missing terrain' ) } ) } );
    vi.mocked( steps.renderVideo ).mockRejectedValue( wrapped );
    expect( await quakeVideo( input ) ).toMatchObject( { status: 'failed', failedStage: 'render', error: 'render failed (exit 1): missing terrain' } );
  } );

  it( 'marks a reused narration as skipped', async () => {
    vi.mocked( quakeNews ).mockResolvedValue( draftOutput( readyPackage() ) );
    vi.mocked( steps.generateNarration ).mockResolvedValue( { ms: 3, detail: 'reused existing narration (no ElevenLabs request)', narration: '/o/narration.mp3', soundtrack: '/o/soundtrack.json' } );
    const result = await quakeVideo( input );
    expect( result.stages.find( s => s.name === 'narration' )?.status ).toBe( 'skipped' );
  } );
} );
