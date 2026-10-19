/** Small cartoon parts for the kids series: a friendly Earth mascot, faces, arrows and the sky backdrop. Pure functions of time in seconds. */
import { KIDS_PALETTE as K } from './config.js';
import { clamp, f1 } from '../edu/kit.js';
import { FONT } from '../design/tokens.js';

export type Mood = 'smile' | 'grit' | 'wow' | 'happy';

/** Overshooting ease for the "snap" moments. */
export const popEase = ( x: number ) => {
  const c = clamp( x );
  return 1 + 2.7 * ( c - 1 ) ** 3 + 1.7 * ( c - 1 ) ** 2;
};

/** Outlined text in the kids look: heavy rounded face with a white edge so it reads on any background. */
export const Bubble: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; color?: string; opacity?: number; scale?: number; rotate?: number; anchor?: 'start' | 'middle' | 'end' }> = (
  { x, y, children, size = 64, color = K.ink, opacity = 1, scale = 1, rotate = 0, anchor = 'middle' }
) => (
  <text
    x={0} y={0} transform={`translate(${f1( x )} ${f1( y )}) rotate(${f1( rotate )}) scale(${scale.toFixed( 3 )})`} textAnchor={anchor} opacity={opacity}
    fontFamily={FONT.ui} fontWeight={900} fontSize={size} fill={color} stroke={K.white} strokeWidth={size * 0.16} paintOrder="stroke" strokeLinejoin="round"
  >{children}</text>
);

/** Eyes and mouth centred on (x, y); `s` is the face width. */
export const Face: React.FC<{ x: number; y: number; s: number; mood: Mood; t: number; look?: number }> = ( { x, y, s, mood, t, look = 0 } ) => {
  const blink = t % 3.4 < 0.12 ? 0.1 : 1;
  const eye = ( dx: number ) => (
    <g key={dx} transform={`translate(${f1( x + dx * s )} ${f1( y )})`}>
      {mood === 'grit' ? <path d={`M ${-0.11 * s} ${0.02 * s} L ${0.11 * s} ${-0.02 * s}`} stroke={K.ink} strokeWidth={0.05 * s} strokeLinecap="round" /> : (
        <g transform={`scale(1 ${blink})`}>
          <ellipse rx={0.12 * s} ry={mood === 'wow' ? 0.15 * s : 0.13 * s} fill="#fff" stroke={K.ink} strokeWidth={0.02 * s} />
          <circle cx={look * 0.04 * s} cy={0.01 * s} r={0.06 * s} fill={K.ink} />
          <circle cx={look * 0.04 * s + 0.02 * s} cy={-0.02 * s} r={0.02 * s} fill="#fff" />
        </g>
      )}
    </g>
  );
  const my = y + 0.2 * s;
  const mouth = {
    smile: <path d={`M ${x - 0.16 * s} ${my} Q ${x} ${my + 0.14 * s} ${x + 0.16 * s} ${my}`} fill="none" stroke={K.ink} strokeWidth={0.045 * s} strokeLinecap="round" />,
    happy: <path d={`M ${x - 0.2 * s} ${my - 0.02 * s} Q ${x} ${my + 0.3 * s} ${x + 0.2 * s} ${my - 0.02 * s} Z`} fill="#c2415d" stroke={K.ink} strokeWidth={0.04 * s} strokeLinejoin="round" />,
    wow: <ellipse cx={x} cy={my + 0.04 * s} rx={0.07 * s} ry={0.09 * s} fill="#c2415d" stroke={K.ink} strokeWidth={0.035 * s} />,
    grit: <path d={`M ${x - 0.18 * s} ${my} l ${0.06 * s} ${-0.05 * s} l ${0.06 * s} ${0.1 * s} l ${0.06 * s} ${-0.1 * s} l ${0.06 * s} ${0.1 * s} l ${0.06 * s} ${-0.05 * s}`} fill="none" stroke={K.ink} strokeWidth={0.04 * s} strokeLinejoin="round" strokeLinecap="round" />
  }[mood];
  return (
    <g>
      {[ -0.2, 0.2 ].map( dx => eye( dx ) )}
      {[ -0.3, 0.3 ].map( dx => <ellipse key={dx} cx={x + dx * s} cy={y + 0.14 * s} rx={0.06 * s} ry={0.04 * s} fill={K.pink} opacity={0.55} /> )}
      {mood === 'grit' ? <path d={`M ${x + 0.4 * s} ${y - 0.1 * s} q 0.05 ${0.1 * s} 0 ${0.14 * s} q -0.05 ${-0.04 * s} 0 ${-0.14 * s}`} fill={K.blue} opacity={0.8} /> : null}
      {mouth}
    </g>
  );
};

/** The Earth mascot: a round blue planet with green continents. */
export const Mascot: React.FC<{ x: number; y: number; r: number; mood?: Mood; t: number; bounce?: number; tilt?: number; look?: number }> = ( { x, y, r, mood = 'smile', t, bounce = 1, tilt = 0, look = 0 } ) => {
  const dy = -Math.abs( Math.sin( t * 3.2 ) ) * r * 0.08 * bounce;
  const id = `m${Math.round( r )}`;
  return (
    <g transform={`translate(${f1( x )} ${f1( y + dy )}) rotate(${f1( tilt )}) scale(${( r / 100 ).toFixed( 3 )})`}>
      <ellipse cx={0} cy={112 - dy / ( r / 100 )} rx={70} ry={10} fill="#000" opacity={0.1} />
      <clipPath id={id}><circle r={100} /></clipPath>
      <circle r={100} fill={K.blue} />
      <g clipPath={`url(#${id})`}>
        <path d="M -95 -40 Q -60 -85 -20 -62 Q 5 -40 -25 -18 Q -40 10 -70 -5 Z" fill={K.green} />
        <path d="M 40 -75 Q 90 -60 85 -15 Q 70 5 50 -20 Q 30 -40 40 -75 Z" fill={K.green} />
        <path d="M -10 55 Q 35 35 70 60 Q 50 100 5 95 Q -25 85 -10 55 Z" fill={K.green} />
        <ellipse cx={-38} cy={-50} rx={38} ry={18} fill="#fff" opacity={0.25} transform="rotate(-30 -38 -50)" />
      </g>
      <circle r={100} fill="none" stroke={K.ink} strokeWidth={6} />
      <Face x={0} y={4} s={150} mood={mood} t={t} look={look} />
    </g>
  );
};

export const Arrow: React.FC<{ x: number; y: number; dir: 1 | -1; color: string; size?: number; opacity?: number; vertical?: boolean }> = ( { x, y, dir, color, size = 120, opacity = 1, vertical = false } ) => (
  <g transform={`translate(${f1( x )} ${f1( y )}) rotate(${vertical ? 90 : 0}) scale(${dir * size / 120} ${size / 120})`} opacity={opacity}>
    <path d="M -60 -22 H 10 V -50 L 62 0 L 10 50 V 22 H -60 Z" fill={color} stroke={K.ink} strokeWidth={7} strokeLinejoin="round" />
  </g>
);

export const Star: React.FC<{ x: number; y: number; r: number; fill: string; points?: number; rotate?: number }> = ( { x, y, r, fill, points = 10, rotate = 0 } ) => {
  const pts = Array.from( { length: points * 2 }, ( _, i ) => {
    const a = ( i / ( points * 2 ) ) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.62;
    return `${f1( x + Math.cos( a ) * rr )},${f1( y + Math.sin( a ) * rr )}`;
  } ).join( ' ' );
  return <polygon points={pts} fill={fill} stroke={K.ink} strokeWidth={7} strokeLinejoin="round" transform={`rotate(${f1( rotate )} ${f1( x )} ${f1( y )})`} />;
};

const cloud = ( x: number, y: number, s: number ) => (
  <g transform={`translate(${f1( x )} ${f1( y )}) scale(${s})`} fill="#fff" opacity={0.9}>
    <ellipse cx={0} cy={0} rx={90} ry={34} /><circle cx={-30} cy={-22} r={38} /><circle cx={28} cy={-30} r={46} />
  </g>
);

/** Bright sky, sun, drifting clouds and grassy hills. */
export const SkyBackdrop: React.FC<{ t: number }> = ( { t } ) => (
  <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={K.skyTop} /><stop offset="1" stopColor={K.skyBottom} /></linearGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#sky)" />
    <g transform={`translate(930 330) rotate(${f1( t * 8 )})`}>
      {Array.from( { length: 12 }, ( _, i ) => <rect key={i} x={-6} y={-120} width={12} height={34} rx={6} fill={K.sun} transform={`rotate(${i * 30})`} /> )}
    </g>
    <circle cx={930} cy={330} r={70} fill={K.sun} />
    {cloud( ( ( t * 14 ) % 1500 ) - 200, 380, 1.2 )}
    {cloud( ( ( t * 9 + 700 ) % 1500 ) - 200, 1450, 1 )}
    {cloud( ( ( t * 11 + 300 ) % 1500 ) - 200, 560, 0.8 )}
    <path d="M 0 1640 Q 270 1560 540 1640 T 1080 1620 V 1920 H 0 Z" fill={K.grass} />
    <path d="M 0 1740 Q 330 1680 640 1750 T 1080 1730 V 1920 H 0 Z" fill="#58c95a" />
  </svg>
);
