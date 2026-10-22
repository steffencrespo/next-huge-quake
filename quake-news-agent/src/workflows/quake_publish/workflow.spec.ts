import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tibetFacts, tibetImpact } from '../../fast_track/testing.js';

vi.mock( './steps.js', () => ( {
  fastTrackGate: vi.fn(), buildFastTrackManifest: vi.fn(), publisherCommand: vi.fn(), publisherVerify: vi.fn(), fastTrackCheckpoint: vi.fn(), recordFastTrack: vi.fn()
} ) );
vi.mock( '../quake_video/steps.js', () => ( { clock: vi.fn() } ) );

const steps = await import( './steps.js' );
const { clock } = await import( '../quake_video/steps.js' );
const { default: quakePublish } = await import( './workflow.js' );

const input = {
  eventId: 'us6000u43g', produced: tibetFacts(), narration: 'n', credits: '/v/out/videos/us6000u43g/credits.txt', mp4: '/v/out/videos/us6000u43g/video.mp4',
  timing: { detectedAtUtc: '2026-10-22T14:40:00.000Z', productionStartedAtUtc: '2026-10-22T14:41:00.000Z', renderCompletedAtUtc: '2026-10-22T14:47:00.000Z' }
};
const gate = ( over = {} ) => ( {
  publish: true, tier: 'A', signals: [ 'pager_orange' ], reasons: [], finalPrivacy: 'public' as const, facts: tibetFacts(), impact: tibetImpact(),
  evaluatedAtUtc: '2026-10-22T14:47:30.000Z', ...over
} );
const commands = () => vi.mocked( steps.publisherCommand ).mock.calls.map( ( [ { args } ] ) => args[0] );
const verifies = () => vi.mocked( steps.publisherVerify ).mock.calls.map( ( [ { args } ] ) => args.at( -1 ) );

describe( 'quake_publish workflow', () => {
  let tick: number;
  beforeEach( () => {
    vi.clearAllMocks();
    tick = Date.parse( '2026-10-22T14:48:00.000Z' );
    vi.mocked( clock ).mockImplementation( async () => ( { ms: ( tick += 60_000 ) } ) );
    vi.mocked( steps.fastTrackGate ).mockResolvedValue( gate() );
    vi.mocked( steps.buildFastTrackManifest ).mockResolvedValue( { manifestId: 'nagqu-china-m70-us6000u43g', reused: false } );
    vi.mocked( steps.publisherCommand ).mockResolvedValue( { output: 'ok' } );
    vi.mocked( steps.publisherVerify ).mockResolvedValue( { output: 'Strict inspection passed' } );
    vi.mocked( steps.fastTrackCheckpoint ).mockResolvedValue( { proceed: true, reason: null } );
    vi.mocked( steps.recordFastTrack ).mockResolvedValue( { videoId: 'vid', notified: false } );
  } );

  it( 'publishes an eligible event: policy approval, reconcile, private upload, strict checks, publish-now', async () => {
    const result = await quakePublish( input );
    expect( commands() ).toEqual( [ 'approve', 'reconcile', 'upload', 'publish-now' ] );
    expect( vi.mocked( steps.publisherCommand ).mock.calls[0][0].args ).toEqual( [ 'approve', 'nagqu-china-m70-us6000u43g', '--authority=fast-track@1' ] );
    expect( verifies() ).toEqual( [ '--expect=private', '--expect=public' ] );
    expect( result ).toMatchObject( { status: 'published', manifestId: 'nagqu-china-m70-us6000u43g', videoId: 'vid', tier: 'A', reasons: [] } );
    expect( result.latency ).toMatchObject( { originToDetectionMs: Date.parse( '2026-10-22T14:40:00.000Z' ) - Date.parse( input.produced.timeUtc ), productionToRenderMs: 360_000 } );
    expect( result.latency.originToPublicMs ).toBeGreaterThan( 0 );
    expect( vi.mocked( steps.recordFastTrack ).mock.calls[0][0].patch ).toMatchObject( { decision: 'published', publishedAtUtc: expect.any( String ) } );
  } );

  it( 'hands an ineligible event to a person without touching YouTube', async () => {
    vi.mocked( steps.fastTrackGate ).mockResolvedValue( gate( { publish: false, reasons: [ 'pager_red' ], facts: null } ) );
    const result = await quakePublish( input );
    expect( result ).toMatchObject( { status: 'manual', reasons: [ 'pager_red' ], manifestId: null } );
    expect( steps.buildFastTrackManifest ).not.toHaveBeenCalled();
    expect( steps.publisherCommand ).not.toHaveBeenCalled();
  } );

  it( 'fails closed when the gate itself fails', async () => {
    vi.mocked( steps.fastTrackGate ).mockRejectedValue( new Error( 'USGS down' ) );
    expect( await quakePublish( input ) ).toMatchObject( { status: 'manual', reasons: [ 'gate_failed' ] } );
    expect( steps.publisherCommand ).not.toHaveBeenCalled();
  } );

  it( 'stops at a verified private upload while FAST_TRACK_FINAL_PRIVACY is private', async () => {
    vi.mocked( steps.fastTrackGate ).mockResolvedValue( gate( { finalPrivacy: 'private' } ) );
    expect( await quakePublish( input ) ).toMatchObject( { status: 'verified_private' } );
    expect( commands() ).toEqual( [ 'approve', 'reconcile', 'upload' ] );
    expect( verifies() ).toEqual( [ '--expect=private' ] );
  } );

  it( 'honors the pause file right before publication', async () => {
    vi.mocked( steps.fastTrackCheckpoint ).mockResolvedValue( { proceed: false, reason: 'fast_track_paused' } );
    expect( await quakePublish( input ) ).toMatchObject( { status: 'manual', reasons: [ 'fast_track_paused' ] } );
    expect( commands() ).not.toContain( 'publish-now' );
  } );

  it( 'never publishes after a failed upload or a failed private inspection', async () => {
    vi.mocked( steps.publisherCommand ).mockImplementation( async ( { args } ) => {
      if ( args[0] === 'upload' ) throw new Error( 'quota exceeded' );
      return { output: 'ok' };
    } );
    expect( await quakePublish( input ) ).toMatchObject( { status: 'failed', reasons: [ 'upload: quota exceeded' ] } );
    expect( commands() ).not.toContain( 'publish-now' );

    vi.clearAllMocks();
    vi.mocked( clock ).mockImplementation( async () => ( { ms: ( tick += 60_000 ) } ) );
    vi.mocked( steps.fastTrackGate ).mockResolvedValue( gate() );
    vi.mocked( steps.buildFastTrackManifest ).mockResolvedValue( { manifestId: 'm', reused: false } );
    vi.mocked( steps.publisherCommand ).mockResolvedValue( { output: 'ok' } );
    vi.mocked( steps.publisherVerify ).mockRejectedValue( new Error( 'Strict inspection failed (private): title on YouTube differs from the manifest.' ) );
    vi.mocked( steps.recordFastTrack ).mockResolvedValue( { videoId: null, notified: false } );
    const result = await quakePublish( input );
    expect( result.status ).toBe( 'failed' );
    expect( result.reasons[0] ).toMatch( /^inspect_private: Strict inspection failed/ );
    expect( commands() ).not.toContain( 'publish-now' );
  } );
} );
