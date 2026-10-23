/**
 * Episode 09, "Why Do Aftershocks Keep Happening?" (published slot 2026-10-30). Claims and sources: octClaims.ts.
 * A mainshock spike and its decaying tail, a plan view of the slipped fault patch with aftershocks, a schematic decay chart, a
 * weakened building, and a plan view that separates an aftershock (nearby, after a larger quake) from an unrelated later one.
 * Every diagram is schematic and labelled so; no real sequence is plotted.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, HOT, Pill, Txt, clamp, f1, lerp, mulberry32, prog, vis } from './kit.js';
import { CTA_LINE, plan } from './episodes.js';
import type { EpisodeMeta } from './episodes.js';
import { SeriesTag, makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';
import { CompactCta } from './ep06.js';
import { Layer, Pop } from './octShared.js';

export const AFTERSHOCKS: EpisodeMeta = {
  id: 'aftershocks', number: 9, compositionId: 'WhyAftershocks', title: 'Why Do Aftershocks Keep Happening?', baseSeconds: 38, tailSeconds: 2.4,
  script: plan( [
    { id: 'hook', text: 'The earthquake is over. So why does the ground keep shaking?', gap: 0.4 },
    { id: 'why', text: 'Aftershocks are minor readjustments along the part of the fault that slipped.' },
    { id: 'same', text: 'They’re smaller earthquakes in the same area, following a larger one: the mainshock.' },
    { id: 'fade', text: 'Over time, they become less frequent.' },
    { id: 'long', text: 'But after a big earthquake, they can continue for months, or even years.' },
    { id: 'danger', text: 'And they can still be dangerous, adding to the damage, especially in buildings already weakened.' },
    { id: 'notall', text: 'Not every later earthquake is an aftershock. It has to follow a larger one, close to the same fault.' },
    { id: 'end', text: 'If the ground shakes again: drop, cover, and hold on.' },
    CTA_LINE
  ], 0.4 )
};

const AMBER = '#e0a43c';
const CYAN = '#7FDBFF';
const GREEN = '#3ddc97';
const PLAN = { x: 60, y: 330, w: 960, h: 760 };
const rand = mulberry32( 9 );
/** Seeded aftershock positions around the slipped patch, with the time (0 to 1) each appears. */
const SHOCKS = Array.from( { length: 26 }, ( _, i ) => ( { x: 540 + ( rand() * 2 - 1 ) * 330, y: 740 + ( rand() * 2 - 1 ) * 190, k: Math.pow( i / 26, 1.4 ), r: 10 + rand() * 12 } ) );

const Ping: React.FC<{ x: number; y: number; since: number; color: string; r?: number }> = ( { x, y, since, color, r = 14 } ) => {
  if ( since < 0 ) {
    return null;
  }
  const k = clamp( since / 0.8 );
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} opacity={0.95} />
      {k < 1 ? <circle cx={x} cy={y} r={r + k * 60} fill="none" stroke={color} strokeWidth={5} opacity={1 - k} /> : null}
    </g>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const seis = vis( t, -1, b.why.start + 0.1, 0.35 );
  const planO = vis( t, b.why.start - 0.1, b.fade.start + 0.1, 0.35 );
  const chart = vis( t, b.fade.start - 0.1, b.danger.start + 0.1, 0.35 );
  const bld = vis( t, b.danger.start - 0.1, b.notall.start + 0.1, 0.35 );
  const planB = vis( t, b.notall.start - 0.1, b.end.start + 0.1, 0.35 );
  const endO = vis( t, b.end.start - 0.1, 999, 0.35 );
  const kShake = t > 0.3 && t < 0.9 ? Math.sin( t * 90 ) * 14 * ( 1 - ( t - 0.3 ) / 0.6 ) : 0;
  const sweep = prog( t, 0.2, Math.max( 2, b.why.start - 0.6 ) );
  const trace = Array.from( { length: 120 }, ( _, i ) => {
    const x = 60 + i * 8;
    const u = i / 119;
    const decay = i < 14 ? 0 : Math.exp( -( i - 14 ) / 22 );
    const spike = i >= 12 && i <= 15 ? 320 * Math.exp( -Math.abs( i - 13.5 ) * 0.8 ) : 0;
    const amp = ( spike + ( 95 * decay ) * ( 0.5 + 0.5 * Math.abs( Math.sin( i * 2.7 ) ) ) + 6 ) * ( i % 2 ? 1 : -1 );
    return u <= sweep ? `${x},${f1( 900 + amp )}` : null;
  } ).filter( Boolean ).join( ' ' );
  const sinceShock = ( k: number ) => t - ( b.why.start + 0.3 + k * Math.max( 3, b.fade.start - b.why.start - 1.2 ) );
  const bars = Array.from( { length: 18 }, ( _, i ) => 540 * Math.exp( -i / 3.2 ) + 14 );
  const wob = Math.sin( t * 40 ) * 5 * clamp( 1 - ( t - b.danger.start - 1 ) / 3 );
  return (
    <>
      <Backdrop accent="#3f1b2b" />
      <Layer>
        <rect width={1080} height={1920} fill={HOT} opacity={t < 0.5 ? 0.3 * ( 1 - t / 0.5 ) : 0} />
        <g opacity={seis} transform={`translate(${f1( kShake )} 0)`}>
          <Txt x={540} y={470} size={64} display weight={800} spacing={8} color={COLORS.text}>THE SHAKING STOPS…</Txt>
          <polyline points={trace} fill="none" stroke={HOT} strokeWidth={6} strokeLinejoin="round" />
          <Pill x={300} y={560} text="MAINSHOCK" color={HOT} size={34} opacity={prog( t, 0.6, 0.3 )} />
          <Txt x={680} y={1200} size={80} display weight={800} color={AMBER} opacity={prog( t, b.hook.start + 2, 0.4 )}>…BUT IT KEEPS GOING</Txt>
          <Txt x={540} y={1300} size={28} weight={600} color={COLORS.textSupport}>Schematic seismogram</Txt>
        </g>
        <g opacity={planO}>
          <rect x={PLAN.x} y={PLAN.y} width={PLAN.w} height={PLAN.h} rx={18} fill="#0a1d31" stroke={COLORS.rule} strokeWidth={3} />
          <line x1={120} y1={900} x2={960} y2={500} stroke="#8fa3c7" strokeWidth={6} strokeDasharray="14 10" opacity={0.6} />
          <Txt x={200} y={960} size={28} anchor="start" color={COLORS.textSupport}>FAULT</Txt>
          <line x1={310} y1={850} x2={770} y2={630} stroke={AMBER} strokeWidth={22} strokeLinecap="round" opacity={prog( t, b.why.start, 0.5 )} />
          <Pill x={540} y={1015} text="PART OF THE FAULT THAT SLIPPED" color={AMBER} size={28} opacity={prog( t, b.why.start + 0.2, 0.4 )} />
          <circle cx={540} cy={740} r={24} fill={HOT} opacity={prog( t, b.why.start + 0.1, 0.2 )} />
          {SHOCKS.map( ( s, i ) => <Ping key={i} x={s.x} y={s.y} since={sinceShock( s.k )} color={CYAN} r={s.r * 0.7} /> )}
          <Pop t={t} t0={b.same.start + 0.2} cx={540} cy={1160}><Txt x={540} y={1190} size={70} display weight={800} color={CYAN}>AFTERSHOCKS</Txt></Pop>
          <Txt x={540} y={1250} size={34} weight={700} color={COLORS.textSupport} opacity={prog( t, b.same.start + 0.6, 0.4 )}>smaller · same area · after a larger mainshock</Txt>
          <Txt x={540} y={1330} size={26} weight={600} color={COLORS.textSupport}>Schematic plan view · not real data</Txt>
        </g>
        <g opacity={chart}>
          <Txt x={540} y={470} size={56} display weight={800} spacing={6} color={COLORS.text}>AFTERSHOCKS PER DAY</Txt>
          <line x1={100} y1={1100} x2={1000} y2={1100} stroke="#8fa3c7" strokeWidth={5} />
          <line x1={100} y1={560} x2={100} y2={1100} stroke="#8fa3c7" strokeWidth={5} />
          {bars.map( ( h, i ) => {
            const k = prog( t, b.fade.start + 0.1 + i * 0.07, 0.35 );
            const late = i >= 11;
            return <rect key={i} x={120 + i * 48} y={1100 - h * k} width={34} height={h * k} rx={5} fill={late ? HOT : AMBER} opacity={late ? 0.55 + 0.45 * ( 0.5 + 0.5 * Math.sin( t * 6 + i ) ) * prog( t, b.long.start, 0.3 ) + 0.1 : 0.95} />;
          } )}
          <Txt x={560} y={1160} size={30} weight={700} color={COLORS.textSupport}>TIME AFTER THE MAINSHOCK →</Txt>
          <Pop t={t} t0={b.fade.start + 0.8} cx={640} cy={720}><Txt x={640} y={730} size={80} display weight={800} color={AMBER}>FEWER OVER TIME</Txt></Pop>
          <g opacity={prog( t, b.long.start + 0.3, 0.4 )}>
            <Txt x={780} y={1000} size={44} display weight={800} color={HOT}>STILL HAPPENING</Txt>
            <Txt x={780} y={1050} size={32} weight={700} color={COLORS.textSupport}>months… even years</Txt>
          </g>
          <Txt x={540} y={1260} size={26} weight={600} color={COLORS.textSupport}>Schematic · shape of a typical sequence, not real data</Txt>
        </g>
        <g opacity={bld} transform={`translate(${f1( wob )} 0)`}>
          <rect x={300} y={560} width={480} height={640} rx={8} fill="#1a2740" stroke="#9db2d6" strokeWidth={6} />
          {Array.from( { length: 12 }, ( _, i ) => <rect key={i} x={340 + ( i % 3 ) * 140} y={600 + Math.floor( i / 3 ) * 130} width={80} height={80} rx={6} fill="#0a111d" stroke="#9db2d6" strokeWidth={3} /> )}
          <path d="M420,560 L450,700 L400,780 L470,900 L430,1200" stroke={HOT} strokeWidth={9} fill="none" strokeLinejoin="round" opacity={prog( t, b.danger.start + 0.3, 0.4 )} />
          <path d="M650,620 L610,740 L670,860 L620,980" stroke={HOT} strokeWidth={7} fill="none" strokeLinejoin="round" opacity={prog( t, b.danger.start + 0.8, 0.4 )} />
          <Txt x={540} y={1290} size={64} display weight={800} color={HOT}>CAN ADD TO THE DAMAGE</Txt>
          <Txt x={540} y={1350} size={36} weight={700} color={COLORS.text} opacity={prog( t, b.danger.start + 1.2, 0.4 )}>especially buildings already weakened</Txt>
          <Txt x={540} y={1410} size={26} weight={600} color={COLORS.textSupport}>Illustration</Txt>
        </g>
        <g opacity={planB}>
          <rect x={PLAN.x} y={PLAN.y} width={PLAN.w} height={PLAN.h} rx={18} fill="#0a1d31" stroke={COLORS.rule} strokeWidth={3} />
          <line x1={120} y1={900} x2={960} y2={500} stroke="#8fa3c7" strokeWidth={6} strokeDasharray="14 10" opacity={0.6} />
          <circle cx={540} cy={700} r={250} fill="none" stroke={GREEN} strokeWidth={5} strokeDasharray="12 12" opacity={prog( t, b.notall.start + 0.5, 0.4 )} />
          <circle cx={540} cy={700} r={24} fill={HOT} />
          <Txt x={540} y={760} size={26} weight={700} color={HOT}>LARGER QUAKE</Txt>
          {[ [ 440, 640 ], [ 640, 760 ], [ 480, 800 ], [ 620, 620 ] ].map( ( [ x, y ], i ) => <circle key={i} cx={x} cy={y} r={12} fill={CYAN} opacity={prog( t, b.notall.start + 0.6 + i * 0.12, 0.2 )} /> )}
          <g opacity={prog( t, b.notall.start + 2.4, 0.4 )}>
            <circle cx={880} cy={400} r={14} fill="#ff9d7a" />
            <Txt x={880} y={470} size={28} weight={700} color="#ff9d7a">UNRELATED</Txt>
            <Txt x={880} y={505} size={28} weight={700} color="#ff9d7a">NOT AN AFTERSHOCK</Txt>
          </g>
          <Pill x={540} y={1015} text="AFTERSHOCK = AFTER A LARGER QUAKE · CLOSE TO THE SAME FAULT" color={GREEN} size={22} opacity={prog( t, b.notall.start + 1.4, 0.4 )} />
          <Txt x={540} y={1130} size={26} weight={600} color={COLORS.textSupport}>Schematic · not real data</Txt>
        </g>
        <g opacity={endO}>
          <rect x={72} y={620} width={936} height={560} rx={22} fill="rgba(7,11,20,0.94)" stroke={GREEN} strokeWidth={8} />
          <Txt x={540} y={730} size={54} display weight={800} spacing={8} color={GREEN}>IF IT SHAKES AGAIN</Txt>
          <Txt x={540} y={880} size={110} display weight={800} color={COLORS.text}>DROP.</Txt>
          <Txt x={540} y={1000} size={110} display weight={800} color={COLORS.text}>COVER.</Txt>
          <Txt x={540} y={1120} size={110} display weight={800} color={COLORS.text}>HOLD ON.</Txt>
        </g>
      </Layer>
      <SeriesTag number={9} opacity={vis( t, b.why.start, b.end.start, 0.5 )} />
    </>
  );
};

export const WhyAftershocks = makeEduShort( {
  id: 'aftershocks',
  meta: AFTERSHOCKS,
  Visuals,
  Cta: CompactCta,
  cues: b => [
    { sfx: 'boom', at: 0.3, dur: 3, volume: 0.55 },
    { sfx: 'rumble', at: 0.3, dur: 3, volume: s => 0.4 * Math.exp( -s / 1.8 ) },
    { sfx: 'whoosh', at: b.why.start - 0.1, dur: 1.2, volume: 0.3 },
    { sfx: 'tick', at: b.same.start + 0.2, dur: 0.3, volume: 0.5 },
    { sfx: 'whoosh', at: b.fade.start - 0.1, dur: 1.2, volume: 0.3 },
    { sfx: 'tick', at: b.long.start + 0.3, dur: 0.3, volume: 0.5 },
    { sfx: 'whoosh', at: b.danger.start - 0.1, dur: 1.2, volume: 0.3 },
    { sfx: 'rumble', at: b.danger.start + 0.3, dur: 3, volume: s => 0.45 * Math.exp( -s / 1.4 ) },
    { sfx: 'whoosh', at: b.notall.start - 0.1, dur: 1.2, volume: 0.3 },
    { sfx: 'boom', at: b.end.start, dur: 3, volume: 0.4 }
  ]
} );
