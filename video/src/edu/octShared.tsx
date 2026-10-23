/** Small helpers shared by the October 26/28/30 Shorts (ep07 to ep09). */
import { clamp, lerp } from './kit.js';

export const pop = ( t: number, t0: number, from = 2.2, dur = 0.22 ) => {
  const k = clamp( ( t - t0 ) / dur );
  return { scale: lerp( from, 1, 1 - Math.pow( 1 - k, 3 ) ), opacity: clamp( ( t - t0 ) / 0.07 ) };
};

export const Layer: React.FC<{ children: React.ReactNode }> = ( { children } ) => <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>{children}</svg>;

/** Scales its children from `cx, cy` as a pop-in starting at `t0`. */
export const Pop: React.FC<{ t: number; t0: number; cx: number; cy: number; from?: number; children: React.ReactNode }> = ( { t, t0, cx, cy, from = 2.2, children } ) => {
  const p = pop( t, t0, from );
  return p.opacity <= 0.01 ? null : <g opacity={p.opacity} transform={`translate(${cx} ${cy}) scale(${p.scale.toFixed( 3 )}) translate(${-cx} ${-cy})`}>{children}</g>;
};

/** SVG arc along a circle; angles are fractions of a turn clockwise from the top. */
export const arcPath = ( cx: number, cy: number, r: number, from: number, to: number ) => {
  const pt = ( a: number ) => [ cx + r * Math.sin( a * 2 * Math.PI ), cy - r * Math.cos( a * 2 * Math.PI ) ].map( v => v.toFixed( 1 ) ).join( ',' );
  return `M${pt( from )} A${r},${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${pt( to )}`;
};
