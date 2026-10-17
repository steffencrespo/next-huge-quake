import { describe, expect, it } from 'vitest';
import { buildScreenCopy } from '../copy/screenCopy.js';
import { DEMO_AS_OF_UTC, FIXTURES } from '../fixtures/index.js';
import { buildVideoSpec } from '../spec/build.js';
import { detailFits, factsRows } from './DataPanel.js';

const copyFor = ( key: keyof typeof FIXTURES ) => buildScreenCopy( buildVideoSpec( FIXTURES[key], { asOfUtc: DEMO_AS_OF_UTC } ) );

describe( 'DataPanel', () => {
  it( 'keeps the important details and drops the low-value one beside long coordinates', () => {
    for ( const key of [ 'noto', 'kamchatka' ] as const ) {
      const shown = Object.fromEntries( copyFor( key ).facts.rows.map( row => [ row.label, detailFits( row ) ] ) );
      expect( shown ).toEqual( { Magnitude: true, Depth: true, Time: true, Epicenter: false } );
    }
  } );

  it( 'does not repeat the coordinates when USGS gave no place name', () => {
    expect( factsRows( copyFor( 'preliminaryTest' ) ).map( r => r.label ) ).toEqual( [ 'Magnitude', 'Depth', 'Time' ] );
    expect( factsRows( copyFor( 'noto' ) ).map( r => r.label ) ).toEqual( [ 'Magnitude', 'Depth', 'Time', 'Epicenter' ] );
  } );
} );
