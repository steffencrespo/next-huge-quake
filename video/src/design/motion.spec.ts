import { describe, expect, it } from 'vitest';
import { fitFontSize } from './fit.js';
import { progressAt, seismicTick, slideUp } from './motion.js';

describe( 'motion', () => {
  it( 'is a pure, clamped function of the frame', () => {
    expect( progressAt( 0, 10 ) ).toBe( 0 );
    expect( progressAt( 22, 10 ) ).toBe( 1 );
    expect( progressAt( 100, 10 ) ).toBe( 1 );
    expect( progressAt( 16, 10 ) ).toBe( progressAt( 16, 10 ) );
  } );

  it( 'settles completely: no movement after the entrance', () => {
    expect( slideUp( 40, 10 ) ).toEqual( { opacity: 1, transform: 'translateY(0px)' } );
    expect( seismicTick( 40, 10 ) ).toEqual( { scaleX: 1, opacity: 0 } );
  } );
} );

describe( 'fitFontSize', () => {
  it( 'shrinks long text within bounds', () => {
    expect( fitFontSize( 'NOTO', 800, 84, 52 ) ).toBe( 84 );
    expect( fitFontSize( 'Kamchatka Peninsula, Russia', 818, 84, 52 ) ).toBe( 63 );
    expect( fitFontSize( 'x'.repeat( 200 ), 818, 84, 52 ) ).toBe( 52 );
  } );
} );
