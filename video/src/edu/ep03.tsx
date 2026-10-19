/**
 * Episode 03, "Magnitude 6 vs 7": the logarithmic scale as measurable things. A seismogram pair (10x amplitude), a
 * square-count energy comparison (32x, then 32 x 32 = about 1000x), then shaking intensity: a map of ground shaking
 * and two schematic cross-sections that show a shallow M6 shaking a city harder than a deep, distant M7.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, HOT, HookTitle, P_COLOR, Pill, S_COLOR, Txt, at, clamp, f1, span, mulberry32, prog, smooth, vis, within } from './kit.js';
import { SeriesTag, makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';

const CX = 540;

/** Pseudo-random trace, same every frame: sum of sines, scaled by an envelope. */
const traceY = ( x: number, amp: number, seed: number ) => {
  const r = mulberry32( seed );
  const phases = Array.from( { length: 5 }, () => r() * 6.28 );
  return amp * ( 0.5 * Math.sin( x / 7 + phases[0] ) + 0.3 * Math.sin( x / 3.1 + phases[1] ) + 0.25 * Math.sin( x / 13 + phases[2] ) + 0.2 * Math.sin( x / 1.9 + phases[3] ) );
};

const Trace: React.FC<{ y: number; amp: number; reveal: number; color: string; seed: number }> = ( { y, amp, reveal, color, seed } ) => {
  const x0 = 100;
  const x1 = 980;
  const n = Math.round( ( x1 - x0 ) / 4 );
  const pts: string[] = [];
  for ( let i = 0; i <= n * reveal; i++ ) {
    const x = x0 + i * 4;
    const env = Math.exp( -Math.pow( ( x - 430 ) / 230, 2 ) ) * Math.min( 1, ( x - x0 ) / 60 );
    pts.push( `${x},${f1( y + traceY( x, amp * 2, seed ) * env )}` );
  }
  return <polyline points={pts.join( ' ' )} fill="none" stroke={color} strokeWidth={3.5} strokeLinejoin="round" />;
};

const Scale: React.FC<{ t: number; o: number; b: Parameters<EpisodeVisuals>[0]['b'] }> = ( { t, o, b } ) => {
  // equal spacing = each step is a multiplication, not an addition
  const xs = [ 5, 6, 7, 8, 9 ].map( ( m, i ) => ( { m, x: 140 + i * 200 } ) );
  const hi = prog( t, at( b, 'amplitude', 0.5 ), 0.5 );
  const hi2 = prog( t, at( b, 'energy', 0 ), 0.5 );
  return (
    <g opacity={o}>
      <line x1={110} x2={970} y1={420} y2={420} stroke={COLORS.textSupport} strokeWidth={4} />
      {xs.map( ( p, i ) => (
        <g key={p.m}>
          <line x1={p.x} x2={p.x} y1={396} y2={444} stroke={COLORS.text} strokeWidth={4} />
          <Txt x={p.x} y={500} size={44} display weight={700} color={p.m === 6 || p.m === 7 ? COLORS.text : COLORS.textSecondary}>{p.m}</Txt>
          {i < 4 && p.m >= 5 ? <path d={`M${p.x + 12},392 Q${p.x + 100},340 ${p.x + 188},392`} fill="none" stroke={S_COLOR} strokeWidth={3} opacity={p.m === 6 ? hi : 0.18} /> : null}
        </g>
      ) )}
      <Txt x={640} y={338} size={34} color={P_COLOR} opacity={hi}>×10 AMPLITUDE</Txt>
      <Txt x={640} y={298} size={34} color={S_COLOR} opacity={hi2}>×32 ENERGY</Txt>
      <circle cx={xs[1].x} cy={420} r={14 + 3 * Math.sin( t * 6 )} fill="none" stroke={HOT} strokeWidth={5} />
      <circle cx={xs[2].x} cy={420} r={14 + 3 * Math.sin( t * 6 + 2 )} fill="none" stroke={HOT} strokeWidth={5} />
    </g>
  );
};

const HookNumerals: React.FC<{ t: number; b: Parameters<EpisodeVisuals>[0]['b'] }> = ( { t, b } ) => {
  const o = vis( t, 0.2, b.log.start + 0.2, 0.5 );
  if ( o <= 0.01 ) {
    return null;
  }
  const grow = prog( t, 1.2, 1.4 );
  const pulse = 1 + 0.03 * Math.sin( t * 5 );
  return (
    <g opacity={o}>
      {[ { x: 300, m: '6', r: 150, c: S_COLOR }, { x: 780, m: '7', r: 150 + 110 * grow, c: HOT } ].map( ( p, i ) => (
        <g key={p.m}>
          {[ 1, 0.72, 0.46 ].map( ( k, j ) => <circle key={j} cx={p.x} cy={900} r={p.r * k * pulse} fill="none" stroke={p.c} strokeWidth={5 - j} opacity={0.9 - j * 0.25} /> )}
          <circle cx={p.x} cy={900} r={p.r * 0.46 * pulse} fill={p.c} opacity={0.14} />
          <Txt x={p.x} y={900 + 70} size={210} display weight={800} color={COLORS.text}>{p.m}</Txt>
          <Txt x={p.x} y={900 - p.r - 40} size={38} display spacing={5} color={p.c}>{i === 0 ? 'MAGNITUDE' : 'MAGNITUDE'}</Txt>
        </g>
      ) )}
      <Txt x={540} y={1210} size={48} color={COLORS.textSupport} opacity={prog( t, 2.4 )}>just one step apart?</Txt>
    </g>
  );
};

const Amplitude: React.FC<{ t: number; o: number; b: Parameters<EpisodeVisuals>[0]['b'] }> = ( { t, o, b } ) => {
  const grow = prog( t, at( b, 'amplitude', 0 ), 2.4 );
  const brace = prog( t, at( b, 'amplitude', 1.8 ), 0.6 );
  return (
    <g opacity={o}>
      {[ { y: 750, amp: 7, c: S_COLOR, label: 'M6', seed: 3 }, { y: 1085, amp: 70, c: HOT, label: 'M7', seed: 3 } ].map( p => (
        <g key={p.label}>
          <line x1={100} x2={980} y1={p.y} y2={p.y} stroke={COLORS.rule} strokeWidth={2} strokeDasharray="8 8" />
          <Trace y={p.y} amp={p.amp} reveal={grow} color={p.c} seed={p.seed} />
          <Pill x={170} y={p.y - (p.label === 'M7' ? 180 : 70)} text={p.label} color={p.c} size={36} />
        </g>
      ) )}
      <g opacity={brace}>
        <line x1={1010} x2={1010} y1={1085 - 130} y2={1085 + 130} stroke={COLORS.text} strokeWidth={4} />
        <line x1={1000} x2={1010} y1={1085 - 130} y2={1085 - 130} stroke={COLORS.text} strokeWidth={4} />
        <line x1={1000} x2={1010} y1={1085 + 130} y2={1085 + 130} stroke={COLORS.text} strokeWidth={4} />
        <line x1={1000} x2={1010} y1={750 - 13} y2={750 - 13} stroke={COLORS.text} strokeWidth={4} />
        <line x1={1000} x2={1010} y1={750 + 13} y2={750 + 13} stroke={COLORS.text} strokeWidth={4} />
        <Txt x={540} y={1262} size={34} color={COLORS.textSupport}>Same instrument, same distance · amplitude ≈ ×10</Txt>
      </g>
    </g>
  );
};

const Squares: React.FC<{ t: number; o: number; b: Parameters<EpisodeVisuals>[0]['b'] }> = ( { t, o, b } ) => {
  const n = Math.floor( prog( t, at( b, 'energy', 0.3 ), 2.2 ) * 32 + 0.001 );
  const sq = 56;
  return (
    <g opacity={o}>
      <rect x={140} y={620} width={sq} height={sq} fill={S_COLOR} />
      <Txt x={140 + sq + 24} y={620 + 40} size={40} anchor="start" color={COLORS.text}>M6 = 1 unit of energy</Txt>
      {Array.from( { length: 32 }, ( _, i ) => {
        const c = i % 8;
        const r = Math.floor( i / 8 );
        return <rect key={i} x={140 + c * ( sq + 8 )} y={800 + r * ( sq + 8 )} width={sq} height={sq} fill={HOT} opacity={i < n ? 1 : 0.1} />;
      } )}
      <Txt x={140} y={800 + 4 * 64 + 60} size={40} anchor="start">M7 = 32 units</Txt>
      <Txt x={850} y={960} size={150} display weight={800} color={HOT} opacity={prog( t, at( b, 'energy', 1.6 ), 0.5 )}>×32</Txt>
    </g>
  );
};

const Thousand: React.FC<{ t: number; o: number; b: Parameters<EpisodeVisuals>[0]['b'] }> = ( { t, o, b } ) => {
  const k = prog( t, at( b, 'two', 0.2 ), 1.8 );
  const cell = 15;
  const x0 = CX - 16 * cell;
  const y0 = 560;
  const lit = Math.floor( k * 1024 );
  return (
    <g opacity={o}>
      {Array.from( { length: 1024 }, ( _, i ) => {
        const c = i % 32;
        const r = Math.floor( i / 32 );
        return <rect key={i} x={x0 + c * cell} y={y0 + r * cell} width={cell - 3} height={cell - 3} fill={i < lit ? HOT : '#31161a'} opacity={i < lit ? 0.95 : 0.55} />;
      } )}
      <rect x={x0} y={y0} width={cell - 3} height={cell - 3} fill={S_COLOR} stroke="#fff" strokeWidth={2} />
      <Txt x={540} y={y0 + 32 * cell + 80} size={96} display weight={800} opacity={prog( t, at( b, 'two', 1.5 ), 0.5 )}>M8 ≈ 1,000 × M6</Txt>
      <Txt x={540} y={y0 + 32 * cell + 136} size={34} color={COLORS.textSupport} opacity={prog( t, at( b, 'two', 1.5 ), 0.5 )}>32 × 32 ≈ 1,000 (energy)</Txt>
    </g>
  );
};

/** Concentric shaking zones around an epicenter, strongest in the middle. */
const ShakeMap: React.FC<{ t: number; o: number; b: Parameters<EpisodeVisuals>[0]['b']; from: string }> = ( { t, o, b, from } ) => {
  const k = prog( t, at( b, from, 0 ), 1.2 );
  const zones = [ { r: 360, c: '#2a5b8f' }, { r: 270, c: '#2f9a6a' }, { r: 190, c: '#e6c540' }, { r: 120, c: '#f28c28' }, { r: 60, c: '#e5242b' } ];
  return (
    <g opacity={o}>
      <circle cx={CX} cy={700} r={380 * k} fill="none" stroke={COLORS.rule} strokeWidth={2} />
      {zones.map( ( z, i ) => <circle key={i} cx={CX} cy={700} r={z.r * k} fill={z.c} opacity={0.55} /> )}
      <circle cx={CX} cy={700} r={12} fill="#fff" />
      <Txt x={CX} y={1130} size={34} color={COLORS.textSupport} opacity={k}>Shaking intensity fades with distance (schematic)</Txt>
    </g>
  );
};

const Chips: React.FC<{ t: number; o: number; b: Parameters<EpisodeVisuals>[0]['b'] }> = ( { t, o, b } ) => (
  <g opacity={o}>
    {[ 'DISTANCE', 'DEPTH', 'SOIL', 'BUILDINGS' ].map( ( s, i ) => (
      <Pill key={s} x={i % 2 === 0 ? 300 : 780} y={1205 + Math.floor( i / 2 ) * 80} text={s} color={S_COLOR} size={36} opacity={prog( t, within( b, 'damage', 0.3 + i * 0.17 ), 0.35 )} />
    ) )}
  </g>
);

const City: React.FC<{ x: number; y: number; shake: number; t: number }> = ( { x, y, shake, t } ) => (
  <g transform={`translate(${f1( x + shake * 9 * Math.sin( t * 31 ) )} ${f1( y + shake * 5 * Math.sin( t * 43 ) )})`}>
    {[ [ -60, 70 ], [ -22, 120 ], [ 18, 90 ], [ 56, 55 ] ].map( ( [ dx, h ], i ) => (
      <g key={i} transform={`rotate(${f1( shake * 4 * Math.sin( t * 29 + i ) )} ${dx} 0)`}>
        <rect x={dx - 15} y={-h} width={30} height={h} fill="#0c1220" stroke="#8fa3c7" strokeWidth={2} />
        <rect x={dx - 6} y={-h + 14} width={12} height={10} fill="#f6c86a" opacity={0.8} />
      </g>
    ) )}
  </g>
);

const Compare: React.FC<{ t: number; o: number; b: Parameters<EpisodeVisuals>[0]['b'] }> = ( { t, o, b } ) => {
  const k = prog( t, at( b, 'shallow', 0.2 ), 0.6 );
  const wave = ( cx: number, cy: number, tt: number, r: number ) =>
    [ 0, 1, 2 ].map( i => {
      const rr = ( ( tt * 90 + i * 70 ) % 260 );
      return <circle key={i} cx={cx} cy={cy} r={rr} fill="none" stroke={r > 0 ? P_COLOR : '#444'} strokeWidth={4} opacity={r * ( 1 - rr / 260 )} />;
    } );
  const panels = [
    { x0: 40, label: 'M6 · SHALLOW · NEAR CITY', mag: 'M6', hypoY: 700, hypoX: 280, strong: 1, color: S_COLOR },
    { x0: 560, label: 'M7 · DEEP · FAR OFFSHORE', mag: 'M7', hypoY: 980, hypoX: 820, strong: 0.12, color: HOT }
  ];
  return (
    <g opacity={o * k}>
      {panels.map( ( p, i ) => (
        <g key={p.mag}>
          <rect x={p.x0} y={430} width={480} height={640} rx={14} fill="rgba(14,21,34,0.7)" stroke={COLORS.rule} strokeWidth={3} />
          <rect x={p.x0 + 3} y={620} width={474} height={447} fill="#2a2630" />
          <line x1={p.x0 + 3} x2={p.x0 + 477} y1={620} y2={620} stroke="#cdbfa0" strokeWidth={3} />
          {i === 1 ? <rect x={p.x0 + 3} y={620} width={300} height={447} fill="#1a2a4a" opacity={0.0} /> : null}
          <g clipPath={`url(#cl${i})`}>{wave( p.hypoX, p.hypoY, t - at( b, 'shallow', 0.6 ), t > at( b, 'shallow', 0.6 ) ? 1 : 0 )}</g>
          <clipPath id={`cl${i}`}><rect x={p.x0 + 3} y={620} width={474} height={447} /></clipPath>
          <circle cx={p.hypoX} cy={p.hypoY} r={i === 0 ? 14 : 24} fill={p.color} stroke="#fff" strokeWidth={3} />
          <Txt x={p.hypoX + (i === 0 ? 0 : 0)} y={p.hypoY + 64} size={32} color={p.color}>{p.mag}</Txt>
          <City x={i === 0 ? 250 : 640} y={618} shake={p.strong * clamp( ( t - at( b, 'shallow', 1.4 ) ) / 0.6 )} t={t} />
          <Txt x={p.x0 + 240} y={480} size={30} color={COLORS.text} spacing={1}>{p.label}</Txt>
          <Txt x={p.x0 + 240} y={1130} size={42} display weight={700} color={i === 0 ? S_COLOR : COLORS.textSupport} opacity={prog( t, at( b, 'shallow', 2.4 ), 0.5 )}>{i === 0 ? 'STRONG SHAKING' : 'WEAK SHAKING AT THE CITY'}</Txt>
        </g>
      ) )}
      <Txt x={540} y={1210} size={32} color={COLORS.textSupport}>Illustrative scenario, not a rule</Txt>
    </g>
  );
};

const Wrap: React.FC<{ t: number; o: number; b: Parameters<EpisodeVisuals>[0]['b'] }> = ( { t, o, b } ) => (
  <g opacity={o}>
    {[ { y: 650, a: 'MAGNITUDE', c: 'SIZE', col: S_COLOR, d: 0 }, { y: 950, a: 'INTENSITY', c: 'SHAKING', col: HOT, d: 1.3 } ].map( r => (
      <g key={r.a} opacity={prog( t, at( b, 'wrap', r.d ), 0.5 )}>
        <rect x={110} y={r.y - 90} width={860} height={200} rx={18} fill="rgba(14,21,34,0.9)" stroke={r.col} strokeWidth={4} />
        <Txt x={160} y={r.y + 25} size={80} display weight={800} anchor="start" spacing={3}>{r.a}</Txt>
        <Txt x={930} y={r.y + 25} size={80} display weight={800} anchor="end" color={r.col} spacing={3}>{r.c}</Txt>
      </g>
    ) )}
  </g>
);

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  return (
    <>
      <Backdrop accent="#2b1b3f" />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <HookNumerals t={t} b={b} />
        <Scale t={t} o={span( t, b, 'log', 'source' )} b={b} />
        <Amplitude t={t} o={span( t, b, 'amplitude', 'energy' )} b={b} />
        <Squares t={t} o={span( t, b, 'energy', 'two' )} b={b} />
        <Thousand t={t} o={span( t, b, 'two', 'source' )} b={b} />
        <ShakeMap t={t} o={span( t, b, 'source', 'shallow' )} b={b} from="source" />
        <Chips t={t} o={span( t, b, 'damage', 'shallow' )} b={b} />
        <Compare t={t} o={span( t, b, 'shallow', 'wrap' )} b={b} />
        <Wrap t={t} o={span( t, b, 'wrap', 'cta' )} b={b} />
      </svg>
      <HookTitle t={t} lines={[ 'MAGNITUDE 6', 'VS 7' ]} until={b.log.start - 0.3} />
      <SeriesTag number={3} opacity={vis( t, b.log.start, b.cta.start - 1, 0.6 )} />
    </>
  );
};

export const Magnitude = makeEduShort( {
  id: 'magnitude',
  Visuals,
  cues: b => [
    { sfx: 'riser', at: b.hook.start, dur: 2.2, volume: 0.25 },
    { sfx: 'boom', at: b.hook.start + 2.4, dur: 3, volume: 0.45 },
    { sfx: 'tick', at: at( b, 'log', 0.2 ), dur: 0.3, volume: 0.5 },
    { sfx: 'whoosh', at: at( b, 'amplitude', 0 ), dur: 1.4, volume: 0.4 },
    { sfx: 'rumble', at: at( b, 'amplitude', 0.8 ), dur: 3.2, volume: s => 0.35 * Math.min( 1, s ) * ( 1 - smooth( ( s - 2.2 ) / 1 ) ) },
    ...Array.from( { length: 8 }, ( _, i ) => ( { sfx: 'tick' as const, at: at( b, 'energy', 0.5 + i * 0.28 ), dur: 0.3, volume: 0.3 } ) ),
    { sfx: 'boom', at: at( b, 'two', 1.4 ), dur: 3, volume: 0.5 },
    { sfx: 'whoosh', at: at( b, 'source', 0 ), dur: 1.4, volume: 0.35 },
    { sfx: 'rumble', at: at( b, 'shallow', 1.4 ), dur: 5, volume: s => 0.4 * Math.exp( -s / 2.5 ) },
    { sfx: 'tick', at: at( b, 'wrap', 0 ), dur: 0.3, volume: 0.5 },
    { sfx: 'tick', at: at( b, 'wrap', 1.3 ), dur: 0.3, volume: 0.5 }
  ]
} );
