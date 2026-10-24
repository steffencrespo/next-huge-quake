import { describe, expect, it } from 'vitest';
import { InvalidAudioError, NarrationTooLongError } from '../../src/audio/tts.js';
import type { Speech } from '../../src/audio/tts.js';
import { estimateClipSeconds, generateLine, preflightLines } from './edu-generate.js';
import type { GenerateLineDeps, LedgerEntry } from './edu-generate.js';

const speech = ( durationSeconds: number ): Speech => ( { mp3: new Uint8Array( [ 1 ] ), alignment: {} as Speech['alignment'], durationSeconds, captions: [] } );

function setup( request: GenerateLineDeps['request'], budget = 200, prior: LedgerEntry[] = [] ) {
  const ledger = [ ...prior ];
  const saved: Speech[] = [];
  const deps: GenerateLineDeps = {
    episode: 'nextbigone', line: { id: 'l1', text: 'x'.repeat( 127 ) }, key: 'k1', characters: 127, budget, limitSeconds: 9,
    spent: () => ledger.reduce( ( n, e ) => n + e.characters, 0 ), record: e => ledger.push( e ), request, save: s => saved.push( s )
  };
  return { deps, ledger, saved };
}

describe( 'narration preflight', () => {
  it( 'estimates conservatively and names the offending line', () => {
    expect( estimateClipSeconds( 120 ) ).toBe( 10 );
    expect( () => preflightLines( [ { id: 'a/ok', text: '', characters: 100 }, { id: 'a/long', text: '', characters: 127 } ], 9 ) ).toThrow( /'a\/long' \(127 characters, estimated 10\.6 s\).*No request was made/ );
    expect( () => preflightLines( [ { id: 'a/ok', text: '', characters: 108 } ], 9 ) ).not.toThrow();
  } );
} );

describe( 'generateLine', () => {
  it( 'saves and records a successful paid request', async () => {
    const { deps, ledger, saved } = setup( async () => speech( 8 ) );
    await generateLine( deps );
    expect( saved ).toHaveLength( 1 );
    expect( ledger ).toHaveLength( 1 );
    expect( ledger[0] ).toMatchObject( { line: 'l1', key: 'k1', characters: 127 } );
    expect( ledger[0].status ).toBeUndefined();
  } );
  it( 'records a rejected over-limit generation without saving it, and the budget counts it', async () => {
    const { deps, ledger, saved } = setup( async () => { throw new NarrationTooLongError( 'too long', speech( 9.4 ) ); } );
    await expect( generateLine( deps ) ).rejects.toBeInstanceOf( NarrationTooLongError );
    expect( saved ).toHaveLength( 0 );
    expect( ledger ).toHaveLength( 1 );
    expect( ledger[0] ).toMatchObject( { characters: 127, status: 'rejected', durationSeconds: 9.4 } );
    // a retry of the same line is now over a 200 credit budget: 127 spent + 127 needed
    let calls = 0;
    const retry = { ...deps, request: async () => { calls++; return speech( 8 ); } };
    await expect( generateLine( retry ) ).rejects.toThrow( /budget: 127 credits already spent/ );
    expect( calls ).toBe( 0 );
  } );
  it( 'records a paid response rejected for invalid alignment and counts it in the budget', async () => {
    const { deps, ledger, saved } = setup( async () => { throw new InvalidAudioError( 'alignment does not match the text' ); } );
    await expect( generateLine( deps ) ).rejects.toBeInstanceOf( InvalidAudioError );
    expect( saved ).toHaveLength( 0 );
    expect( ledger ).toEqual( [ expect.objectContaining( { characters: 127, status: 'rejected', reason: 'alignment does not match the text' } ) ] );
    expect( deps.spent() ).toBe( 127 );
  } );
  it( 'does not record requests that failed without audio', async () => {
    const { deps, ledger } = setup( async () => { throw new Error( 'ElevenLabs returned HTTP 401' ); } );
    await expect( generateLine( deps ) ).rejects.toThrow( /HTTP 401/ );
    expect( ledger ).toHaveLength( 0 );
  } );
  it( 'stops before the request when over budget', async () => {
    let calls = 0;
    const { deps } = setup( async () => { calls++; return speech( 8 ); }, 100 );
    await expect( generateLine( deps ) ).rejects.toThrow( /budget/ );
    expect( calls ).toBe( 0 );
  } );
} );
