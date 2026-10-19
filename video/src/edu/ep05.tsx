/**
 * Episode 05, "Why Does Earthquake Depth Matter?": a schematic cross-section with a depth ruler (USGS classes: shallow 0 to
 * 70 km, intermediate 70 to 300 km, deep 300 to 700 km), then two same-magnitude panels where waves spread from a deep and a
 * shallow focus and shake the same kind of city. Panel geometry is schematic, not to scale; the ruler is linear.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, HOT, HookTitle, P_COLOR, Pill, S_COLOR, Txt, at, clamp, f1, prog, span, vis } from './kit.js';
import { CTA_LINE, plan } from './episodes.js';
import type { EpisodeMeta } from './episodes.js';
import { SeriesTag, makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';

type B = Parameters<EpisodeVisuals>[0]['b'];

export const DEPTH: EpisodeMeta = {
  id: 'depth', number: 5, compositionId: 'EarthquakeDepth', title: 'Why Does Earthquake Depth Matter?', baseSeconds: 40,
  script: plan( [
    { id: 'hook', text: 'Why does earthquake depth matter?' },
    { id: 'focus', text: 'Every earthquake begins at a point underground: the focus.' },
    { id: 'classes', text: 'Shallow means within seventy kilometers. Deep can mean hundreds.' },
    { id: 'spread', text: 'Seismic waves spread out and weaken as they travel.' },
    { id: 'deep', text: 'From a deep focus, waves travel farther, so surface shaking is usually weaker.' },
    { id: 'shallow', text: 'From a shallow focus, the surface is much closer, and shaking can be violent.' },
    { id: 'damage', text: 'That’s why shallow earthquakes can be especially damaging.' },
    { id: 'more', text: 'Depth isn’t everything: magnitude, soil, and buildings matter too.' },
    { id: 'end', text: 'Same magnitude. Different depth. Very different shaking.' },
    CTA_LINE
  ] )
};

const CX = 540;
const SURFACE = 520;

/** Linear depth ruler (1 px per km) with the three USGS classes and a focus marker. */
const Ruler: React.FC<{ t: number; o: number; b: B }> = ( { t, o, b } ) => {
  const bands = [
    { a: 0, z: 70, label: 'SHALLOW', km: '0–70 km', c: HOT },
    { a: 70, z: 300, label: 'INTERMEDIATE', km: '70–300 km', c: S_COLOR },
    { a: 300, z: 700, label: 'DEEP', km: '300–700 km', c: P_COLOR }
  ];
  const showBands = prog( t, at( b, 'classes', 0 ), 0.6 );
  const grow = prog( t, at( b, 'classes', 0.2 ), 1.6 );
  const focusY = SURFACE + 150;
  return (
    <g opacity={o}>
      <rect x={110} y={SURFACE} width={860} height={700} fill="#2a2630" />
      {bands.map( ( p, i ) => {
        const top = SURFACE + p.a * grow;
        const bottom = SURFACE + p.z * grow;
        const lab = prog( t, at( b, 'classes', 0.3 + i * 0.9 ), 0.5 );
        return (
          <g key={p.label} opacity={showBands}>
            <rect x={110} y={top} width={860} height={bottom - top} fill={p.c} opacity={0.18} />
            <line x1={110} x2={970} y1={bottom} y2={bottom} stroke={p.c} strokeWidth={3} strokeDasharray="10 8" />
            <Txt x={140} y={( top + bottom ) / 2 + 13} size={38} anchor="start" display weight={800} color={p.c} opacity={lab}>{p.label} · {p.km}</Txt>
          </g>
        );
      } )}
      <line x1={110} x2={970} y1={SURFACE} y2={SURFACE} stroke="#cdbfa0" strokeWidth={5} />
      <City x={CX + 250} y={SURFACE - 2} shake={0} t={t} />
      {/* the focus, before the ruler takes over */}
      <g opacity={1 - showBands}>
        <line x1={CX} x2={CX} y1={SURFACE} y2={focusY} stroke={COLORS.textSupport} strokeWidth={3} strokeDasharray="8 8" opacity={prog( t, at( b, 'focus', 0.8 ), 0.5 )} />
        <circle cx={CX} cy={focusY} r={22 + 4 * Math.sin( t * 6 )} fill={HOT} stroke="#fff" strokeWidth={4} opacity={prog( t, at( b, 'focus', 0.1 ), 0.4 )} />
        <Txt x={CX + 40} y={focusY + 12} size={44} display weight={800} anchor="start" opacity={prog( t, at( b, 'focus', 0.1 ), 0.4 )}>FOCUS</Txt>
        <Txt x={CX + 20} y={SURFACE + 90} size={34} color={COLORS.textSupport} anchor="start" opacity={prog( t, at( b, 'focus', 0.8 ), 0.5 )}>DEPTH</Txt>
      </g>
      <Txt x={540} y={SURFACE + 770} size={30} color={COLORS.textSupport} opacity={showBands}>Depth ruler to scale · USGS depth classes</Txt>
    </g>
  );
};

const City: React.FC<{ x: number; y: number; shake: number; t: number }> = ( { x, y, shake, t } ) => (
  <g transform={`translate(${f1( x + shake * 9 * Math.sin( t * 31 ) )} ${f1( y + shake * 5 * Math.sin( t * 43 ) )})`}>
    {[ [ -45, 70 ], [ -15, 115 ], [ 15, 85 ], [ 45, 55 ] ].map( ( [ dx, h ], i ) => (
      <g key={i} transform={`rotate(${f1( shake * 4 * Math.sin( t * 29 + i ) )} ${dx} 0)`}>
        <rect x={dx - 11} y={-h} width={22} height={h} fill="#0c1220" stroke="#8fa3c7" strokeWidth={2} />
        <rect x={dx - 4} y={-h + 12} width={8} height={8} fill="#f6c86a" opacity={0.8} />
      </g>
    ) )}
  </g>
);

const WAVE_SPEED = 230;
const PERIOD = 1.5;
const REACH = 560;

/** Two same-magnitude panels: waves spread from a deep and a shallow focus; amplitude falls with the distance travelled. */
const Compare: React.FC<{ t: number; o: number; b: B }> = ( { t, o, b } ) => {
  const t0 = at( b, 'spread', 0.3 );
  const panels = [
    { x0: 40, focusY: 1010, label: 'DEEP FOCUS', note: 'WEAKER SHAKING', id: 'deep', color: P_COLOR },
    { x0: 560, focusY: 730, label: 'SHALLOW FOCUS', note: 'STRONG SHAKING', id: 'shallow', color: HOT }
  ];
  const hot = prog( t, at( b, 'damage', 0 ), 0.5 );
  return (
    <g opacity={o}>
      {panels.map( ( p, i ) => {
        const fx = p.x0 + 240;
        const dist = p.focusY - 620;
        let shake = 0;
        const rings = Array.from( { length: 14 }, ( _, k ) => k ).map( k => {
          const age = t - t0 - k * PERIOD;
          const r = age * WAVE_SPEED;
          if ( age < 0 || r > REACH ) {
            return null;
          }
          const strength = Math.pow( clamp( 1 - r / REACH ), 1.5 );
          shake += strength * clamp( 1 - Math.abs( r - dist ) / 90 );
          return <circle key={k} cx={fx} cy={p.focusY} r={r} fill="none" stroke={p.color} strokeWidth={3 + 5 * strength} opacity={0.15 + 0.85 * strength} />;
        } );
        const labelIn = prog( t, at( b, p.id, 0 ), 0.5 );
        return (
          <g key={p.id}>
            <rect x={p.x0} y={430} width={480} height={640} rx={14} fill="rgba(14,21,34,0.7)" stroke={i === 1 && hot > 0 ? HOT : COLORS.rule} strokeWidth={i === 1 && hot > 0 ? 6 : 3} />
            <rect x={p.x0 + 3} y={620} width={474} height={447} fill="#2a2630" />
            <clipPath id={`dc${i}`}><rect x={p.x0 + 3} y={620} width={474} height={447} /></clipPath>
            <g clipPath={`url(#dc${i})`}>{rings}</g>
            <line x1={p.x0 + 3} x2={p.x0 + 477} y1={620} y2={620} stroke="#cdbfa0" strokeWidth={3} />
            <line x1={fx} x2={fx} y1={620} y2={p.focusY} stroke={COLORS.textSupport} strokeWidth={2} strokeDasharray="6 8" opacity={0.7} />
            <circle cx={fx} cy={p.focusY} r={16} fill={p.color} stroke="#fff" strokeWidth={3} />
            <City x={fx} y={618} shake={clamp( shake * 1.1 )} t={t} />
            <Txt x={fx} y={485} size={34} display weight={800} color={p.color} opacity={labelIn}>{p.label}</Txt>
            <Txt x={fx} y={1125} size={38} display weight={700} color={i === 0 ? COLORS.textSupport : HOT} opacity={labelIn}>{i === 1 && hot > 0.5 ? 'ESPECIALLY DAMAGING' : p.note}</Txt>
          </g>
        );
      } )}
      <Pill x={540} y={1215} text="SAME MAGNITUDE" color={S_COLOR} size={36} opacity={prog( t, t0, 0.5 )} />
      <Txt x={540} y={1290} size={30} color={COLORS.textSupport}>Schematic, not to scale</Txt>
    </g>
  );
};

const Factors: React.FC<{ t: number; o: number; b: B }> = ( { t, o, b } ) => (
  <g opacity={o}>
    {[ 'DEPTH', 'MAGNITUDE', 'SOIL', 'BUILDINGS' ].map( ( s, i ) => (
      <Pill key={s} x={540} y={620 + i * 150} text={s} color={i === 0 ? HOT : S_COLOR} size={56} opacity={prog( t, at( b, 'more', 0.5 + i * 0.7 ), 0.4 )} />
    ) )}
  </g>
);

const Wrap: React.FC<{ t: number; o: number; b: B }> = ( { t, o, b } ) => (
  <g opacity={o}>
    {[ { y: 620, a: 'SAME', c: 'MAGNITUDE', col: S_COLOR, d: 0 }, { y: 860, a: 'DIFFERENT', c: 'DEPTH', col: P_COLOR, d: 1.3 }, { y: 1100, a: 'VERY DIFFERENT', c: 'SHAKING', col: HOT, d: 2.5 } ].map( r => (
      <g key={r.a} opacity={prog( t, at( b, 'end', r.d ), 0.5 )}>
        <rect x={80} y={r.y - 90} width={920} height={190} rx={18} fill="rgba(14,21,34,0.9)" stroke={r.col} strokeWidth={4} />
        <Txt x={120} y={r.y + 22} size={r.a.length > 9 ? 56 : 70} display weight={800} anchor="start" spacing={2}>{r.a}</Txt>
        <Txt x={960} y={r.y + 22} size={r.a.length > 9 ? 56 : 70} display weight={800} anchor="end" color={r.col} spacing={2}>{r.c}</Txt>
      </g>
    ) )}
  </g>
);

const Visuals: EpisodeVisuals = ( { t, b } ) => (
  <>
    <Backdrop accent="#3f1b2b" />
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Ruler t={t} o={span( t, b, 'focus', 'spread' )} b={b} />
      <Compare t={t} o={span( t, b, 'spread', 'more' )} b={b} />
      <Factors t={t} o={span( t, b, 'more', 'end' )} b={b} />
      <Wrap t={t} o={span( t, b, 'end', 'cta' )} b={b} />
    </svg>
    <HookTitle t={t} lines={[ 'WHY DOES', 'DEPTH MATTER?' ]} until={b.focus.start - 0.3} />
    <SeriesTag number={5} opacity={vis( t, b.focus.start, b.cta.start - 1, 0.6 )} />
  </>
);

export const EarthquakeDepth = makeEduShort( {
  id: 'depth',
  meta: DEPTH,
  Visuals,
  cues: b => [
    { sfx: 'riser', at: b.hook.start, dur: 2.2, volume: 0.25 },
    { sfx: 'boom', at: b.hook.start + 2.0, dur: 3, volume: 0.4 },
    { sfx: 'tick', at: at( b, 'focus', 0.1 ), dur: 0.3, volume: 0.5 },
    { sfx: 'whoosh', at: at( b, 'classes', 0 ), dur: 1.4, volume: 0.35 },
    { sfx: 'tick', at: at( b, 'classes', 0.4 ), dur: 0.3, volume: 0.4 },
    { sfx: 'tick', at: at( b, 'classes', 1.3 ), dur: 0.3, volume: 0.4 },
    { sfx: 'tick', at: at( b, 'classes', 2.2 ), dur: 0.3, volume: 0.4 },
    { sfx: 'whoosh', at: at( b, 'spread', 0 ), dur: 1.4, volume: 0.3 },
    { sfx: 'rumble', at: at( b, 'deep', 0.5 ), dur: 3, volume: s => 0.15 * Math.exp( -s / 2 ) },
    { sfx: 'rumble', at: at( b, 'shallow', 0.4 ), dur: 4, volume: s => 0.45 * Math.exp( -s / 2.5 ) },
    { sfx: 'tick', at: at( b, 'end', 0 ), dur: 0.3, volume: 0.5 },
    { sfx: 'tick', at: at( b, 'end', 1.3 ), dur: 0.3, volume: 0.5 },
    { sfx: 'boom', at: at( b, 'end', 2.5 ), dur: 3, volume: 0.45 }
  ]
} );
