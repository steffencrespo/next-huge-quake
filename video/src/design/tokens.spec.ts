import { describe, expect, it } from 'vitest';
import { COLORS, MAP_COLORS, MIN_FONT_PX, TEXT_PAIRS, TYPE } from './tokens.js';

const channel = ( c: number ) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ( ( v + 0.055 ) / 1.055 ) ** 2.4;
};
const luminance = ( hex: string ) => {
  const [ r, g, b ] = [ 1, 3, 5 ].map( i => parseInt( hex.slice( i, i + 2 ), 16 ) );
  return 0.2126 * channel( r ) + 0.7152 * channel( g ) + 0.0722 * channel( b );
};
export const contrast = ( a: string, b: string ) => {
  const [ hi, lo ] = [ luminance( a ), luminance( b ) ].sort( ( x, y ) => y - x );
  return ( hi + 0.05 ) / ( lo + 0.05 );
};

describe( 'design tokens', () => {
  it( 'meets WCAG contrast for every text pair', () => {
    for ( const pair of TEXT_PAIRS ) {
      expect( contrast( pair.text, pair.background ), pair.name ).toBeGreaterThanOrEqual( pair.min );
    }
  } );

  it( `never sets type below ${MIN_FONT_PX} px`, () => {
    for ( const [ name, style ] of Object.entries( TYPE ) ) {
      expect( Number( style.fontSize ), name ).toBeGreaterThanOrEqual( MIN_FONT_PX );
    }
  } );

  it( 'uses only the bundled font families', () => {
    for ( const style of Object.values( TYPE ) ) {
      expect( style.fontFamily ).toMatch( /^("Barlow Condensed"|Inter), sans-serif$/ );
    }
  } );
} );

/** Parses #RRGGBB or rgba(r, g, b, a) into [r, g, b, a]. */
const rgba = ( color: string ): [ number, number, number, number ] => {
  if ( color.startsWith( '#' ) ) {
    return [ ...[ 1, 3, 5 ].map( i => parseInt( color.slice( i, i + 2 ), 16 ) ), 1 ] as [ number, number, number, number ];
  }
  const [ r, g, b, a ] = color.replace( /[^\d.,]/g, '' ).split( ',' ).map( Number );
  return [ r, g, b, a ];
};
/** `top` composited over an opaque `bottom`. */
const over = ( top: string, bottom: string ) => {
  const [ r, g, b, a ] = rgba( top );
  const [ r0, g0, b0 ] = rgba( bottom );
  const mix = ( x: number, y: number ) => Math.round( x * a + y * ( 1 - a ) );
  return `#${[ mix( r, r0 ), mix( g, g0 ), mix( b, b0 ) ].map( v => v.toString( 16 ).padStart( 2, '0' ) ).join( '' )}`;
};

describe( 'terrain map palette (MAP_COLORS)', () => {
  const deepest = MAP_COLORS.deep.find( ( [ e ] ) => e === -6000 )![1];
  /** Brightest land the style can produce: the top tint stop and full hillshade highlight over the land fill. */
  const brightestLand = over( MAP_COLORS.landHighlight, over( MAP_COLORS.landTint.at( -1 )![1], MAP_COLORS.land ) );

  it( 'orders values land > shelf > deep ocean, with the coastline brightest', () => {
    expect( luminance( MAP_COLORS.land ) ).toBeGreaterThan( luminance( MAP_COLORS.shelf ) * 1.3 );
    expect( luminance( MAP_COLORS.shelf ) ).toBeGreaterThan( luminance( deepest ) );
    expect( luminance( MAP_COLORS.coast ) ).toBeGreaterThan( luminance( brightestLand ) );
  } );

  it( 'keeps the land tint transparent at sea level and the deep ramp darkening with depth', () => {
    expect( MAP_COLORS.landTint[0] ).toEqual( [ 150, 'rgba(0, 0, 0, 0)' ] );
    const deep = [ ...MAP_COLORS.deep ].sort( ( a, b ) => b[0] - a[0] ).map( ( [ , c ] ) => luminance( c ) );
    expect( deep.every( ( v, i ) => i === 0 || v <= deep[i - 1] ) ).toBe( true );
  } );

  it( 'keeps credit text readable over the brightest map content', () => {
    // The footer sits in the scrim's 0.88 band (at least 0.7 x 0.88 strength during the hook).
    const footerBackground = over( `rgba(7, 11, 20, ${0.88 * 0.7})`, brightestLand );
    expect( contrast( COLORS.textSupport, footerBackground ) ).toBeGreaterThanOrEqual( 4.5 );
  } );
} );
