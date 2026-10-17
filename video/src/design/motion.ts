/**
 * Deterministic motion primitives: pure functions of the frame, built on Remotion's interpolate and easing.
 * Restrained by design: short entrances (8-15 frames), no shake or glitch. The red "seismic tick" wipe is the
 * only signature effect.
 */
import { Easing, interpolate } from 'remotion';
import type { CSSProperties } from 'react';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const EASE_OUT = Easing.out( Easing.cubic );

export const ENTER_FRAMES = 12;

/** 0 -> 1 over `duration` frames starting at `start`, eased out. */
export const progressAt = ( frame: number, start: number, duration = ENTER_FRAMES ) =>
  interpolate( frame, [ start, start + duration ], [ 0, 1 ], { ...clamp, easing: EASE_OUT } );

export const fadeIn = ( frame: number, start: number, duration = ENTER_FRAMES ): CSSProperties =>
  ( { opacity: progressAt( frame, start, duration ) } );

export const slideUp = ( frame: number, start: number, distance = 40, duration = ENTER_FRAMES ): CSSProperties => {
  const p = progressAt( frame, start, duration );
  return { opacity: p, transform: `translateY(${( 1 - p ) * distance}px)` };
};

/** Reveal left to right with a clip path. */
export const wipeIn = ( frame: number, start: number, duration = ENTER_FRAMES ): CSSProperties =>
  ( { clipPath: `inset(0 ${( 1 - progressAt( frame, start, duration ) ) * 100}% 0 0)` } );

/**
 * The seismic tick: a red bar that sweeps across an element in 3 frames before it appears.
 * Returns the bar's horizontal scale (0..1) and opacity.
 */
export const seismicTick = ( frame: number, start: number ) => ( {
  scaleX: interpolate( frame, [ start, start + 3 ], [ 0, 1 ], clamp ),
  opacity: interpolate( frame, [ start + 3, start + 8 ], [ 1, 0 ], clamp )
} );
