import { interpolate } from 'remotion';
import { TIMING } from './camera.js';

const RING_COUNT = 3;
const RING_PERIOD = 54;
const RING_MAX_RADIUS = 430;

/**
 * Epicenter marker and stylized rings. The rings are decorative: fixed pixel radius and timing,
 * not scaled to magnitude, distance or shaking intensity.
 */
export const EpicenterOverlay: React.FC<{ frame: number; x: number; y: number }> = ( { frame, x, y } ) => {
  const appear = interpolate( frame, [ TIMING.ringsStart - 30, TIMING.ringsStart ], [ 0, 1 ], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } );
  if ( appear === 0 ) {
    return null;
  }
  const local = frame - TIMING.ringsStart;
  const rings = Array.from( { length: RING_COUNT }, ( _, i ) => {
    const phase = local - i * ( RING_PERIOD / RING_COUNT );
    if ( phase < 0 ) {
      return null;
    }
    const t = ( phase % RING_PERIOD ) / RING_PERIOD;
    return (
      <circle
        key={i}
        cx={x}
        cy={y}
        r={20 + t * RING_MAX_RADIUS}
        fill="none"
        stroke="#ff2a2a"
        strokeWidth={10 * ( 1 - t ) + 1.5}
        opacity={( 1 - t ) ** 1.4 * 0.9}
      />
    );
  } );
  const pulse = 1 + 0.18 * Math.sin( ( frame / 15 ) * Math.PI );

  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, opacity: appear }}>
      <defs>
        <radialGradient id="glow">
          <stop offset="0%" stopColor="#ff3b30" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#ff3b30" stopOpacity={0} />
        </radialGradient>
        <filter id="blur"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      <circle cx={x} cy={y} r={170 * pulse} fill="url(#glow)" />
      <g filter="url(#blur)">{rings}</g>
      {rings}
      <circle cx={x} cy={y} r={20 * pulse} fill="#ff2a2a" />
      <circle cx={x} cy={y} r={7} fill="#ffffff" />
    </svg>
  );
};
