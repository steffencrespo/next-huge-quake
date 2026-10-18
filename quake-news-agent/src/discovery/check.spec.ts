import { describe, expect, it, vi } from 'vitest';
import { checkEventIsNew } from './check.js';

const base = { eventId: 'us1', usgsIds: [ 'us1', 'ak9' ], producedIds: new Set<string>(), workflowExists: async () => false };

describe( 'checkEventIsNew', () => {
  it( 'accepts a new event and reports every ID it checked', async () => {
    const exists = vi.fn( async () => false );
    expect( await checkEventIsNew( { ...base, workflowExists: exists } ) ).toEqual( { ok: true, ids: [ 'us1', 'ak9' ] } );
    expect( exists ).toHaveBeenCalledTimes( 2 );
  } );

  it( 'refuses when any alias already has a video or a started monitor record', async () => {
    const result = await checkEventIsNew( { ...base, producedIds: new Set( [ 'ak9' ] ) } );
    expect( result ).toMatchObject( { ok: false } );
    expect( !result.ok && result.reason ).toContain( 'found under ak9' );
  } );

  it( 'refuses when a quake_video workflow exists under the ID or an alias', async () => {
    const result = await checkEventIsNew( { ...base, workflowExists: async id => id === 'ak9' } );
    expect( !result.ok && result.reason ).toContain( 'quake_video-ak9 already exists' );
  } );

  it( 'fails safe when USGS or Temporal cannot be checked', async () => {
    expect( await checkEventIsNew( { ...base, usgsIds: null } ) ).toMatchObject( { ok: false } );
    const down = await checkEventIsNew( { ...base, workflowExists: async () => { throw new Error( 'HTTP 500' ); } } );
    expect( !down.ok && down.reason ).toContain( 'could not check Temporal' );
  } );
} );
