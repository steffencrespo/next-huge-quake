import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock( '../../shared/run_cli.js', async () => {
  const actual = await vi.importActual<typeof import( '../../shared/run_cli.js' )>( '../../shared/run_cli.js' );
  return { ...actual, runVideoScript: vi.fn() };
} );

const { runVideoScript } = await import( '../../shared/run_cli.js' );
const steps = await import( './steps.js' );

const NARRATION = 'The validated narration.';
let video: string;
beforeEach( () => {
  vi.clearAllMocks();
  video = mkdtempSync( join( tmpdir(), 'video-' ) );
  process.env.VIDEO_DIR = video;
} );
afterEach( () => {
  rmSync( video, { recursive: true, force: true } );
  delete process.env.VIDEO_DIR;
} );

const audioDir = () => join( video, 'out', 'audio', 'us6000u18k' );
const writeAudio = ( hash: string ) => {
  mkdirSync( audioDir(), { recursive: true } );
  writeFileSync( join( audioDir(), 'narration.mp3' ), 'mp3' );
  writeFileSync( join( audioDir(), 'soundtrack.json' ), '{}' );
  writeFileSync( join( audioDir(), 'narration.sha256' ), `${hash}\n` );
};
const sha = ( text: string ) => createHash( 'sha256' ).update( text ).digest( 'hex' );

describe( 'generate_narration (paid)', () => {
  it( 'makes no ElevenLabs request when artifacts for the same text exist', async () => {
    writeAudio( sha( NARRATION ) );
    const result = await steps.generateNarration( { eventId: 'us6000u18k', narration: NARRATION } );
    expect( runVideoScript ).not.toHaveBeenCalled();
    expect( result.detail ).toMatch( /^reused/ );
  } );

  it( 'generates when the text changed, once, and records the text hash', async () => {
    writeAudio( sha( 'older narration' ) );
    vi.mocked( runVideoScript ).mockResolvedValue( 'ok' );
    await steps.generateNarration( { eventId: 'us6000u18k', narration: NARRATION } );
    expect( runVideoScript ).toHaveBeenCalledTimes( 1 );
    expect( vi.mocked( runVideoScript ).mock.calls[0][1] ).toContain( '--generate' );
    expect( readFileSync( join( audioDir(), 'narration.sha256' ), 'utf8' ).trim() ).toBe( sha( NARRATION ) );
  } );

  it( 'turns a CLI failure into a non-retryable error', async () => {
    vi.mocked( runVideoScript ).mockRejectedValue( new Error( 'ElevenLabs returned HTTP 401' ) );
    await expect( steps.generateNarration( { eventId: 'us6000u18k', narration: NARRATION } ) ).rejects.toThrow( 'HTTP 401' );
    expect( runVideoScript ).toHaveBeenCalledTimes( 1 );
  } );
} );

describe( 'render_video', () => {
  it( 'returns the paths from the CLI JSON line', async () => {
    vi.mocked( runVideoScript ).mockResolvedValue( 'noise\n{"eventId":"us6000u18k","mp4":"/v/video.mp4","credits":"/v/credits.txt"}\n' );
    const result = await steps.renderVideo( { eventId: 'us6000u18k' } );
    expect( result ).toMatchObject( { mp4: '/v/video.mp4', credits: '/v/credits.txt' } );
    expect( vi.mocked( runVideoScript ).mock.calls[0][1] ).toEqual( [ join( video, 'out', 'packages', 'us6000u18k', 'spec.json' ), join( audioDir(), 'soundtrack.json' ) ] );
  } );
} );
