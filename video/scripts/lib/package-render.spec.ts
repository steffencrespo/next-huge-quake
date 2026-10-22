import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { panama } from '../../src/fixtures/panama.js';
import { buildVideoSpec } from '../../src/spec/build.js';
import { resolveRenderInputs, stageAudio } from './package-render.js';

const AS_OF = '2026-10-18T12:00:00.000Z';
/** MPEG-1 Layer III 128 kbps 44.1 kHz frames: 1152 samples (0.026122 s) each. */
const mp3 = ( frames: number ) => {
  const data = new Uint8Array( frames * 417 );
  for ( let i = 0; i < frames; i++ ) {
    data.set( [ 0xff, 0xfb, 0x90, 0x04 ], i * 417 );
  }
  return data;
};
const NARRATION_FRAMES = 400; // 10.45 s
const NARRATION_SECONDS = Math.round( NARRATION_FRAMES * 1152 / 44100 * 1000 ) / 1000;

let root: string;
let dir: string;
const write = ( file: string, content: unknown ) => {
  mkdirSync( join( file, '..' ), { recursive: true } );
  writeFileSync( file, typeof content === 'string' || content instanceof Uint8Array ? content : JSON.stringify( content ) );
  return file;
};
const soundtrack = ( overrides: Record<string, unknown> = {} ) => ( {
  narrationFile: 'audio/us6000u18k-narration.mp3',
  musicFile: 'audio/music.mp3',
  narrationStart: 1.5,
  narrationDuration: NARRATION_SECONDS,
  captions: [ { text: 'Hello.', start: 0, end: 2 } ],
  musicCredit: 'Music credit',
  ...overrides
} );
const inputs = ( { spec = buildVideoSpec( panama, { asOfUtc: AS_OF, mapMode: 'static' } ) as unknown, st = soundtrack() as unknown } = {} ) => ( {
  specFile: write( join( dir, 'spec.json' ), spec ),
  soundtrackFile: write( join( dir, 'soundtrack.json' ), st ),
  root
} );

beforeEach( () => {
  root = mkdtempSync( join( tmpdir(), 'render-root-' ) );
  dir = mkdtempSync( join( tmpdir(), 'render-pkg-' ) );
  write( join( dir, 'narration.mp3' ), mp3( NARRATION_FRAMES ) );
  write( join( root, 'assets', 'audio', 'music.mp3' ), mp3( 50 ) );
} );
afterEach( () => {
  rmSync( root, { recursive: true, force: true } );
  rmSync( dir, { recursive: true, force: true } );
} );

describe( 'resolveRenderInputs', () => {
  it( 'accepts valid artifacts and resolves the audio paths', () => {
    const result = resolveRenderInputs( inputs() );
    expect( result.spec.event.id ).toBe( 'us6000u18k' );
    expect( result.audio.map( a => a.staged ) ).toEqual( [
      join( root, 'public', 'audio', 'us6000u18k-narration.mp3' ),
      join( root, 'public', 'audio', 'music.mp3' )
    ] );
    expect( result.audio[0].source ).toBe( join( dir, 'narration.mp3' ) );
  } );

  it( 'lists every missing file with an actionable message', () => {
    const missing = { specFile: join( dir, 'nope-spec.json' ), soundtrackFile: join( dir, 'nope-soundtrack.json' ), root };
    expect( () => resolveRenderInputs( missing ) ).toThrow( /spec\.json not found[\s\S]*soundtrack\.json not found/ );
    rmSync( join( dir, 'narration.mp3' ) );
    rmSync( join( root, 'assets', 'audio', 'music.mp3' ) );
    expect( () => resolveRenderInputs( inputs() ) ).toThrow( /music file not found[\s\S]*narration MP3 not found/ );
  } );

  it( 'rejects an invalid spec and an invalid soundtrack', () => {
    expect( () => resolveRenderInputs( inputs( { spec: { specVersion: '2.0' } } ) ) ).toThrow( 'not a valid VideoSpec v1' );
    expect( () => resolveRenderInputs( inputs( { st: { narrationFile: 'x' } } ) ) ).toThrow( 'not a valid Soundtrack' );
    write( join( dir, 'spec.json' ), '{ broken' );
    expect( () => resolveRenderInputs( { specFile: join( dir, 'spec.json' ), soundtrackFile: join( dir, 'soundtrack.json' ), root } ) ).toThrow( 'not valid JSON' );
  } );

  it( 'rejects audio that belongs to another event or has an unsafe path', () => {
    expect( () => resolveRenderInputs( inputs( { st: soundtrack( { narrationFile: 'audio/us6000m0xl-narration.mp3' } ) } ) ) ).toThrow( 'does not belong to event us6000u18k' );
    expect( () => resolveRenderInputs( inputs( { st: soundtrack( { musicFile: 'audio/../../secret.mp3' } ) } ) ) ).toThrow( 'must look like audio/<name>.mp3' );
  } );

  it( 'rejects a narration MP3 that differs from the soundtrack or does not fit the video', () => {
    expect( () => resolveRenderInputs( inputs( { st: soundtrack( { narrationDuration: 20 } ) } ) ) ).toThrow( 'regenerate the soundtrack' );
    expect( () => resolveRenderInputs( inputs( { st: soundtrack( { narrationStart: 30 } ) } ) ) ).toThrow( 'before the end' );
    expect( () => resolveRenderInputs( inputs( { st: soundtrack( { captions: [ { text: 'x', start: 0, end: 40 } ] } ) } ) ) ).toThrow( 'past the narration' );
  } );

  it( 'keeps the narration-fits-the-video guard on shorter specs (24 s minimum)', () => {
    const shorter = ( frames: number ) => {
      const spec = buildVideoSpec( panama, { asOfUtc: AS_OF, mapMode: 'static' } );
      spec.scenes[1].frames -= frames;
      return spec;
    };
    expect( resolveRenderInputs( inputs( { spec: shorter( 270 ) } ) ).spec.scenes[1].frames ).toBe( 90 ); // 26 s: valid
    expect( () => resolveRenderInputs( inputs( { spec: shorter( 270 ), st: soundtrack( { narrationStart: 14 } ) } ) ) ).toThrow( 'before the end' ); // voice would run into the end
    expect( () => resolveRenderInputs( inputs( { spec: shorter( 360 ) } ) ) ).toThrow( 'outside' ); // 23 s: below the minimum
  } );

  it( 'requires prepared terrain for live maps', () => {
    const live = buildVideoSpec( panama, { asOfUtc: AS_OF } );
    expect( () => resolveRenderInputs( inputs( { spec: live } ) ) ).toThrow( 'public/terrain/manifest.json is missing' );
    write( join( root, 'public', 'terrain', 'manifest.json' ), { tiles: {} } );
    expect( () => resolveRenderInputs( inputs( { spec: live } ) ) ).toThrow( 'terrain tiles missing for us6000u18k' );
  } );
} );

describe( 'stageAudio', () => {
  it( 'copies the audio, then removes only what it created', () => {
    const { audio } = resolveRenderInputs( inputs() );
    write( audio[1].staged, readFileSync( audio[1].source ) ); // music already in public/audio
    const cleanup = stageAudio( audio );
    expect( existsSync( audio[0].staged ) ).toBe( true );
    cleanup();
    expect( existsSync( audio[0].staged ) ).toBe( false );
    expect( existsSync( audio[1].staged ) ).toBe( true );
  } );

  it( 'never overwrites an existing file with different content', () => {
    const { audio } = resolveRenderInputs( inputs() );
    write( audio[0].staged, 'something else' );
    expect( () => stageAudio( audio ) ).toThrow( 'already exists with different content' );
    expect( readFileSync( audio[0].staged, 'utf8' ) ).toBe( 'something else' );
    expect( existsSync( audio[1].staged ) ).toBe( false ); // nothing is left behind by the failed call
  } );
} );
