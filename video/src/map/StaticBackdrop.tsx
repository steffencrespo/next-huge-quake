import { AbsoluteFill } from 'remotion';
import { CANVAS, MAP_ZONE } from '../design/layout.js';
import { COLORS } from '../design/tokens.js';

const GRID = 120;

/**
 * No-WebGL stand-in for the map, for fast design iteration only. 'globe' suggests the opening globe;
 * 'region' a regional grid. It shows no geography, so final renders always use the live map.
 */
export const StaticBackdrop: React.FC<{ variant: 'globe' | 'region' }> = ( { variant } ) => {
  const cx = CANVAS.width / 2;
  const cy = variant === 'globe' ? 960 : MAP_ZONE.y + MAP_ZONE.height / 2;
  const r = 560;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% ${cy}px, #13213a 0%, ${COLORS.background} 70%)` }}>
      <svg width={CANVAS.width} height={CANVAS.height} style={{ position: 'absolute', inset: 0 }}>
        {variant === 'globe' ? (
          <g>
            <defs>
              <radialGradient id="sphere" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#1c2f4f" />
                <stop offset="100%" stopColor="#0a1220" />
              </radialGradient>
              <clipPath id="clip"><circle cx={cx} cy={cy} r={r} /></clipPath>
            </defs>
            <circle cx={cx} cy={cy} r={r + 14} fill="none" stroke="#3d6a9e" strokeOpacity={0.25} strokeWidth={18} />
            <circle cx={cx} cy={cy} r={r} fill="url(#sphere)" />
            <g clipPath="url(#clip)" stroke="#5b7aa6" strokeOpacity={0.22} fill="none" strokeWidth={1.5}>
              {[ -60, -30, 0, 30, 60 ].map( lat => <ellipse key={`p${lat}`} cx={cx} cy={cy - r * Math.sin( lat * Math.PI / 180 )} rx={r * Math.cos( lat * Math.PI / 180 )} ry={r * 0.12 * Math.cos( lat * Math.PI / 180 )} /> )}
              {[ 0.2, 0.45, 0.7, 0.9 ].map( k => <ellipse key={`m${k}`} cx={cx} cy={cy} rx={r * k} ry={r} /> )}
            </g>
          </g>
        ) : (
          <g stroke="#5b7aa6" strokeOpacity={0.12} strokeWidth={1.5}>
            {Array.from( { length: Math.ceil( CANVAS.width / GRID ) + 1 }, ( _, i ) => <line key={`v${i}`} x1={i * GRID} y1={0} x2={i * GRID} y2={CANVAS.height} /> )}
            {Array.from( { length: Math.ceil( CANVAS.height / GRID ) + 1 }, ( _, i ) => <line key={`h${i}`} x1={0} y1={i * GRID} x2={CANVAS.width} y2={i * GRID} /> )}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
