import { describe, expect, it } from 'vitest';
import { MIN_FONT_PX, TEXT_PAIRS, TYPE } from './tokens.js';

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
