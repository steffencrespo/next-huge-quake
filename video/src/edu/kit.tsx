/** Small drawing helpers shared by the educational compositions. All pure functions of time in seconds. */
import { COLORS, FONT, TYPE } from '../design/tokens.js';
import { smooth } from './geo.js';
import type { Beats } from './episodes.js';

export { smooth, lerp, win, mulberry32 } from './geo.js';
export const clamp = ( x: number, lo = 0, hi = 1 ) => Math.min( hi, Math.max( lo, x ) );
/** 0 to 1 progress from t0 over `dur` seconds (eased). */
export const prog = ( t: number, t0: number, dur = 0.6 ) => smooth( ( t - t0 ) / dur );
/** Visible from t0 to t1 with fades. */
export const vis = ( t: number, t0: number, t1: number, fade = 0.4 ) => clamp( ( t - t0 ) / fade ) * clamp( ( t1 - t ) / fade );
export const f1 = ( n: number ) => n.toFixed( 1 );
/** Start time of narration line `id` plus an offset. */
export const at = ( b: Beats, id: string, offset = 0 ) => b[id].start + offset;
/** A point `frac` of the way through line `id`. */
export const within = ( b: Beats, id: string, frac: number ) => b[id].start + ( b[id].end - b[id].start ) * frac;
/** Visible while the voice is on line `from` through line `to` (inclusive of the gap after `to` until `extra` seconds). */
export const during = ( t: number, b: Beats, from: string, to = from, extra = 0.4, fade = 0.4 ) => vis( t, b[from].start - 0.1, b[to].end + extra, fade );

export const P_COLOR = '#7FDBFF';
export const S_COLOR = '#FFB800';
export const HOT = COLORS.redHot;

export const Pill: React.FC<{ x: number; y: number; text: string; color?: string; opacity?: number; size?: number }> = ( { x, y, text, color = COLORS.text, opacity = 1, size = 34 } ) => {
  if ( opacity <= 0.01 ) {
    return null;
  }
  const w = Math.round( text.length * size * 0.66 + 52 );
  return (
    <g opacity={opacity}>
      <rect x={x - w / 2} y={y - size * 0.95} width={w} height={size * 1.8} rx={12} fill="rgba(7, 11, 20, 0.9)" stroke={color} strokeWidth={3} />
      <text x={x} y={y + size * 0.36} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={size} letterSpacing={2} fill={COLORS.text}>{text}</text>
    </g>
  );
};

export const Txt: React.FC<{ x: number; y: number; children: React.ReactNode; size?: number; weight?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; opacity?: number; display?: boolean; spacing?: number }> = (
  { x, y, children, size = 34, weight = 700, color = COLORS.text, anchor = 'middle', opacity = 1, display = false, spacing = 0 }
) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={display ? FONT.display : FONT.ui} fontWeight={weight} fontSize={size} letterSpacing={spacing} fill={color} opacity={opacity} style={display ? { textTransform: 'uppercase' } : undefined}>{children}</text>
);

/** Series backdrop: deep navy gradient with a faint grid. */
export const Backdrop: React.FC<{ accent?: string; grid?: boolean }> = ( { accent = '#1b2a4a', grid = true } ) => (
  <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
    <defs>
      <linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#060a14" /><stop offset="0.55" stopColor="#0b1426" /><stop offset="1" stopColor="#070b14" /></linearGradient>
      <radialGradient id="bdg" cx="50%" cy="38%" r="60%"><stop offset="0" stopColor={accent} stopOpacity="0.55" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
      <radialGradient id="bdv" cx="50%" cy="50%" r="75%"><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.6" /></radialGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#bd)" />
    <rect width={1080} height={1920} fill="url(#bdg)" />
    {grid ? Array.from( { length: 15 }, ( _, i ) => <line key={i} x1={0} x2={1080} y1={260 + i * 80} y2={260 + i * 80} stroke="#8fa3c7" strokeOpacity={0.06} strokeWidth={2} /> ) : null}
    <rect width={1080} height={1920} fill="url(#bdv)" />
  </svg>
);

/** The big opening title, fading out after `until` seconds. */
export const HookTitle: React.FC<{ t: number; lines: string[]; until: number; top?: number }> = ( { t, lines, until, top = 250 } ) => {
  const o = vis( t, 0.15, until, 0.5 );
  if ( o <= 0.01 ) {
    return null;
  }
  return (
    <div style={{ position: 'absolute', left: 72, top, width: 936, opacity: o }}>
      <div style={{ ...TYPE.kicker, color: COLORS.redText }}>EARTHQUAKE SCIENCE EXPLAINED</div>
      {lines.map( ( l, i ) => <div key={i} style={{ ...TYPE.headline, color: COLORS.text, marginTop: i === 0 ? 18 : 0 }}>{l}</div> )}
    </div>
  );
};

/** Scene visibility: from just before line `from` starts until just after line `next` starts (scenes cross-fade). */
export const span = ( t: number, b: Beats, from: string, next: string, fade = 0.35 ) => vis( t, b[from].start - 0.1, b[next].start + 0.2, fade );
