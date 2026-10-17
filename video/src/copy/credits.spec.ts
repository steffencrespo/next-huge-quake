import { describe, expect, it } from 'vitest';
import { OGL_CANADA_URL, ON_SCREEN_CREDITS, TERRAIN_REQUIRED_ATTRIBUTION, fullCredits } from './credits.js';

describe( 'map credits', () => {
  it( 'lists the complete required terrain attribution verbatim, Mapzen and the OGL-Canada licence link', () => {
    const credits = fullCredits( 'terrain' );
    expect( TERRAIN_REQUIRED_ATTRIBUTION ).toHaveLength( 11 );
    for ( const line of TERRAIN_REQUIRED_ATTRIBUTION ) {
      expect( credits ).toContain( line );
    }
    expect( credits ).toContain( 'Mapzen' );
    expect( credits ).toContain( OGL_CANADA_URL );
    expect( credits ).toContain( 'Natural Earth' );
    expect( credits ).toContain( 'U.S. Geological Survey' );
  } );

  it( 'adds no terrain attribution for the Natural Earth map', () => {
    const credits = fullCredits( 'natural-earth' );
    expect( credits ).not.toContain( 'Mapzen' );
    expect( credits ).toContain( 'Natural Earth' );
  } );

  it( 'keeps on-screen lines short and free of numbers (no copy-guard exceptions)', () => {
    for ( const { footer, closing } of Object.values( ON_SCREEN_CREDITS ) ) {
      expect( `${footer} ${closing}` ).not.toMatch( /\d/ );
    }
    expect( ON_SCREEN_CREDITS.terrain ).toMatchObject( { footer: 'Terrain: Mapzen', closing: 'Map data: Natural Earth · Terrain: Mapzen' } );
  } );
} );
