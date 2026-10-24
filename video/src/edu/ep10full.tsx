/**
 * Episode 10 (full prototype), "Where Will the Next Big One Hit?": the approved V2 MapLibre visual language driven by the narration
 * beats of NEXT_BIG_ONE (ep10.tsx). Silent with placeholder captions until narration exists. Claims and sources: ep10claims.ts.
 * Bay Area 72% is the verified USGS 2014-2043 baseline; the later ~74% update is deliberately not shown. The two systems are
 * highlighted separately (amber / cyan) and the closing frames dim the traces so they never read as one shared rupture.
 */
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../design/tokens.js';
import { LiveMap } from '../map/LiveMap.js';
import type { MapCamera } from '../map/LiveMap.js';
import { NEXT_BIG_ONE } from './ep10.js';
import { AMBER, BAY, BOTH, CAS, CYAN, Chip, LINES, OFF, Rings, SF, Tag, TRACK, Trace, Vignette, ease, mix } from './ep10v2.js';
import type { Cam } from './ep10v2.js';
import { makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';
import type { Beats } from './episodes.js';
import { HOT, Txt, clamp, f1, lerp, prog, vis } from './kit.js';
import { Pop } from './octShared.js';

const FPS = 30;
const FINAL: Cam = { ...BOTH, c: [ -123.4, 41.9 ], z: 5.15 };

/** Section times derived from the narration beats. */
const timing = ( b: Beats ) => ( {
  hookEnd: b.two.start + 0.7,
  dive: [ b.two.start + 0.5, b.two.start + 2.1 ] as const,
  north: [ b.north.start - 0.3, b.north.start + 2.7 ] as const,
  back: [ b.both.start - 0.3, b.both.start + 1.9 ] as const
} );

const range = ( t: number, [ a, z ]: readonly [ number, number ] ) => ease( clamp( ( t - a ) / ( z - a ) ) );

export const cameraFull = ( frame: number, b: Beats ): MapCamera => {
  const t = frame / FPS;
  const m = timing( b );
  const bayHold: Cam = { ...BAY, z: BAY.z + 0.25, b: BAY.b + 8 };
  let cam: Cam;
  if ( t < m.dive[0] ) {
    cam = { ...BOTH, z: lerp( 5.15, BOTH.z, clamp( t / Math.max( 1, m.dive[0] ) ) ) };
  } else if ( t < m.north[0] ) {
    const drift = clamp( ( t - m.dive[1] ) / Math.max( 0.1, m.north[0] - m.dive[1] ) );
    cam = mix( BOTH, { ...BAY, z: BAY.z + 0.25 * drift, b: BAY.b + 8 * drift }, range( t, m.dive ) );
  } else if ( t < m.back[0] ) {
    const k = range( t, m.north );
    cam = mix( bayHold, CAS, k );
    cam = { ...cam, z: cam.z - 2.0 * Math.sin( Math.PI * k ), p: cam.p - 8 * Math.sin( Math.PI * k ) };
  } else {
    const drift = clamp( ( t - m.north[1] ) / Math.max( 0.1, m.back[0] - m.north[1] ) );
    cam = mix( { ...CAS, z: CAS.z + 0.2 * drift }, FINAL, range( t, m.back ) );
  }
  return { center: cam.c, zoom: cam.z, bearing: cam.b, pitch: cam.p };
};

type P = { x: number; y: number };

const overlayFull = ( b: Beats ) => ( sf: P, frame: number, tracked?: P[] ) => {
  if ( !tracked ) {
    return null;
  }
  const t = frame / FPS;
  const m = timing( b );
  const sea = tracked[0];
  const slice = ( o: number, n: number ) => tracked.slice( o, o + n );
  const ry = Math.cos( ( cameraFull( frame, b ).pitch / 180 ) * Math.PI ) * 0.95 + 0.1;
  const toNorth = range( t, m.north ), toBack = range( t, m.back );
  const bayDraw = prog( t, 0.2, 1.4 ), hayDraw = prog( t, b.bay.start + 0.8, 1.2 ), casDraw = prog( t, b.north.start + 0.5, 2.0 );
  const dim = 1 - 0.8 * prog( t, b.both.start, 0.6 );
  const bayFocus = ( 1 - 0.65 * toNorth * ( 1 - toBack ) ) * dim;
  const casFocus = ( 0.55 + 0.45 * Math.max( toNorth, toBack ) ) * dim;
  const pulse = 0.7 + 0.3 * Math.sin( t * 6 );
  const hook = vis( t, -1, m.hookEnd, 0.35 );
  const hit = t < 0.5 ? 1 - t / 0.5 : 0;
  const shake = t < 0.4 ? Math.sin( t * 110 ) * 14 * ( 1 - t / 0.4 ) : t > m.dive[0] && t < m.dive[0] + 0.4 ? Math.sin( t * 90 ) * 10 * ( 1 - ( t - m.dive[0] ) / 0.4 ) : 0;
  const tagBay = Math.max( vis( t, m.dive[1] - 0.4, m.north[0] + 0.6, 0.3 ), prog( t, m.back[0] + 1.0, 0.3 ) );
  const tagCas = Math.max( vis( t, m.north[1] - 0.2, m.back[0] + 0.3, 0.3 ), prog( t, m.back[0] + 1.0, 0.3 ) );
  const split = vis( t, b.notsame.start, b.both.start - 0.1, 0.3 );
  const question = vis( t, b.both.start - 0.1, b.answer.start, 0.3 );
  const separate = vis( t, b.answer.start, b.end.start, 0.3 );
  const cant = prog( t, b.end.start, 0.3 );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter></defs>
      <rect width={1080} height={1920} fill={HOT} opacity={0.45 * hit} />
      <g transform={`translate(${f1( shake )} 0)`}>
        <g opacity={bayFocus}>
          <Trace pts={slice( OFF.sa, LINES.sa.length )} color={AMBER} core="#ffe08a" draw={bayDraw} glow={0.6 + 0.4 * pulse} />
          <Trace pts={slice( OFF.hay, LINES.hay.length )} color={AMBER} core="#ffd04d" draw={hayDraw} width={7} glow={pulse} />
          <Trace pts={slice( OFF.cal, LINES.cal.length )} color={AMBER} core="#ffd04d" draw={hayDraw} width={6} glow={pulse} />
        </g>
        <g opacity={casFocus}>
          <Trace pts={slice( OFF.cas, LINES.cas.length )} color={CYAN} core="#eafcff" draw={casDraw} glow={0.6 + 0.4 * pulse} width={10} />
        </g>
        <Rings x={sf.x} y={sf.y} frame={frame} start={0} color={AMBER} ry={ry} max={t < m.dive[0] ? 240 : 360} />
        <Rings x={sea.x} y={sea.y} frame={frame} start={t < m.dive[0] ? 6 : Math.round( m.north[0] * FPS )} color={CYAN} ry={ry} max={t < m.dive[0] ? 240 : 360} />
        <Tag x={sf.x} y={sf.y + 130} text="BAY AREA" color={AMBER} o={tagBay} />
        <Tag x={sea.x} y={sea.y + 130} text="CASCADIA" color={CYAN} o={tagCas} />
      </g>
      <g opacity={hook}>
        <Txt x={540} y={170} size={44} display weight={800} spacing={8} color={HOT}>HYPOTHETICAL QUESTION</Txt>
        <Pop t={t} t0={0.05} cx={540} cy={380} from={1.6}>
          <Txt x={540} y={320} size={150} display weight={800} color={COLORS.text}>COULD BOTH</Txt>
          <Txt x={540} y={460} size={150} display weight={800} color={HOT}>HIT TOGETHER?</Txt>
        </Pop>
        <Txt x={540} y={545} size={44} weight={700} color={COLORS.textSupport} opacity={prog( t, 0.7, 0.3 )}>Bay Area + Cascadia · not a forecast</Txt>
      </g>
      <Chip t={t} t0={b.bayperiod.start + 0.4} t1={b.north.start - 0.1} color={AMBER} kicker="BAY AREA · WHOLE FAULT SYSTEM" big="72%" line="M6.7+ · USGS 2014–2043 outlook" />
      <Chip t={t} t0={b.casstat.start + 0.2} t1={b.notsame.start - 0.1} color={CYAN} kicker="CASCADIA SUBDUCTION ZONE" big="10–15%" line="≈M9 in 50 years" />
      <g opacity={split}>
        <rect x={60} y={1500} width={960} height={310} rx={26} fill="rgba(7,11,20,0.92)" stroke={COLORS.text} strokeWidth={6} />
        <Txt x={270} y={1610} size={84} display weight={800} color={AMBER}>2014–2043</Txt>
        <Txt x={270} y={1665} size={38} weight={700} color={COLORS.textSupport}>many faults</Txt>
        <Txt x={540} y={1640} size={130} display weight={800} color={HOT}>≠</Txt>
        <Txt x={810} y={1610} size={84} display weight={800} color={CYAN}>50 YEARS</Txt>
        <Txt x={810} y={1665} size={38} weight={700} color={COLORS.textSupport}>one megathrust</Txt>
        <Txt x={540} y={1760} size={40} weight={700} color={COLORS.text}>NOT COMPARABLE</Txt>
      </g>
      <g opacity={question}>
        <rect x={150} y={1520} width={780} height={150} rx={26} fill="rgba(7,11,20,0.92)" stroke={HOT} strokeWidth={8} />
        <Txt x={540} y={1620} size={74} display weight={800} spacing={3} color={HOT}>HYPOTHETICAL ONLY</Txt>
      </g>
      <g opacity={separate}>
        <rect x={60} y={1520} width={960} height={260} rx={26} fill="rgba(7,11,20,0.92)" stroke={HOT} strokeWidth={8} />
        <Txt x={540} y={1630} size={84} display weight={800} color={COLORS.text}>TWO SEPARATE SYSTEMS</Txt>
        <Txt x={540} y={1722} size={52} display weight={800} spacing={4} color={HOT}>NOT A FORECAST</Txt>
      </g>
      <g opacity={cant}>
        <rect x={60} y={1520} width={960} height={260} rx={26} fill="rgba(7,11,20,0.94)" stroke={HOT} strokeWidth={8} />
        <Txt x={540} y={1630} size={78} display weight={800} color={COLORS.text}>WE CAN’T PREDICT</Txt>
        <Txt x={540} y={1722} size={78} display weight={800} color={HOT}>THE NEXT BIG ONE</Txt>
      </g>
      <Txt x={540} y={1876} size={34} weight={700} color={COLORS.text} opacity={0.9 * ( 1 - cant * 0 )}>Fault traces schematic · Sources: USGS</Txt>
    </svg>
  );
};

const Visuals: EpisodeVisuals = ( { b } ) => (
  <AbsoluteFill style={{ background: COLORS.background }}>
    <LiveMap
      cameraAt={f => cameraFull( f, b )}
      epicenter={SF}
      tiles="local"
      diagnostics={{ event: 'next-big-one-full', tiles: 'local' }}
      background={COLORS.background}
      trackPoints={TRACK}
      overlay={overlayFull( b )}
    >
      <Vignette />
    </LiveMap>
  </AbsoluteFill>
);

export const WhereWillTheNextBigOneHitFull = makeEduShort( {
  id: 'nextbigone',
  meta: NEXT_BIG_ONE,
  Visuals,
  cues: b => [
    { sfx: 'boom', at: 0.05, dur: 3, volume: 0.6 },
    { sfx: 'whoosh', at: b.bay.start - 0.3, dur: 1.2, volume: 0.35 },
    { sfx: 'rumble', at: b.baystat.start, dur: 4, volume: 0.3 },
    { sfx: 'whoosh', at: b.north.start - 0.3, dur: 1.5, volume: 0.4 },
    { sfx: 'riser', at: b.cas.start, dur: Math.max( 1, b.casstat.start - b.cas.start ), volume: 0.3 },
    { sfx: 'boom', at: b.both.start, dur: 3, volume: 0.45 },
    { sfx: 'tick', at: b.end.start, dur: 0.3, volume: 0.5 }
  ]
} );
