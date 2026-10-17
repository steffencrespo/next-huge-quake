import { COLORS } from '../design/tokens.js';

/** Normalized seismogram trace: quiet, a small P-wave wiggle, the main spike, then decay. */
const TRACE: [ number, number ][] = [
  [ 0, 0.5 ], [ 0.16, 0.5 ], [ 0.21, 0.4 ], [ 0.26, 0.6 ], [ 0.31, 0.5 ], [ 0.4, 0.5 ],
  [ 0.46, 0.06 ], [ 0.53, 0.94 ], [ 0.59, 0.22 ], [ 0.65, 0.72 ], [ 0.7, 0.4 ], [ 0.75, 0.57 ], [ 0.8, 0.5 ], [ 1, 0.5 ]
];

export const SeismicGlyph: React.FC<{ width?: number; height?: number; color?: string; strokeWidth?: number }> = (
  { width = 96, height = 40, color = COLORS.red, strokeWidth = 5 }
) => {
  const pad = strokeWidth;
  const points = TRACE.map( ( [ x, y ] ) => `${pad + x * ( width - 2 * pad )},${pad + y * ( height - 2 * pad )}` ).join( ' ' );
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', flexShrink: 0 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};
