import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { alignmentToCaptions, validateAlignment } from './captions.js';
import type { Alignment } from './captions.js';
import { mp3DurationSeconds } from './mp3.js';
import { DEFAULT_END_MARGIN_SECONDS, MAX_NARRATION_SECONDS, endMarginSeconds, maxNarrationSeconds, NarrationTooLongError, InvalidAudioError, generateSpeech, speechFromAudio, loadTtsConfig, parseEnvFile } from './tts.js';

const config = { apiKey: 'sk_test_SECRET', voiceId: 'voice123', modelId: 'model_x' };
const TEXT = 'A powerful magnitude 7.7 earthquake struck southern Panama on October 9, according to the USGS. The depth was 13 kilometers. Reviewed.';

/** Evenly timed fake alignment: 0.05 s per character. */
const alignmentFor = ( text: string ): Alignment => ( {
  characters: [ ...text ],
  character_start_times_seconds: [ ...text ].map( ( _, i ) => i * 0.05 ),
  character_end_times_seconds: [ ...text ].map( ( _, i ) => ( i + 1 ) * 0.05 )
} );

/** MPEG-1 Layer III, 128 kbps, 44.1 kHz: 417-byte frames of 1152 samples. */
const mp3Frames = ( count: number ): Uint8Array => {
  const data = new Uint8Array( count * 417 );
  for ( let i = 0; i < count; i++ ) {
    data.set( [ 0xff, 0xfb, 0x90, 0x04 ], i * 417 );
  }
  return data;
};
const FRAME_SECONDS = 1152 / 44100;

const reply = ( body: unknown, status = 200 ) =>
  vi.fn( async () => new Response( typeof body === 'string' ? body : JSON.stringify( body ), { status } ) ) as unknown as typeof fetch;
const okBody = ( frames = 400, alignment: unknown = alignmentFor( TEXT ) ) =>
  ( { audio_base64: Buffer.from( mp3Frames( frames ) ).toString( 'base64' ), alignment } );

describe( 'alignmentToCaptions', () => {
  const captions = alignmentToCaptions( alignmentFor( TEXT ) );

  it( 'is deterministic and breaks at sentence ends and readable phrase lengths', () => {
    expect( alignmentToCaptions( alignmentFor( TEXT ) ) ).toEqual( captions );
    expect( captions.map( c => c.text ).join( ' ' ) ).toBe( TEXT );
    expect( captions.every( c => c.text.length <= 44 && c.text.split( ' ' ).length <= 7 ) ).toBe( true );
    expect( captions.map( c => c.text ) ).toContain( 'The depth was 13 kilometers.' );
    expect( captions.at( -1 )?.text ).toBe( 'Reviewed.' );
  } );

  it( 'has ordered, non-overlapping times, holding captions only inside a sentence', () => {
    captions.forEach( ( c, i ) => {
      expect( c.end ).toBeGreaterThan( c.start );
      if ( i > 0 ) {
        expect( c.start ).toBeGreaterThanOrEqual( captions[i - 1].end );
      }
    } );
    const first = captions[0];
    expect( captions[1].start ).toBe( first.end ); // inside the first sentence: held to the next start
    const sentenceEnd = captions.findIndex( c => c.text.endsWith( 'USGS.' ) );
    expect( captions[sentenceEnd + 1].start ).toBeGreaterThan( captions[sentenceEnd].end ); // gap kept after the full stop
  } );

  it( 'does not end a sentence at "U.S." and leaves no one-word trailing caption', () => {
    const text = 'The U.S. Geological Survey reports a depth of about 13 kilometers and has reviewed the event data.';
    const result = alignmentToCaptions( alignmentFor( text ) );
    expect( result.map( c => c.text ).join( ' ' ) ).toBe( text );
    expect( result.some( c => c.text.endsWith( 'U.S.' ) ) ).toBe( false );
    expect( result.every( c => c.text.split( ' ' ).length >= 2 ) ).toBe( true );
  } );

  it( 'rejects invalid alignment', () => {
    expect( () => validateAlignment( null, TEXT ) ).toThrow( 'invalid alignment' );
    expect( () => validateAlignment( { ...alignmentFor( TEXT ), character_end_times_seconds: [ 1 ] }, TEXT ) ).toThrow( 'differ in length' );
    expect( () => validateAlignment( alignmentFor( 'Other text.' ), TEXT ) ).toThrow( 'do not match' );
    const backwards = alignmentFor( TEXT );
    backwards.character_start_times_seconds[10] = 0;
    backwards.character_end_times_seconds[10] = 0.01;
    expect( () => validateAlignment( backwards, TEXT ) ).toThrow( 'not monotonic' );
  } );
} );

describe( 'mp3DurationSeconds', () => {
  it( 'sums frame durations', () => {
    expect( mp3DurationSeconds( mp3Frames( 100 ) ) ).toBeCloseTo( 100 * FRAME_SECONDS, 6 );
    expect( () => mp3DurationSeconds( new Uint8Array( 50 ) ) ).toThrow( 'no MP3 frames' );
  } );

  it( 'measures the approved Panama narration (29.73 s) when the local asset exists', () => {
    const file = new URL( '../../assets/audio/panama-narration.mp3', import.meta.url ).pathname;
    if ( existsSync( file ) ) {
      expect( mp3DurationSeconds( readFileSync( file ) ) ).toBeGreaterThan( 29.5 );
      expect( mp3DurationSeconds( readFileSync( file ) ) ).toBeLessThan( 30 );
    }
  } );
} );

describe( 'generateSpeech', () => {
  it( 'sends the text unchanged with the key in the header and returns audio, duration and captions', async () => {
    const fetchFn = reply( okBody() );
    const speech = await generateSpeech( TEXT, config, fetchFn );
    const [ url, init ] = vi.mocked( fetchFn ).mock.calls[0] as [ string, RequestInit ];
    expect( url ).toBe( 'https://api.elevenlabs.io/v1/text-to-speech/voice123/with-timestamps?output_format=mp3_44100_128' );
    expect( ( init.headers as Record<string, string> )['xi-api-key'] ).toBe( config.apiKey );
    expect( JSON.parse( init.body as string ) ).toEqual( { text: TEXT, model_id: 'model_x' } );
    expect( speech.durationSeconds ).toBeCloseTo( 400 * FRAME_SECONDS, 6 );
    expect( speech.captions.length ).toBeGreaterThan( 1 );
  } );

  it( 'fails clearly on a rejected request without leaking the key', async () => {
    const error = await generateSpeech( TEXT, config, reply( { detail: 'invalid_api_key' }, 401 ) ).then( () => '', e => String( e.message ) );
    expect( error ).toContain( 'HTTP 401' );
    expect( error ).not.toContain( 'SECRET' );
    const offline = ( async () => { throw new Error( 'offline' ); } ) as typeof fetch;
    await expect( generateSpeech( TEXT, config, offline ) ).rejects.toThrow( 'ElevenLabs request failed: offline' );
  } );

  it( 'fails on a response without audio or with invalid alignment', async () => {
    await expect( generateSpeech( TEXT, config, reply( { alignment: null } ) ) ).rejects.toThrow( 'no audio_base64' );
    await expect( generateSpeech( TEXT, config, reply( okBody( 400, null ) ) ) ).rejects.toThrow( 'invalid alignment' );
    await expect( generateSpeech( TEXT, config, reply( okBody( 400, null ) ) ) ).rejects.toBeInstanceOf( InvalidAudioError ); // audio arrived, so it was billed
    await expect( generateSpeech( TEXT, config, reply( { alignment: null } ) ) ).rejects.not.toBeInstanceOf( InvalidAudioError );
  } );

  it( 'rejects audio that does not fit the video instead of truncating it', async () => {
    const frames = Math.ceil( ( MAX_NARRATION_SECONDS + 0.5 ) / FRAME_SECONDS );
    const error = await generateSpeech( TEXT, config, reply( okBody( frames ) ) ).then( () => null, e => e );
    expect( error ).toBeInstanceOf( NarrationTooLongError );
    expect( error.message ).toMatch( /over the 30\.8 s limit/ );
    expect( error.speech.mp3.length ).toBeGreaterThan( 0 ); // paid audio is kept for review
    // Kept audio is re-checked offline: still too long here, and accepted once it fits.
    expect( () => speechFromAudio( TEXT, error.speech.mp3, alignmentFor( TEXT ) ) ).toThrow( NarrationTooLongError );
    expect( speechFromAudio( TEXT, mp3Frames( 400 ), alignmentFor( TEXT ) ).durationSeconds ).toBeLessThan( MAX_NARRATION_SECONDS );
  } );
} );

describe( 'narration end margin', () => {
  it( 'defaults to 2.7 s and can be set with NARRATION_END_MARGIN_SECONDS', () => {
    expect( endMarginSeconds( {} ) ).toBe( DEFAULT_END_MARGIN_SECONDS );
    expect( maxNarrationSeconds( {} ) ).toBe( 30.8 );
    expect( maxNarrationSeconds( { NARRATION_END_MARGIN_SECONDS: '2.0' } ) ).toBe( 31.5 );
    expect( () => endMarginSeconds( { NARRATION_END_MARGIN_SECONDS: '1.9' } ) ).toThrow( 'from 2 to 10' );
    expect( () => endMarginSeconds( { NARRATION_END_MARGIN_SECONDS: 'x' } ) ).toThrow( 'NARRATION_END_MARGIN_SECONDS' );
  } );
} );

describe( 'configuration', () => {
  it( 'names every missing setting and never a value', () => {
    expect( () => loadTtsConfig( { ELEVENLABS_API_KEY: 'k' } ) ).toThrow( 'ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL_ID' );
    expect( () => loadTtsConfig( {} ) ).toThrow( 'ELEVENLABS_API_KEY' );
    expect( loadTtsConfig( { ELEVENLABS_API_KEY: 'k', ELEVENLABS_VOICE_ID: 'v', ELEVENLABS_MODEL_ID: 'm' } ) ).toEqual( { apiKey: 'k', voiceId: 'v', modelId: 'm' } );
  } );

  it( 'parses an env file', () => {
    expect( parseEnvFile( '# c\nA=1\nB="two"\n\nC = x ' ) ).toEqual( { A: '1', B: 'two', C: 'x' } );
  } );
} );
