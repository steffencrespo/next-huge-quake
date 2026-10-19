/**
 * Historic 01, "The Strongest Earthquake Ever Recorded: Chile, 1960". Chile close-up (Natural Earth 1:50m, Mercator) with the
 * USGS epicentre and an approximate rupture band, a schematic subduction section, then the Pacific (Equal Earth) with
 * illustrative routes to Hilo and Japan. Facts: USGS ComCat (M9.5, 1960-05-22 19:11 UTC, -38.143, -73.407); USGS HVO (about 15 h
 * to Hawaii, about 22 h to Japan; 61 lives lost in Hilo). The routes are NOT a tsunami simulation.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, P_COLOR, Pill, Txt, at, clamp, f1, lerp, prog, smooth, span, vis, within } from '../edu/kit.js';
import { makeEduShort } from '../edu/EduShort.js';
import type { EpisodeVisuals } from '../edu/EduShort.js';
import { BELT_PATH, LAND_PATH, project } from '../edu/ringmap.js';
import { HISTORIC } from './episodes.js';
import { Card, Epicenter, HistoricTag, HistoricTitle, RegionMap, SubductionSection } from './kit.js';

type B = Parameters<EpisodeVisuals>[0]['b'];

const TOP = 330;
const EPI: [ number, number ] = [ -73.407, -38.143 ];
const BOX = { w: -100, e: -50, s: -62, n: -10 };
const RUPTURE: [ number, number ][] = [ [ -74.3, -37.3 ], [ -74.0, -39.5 ], [ -74.6, -42 ], [ -75.4, -44.5 ], [ -76.0, -46.5 ] ];
const LAND = '#2a3442';
const OCEAN = '#0A1D31';

const mapH = ( t: number, b: B ) => lerp( 960, 560, prog( t, b.plates.start - 0.3, 0.8 ) - prog( t, b.tsunami.start - 0.3, 0.8 ) );

const ChileMap: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = 1 - prog( t, b.tsunami.start - 0.3, 0.6 );
  if ( o <= 0.01 ) {
    return null;
  }
  const h = mapH( t, b );
  const rect = { x: 60, y: TOP, w: 960, h };
  const dim = lerp( 0.35, 1, prog( t, b.date.start - 0.3, 0.8 ) );
  const grow = prog( t, b.rupture.start, Math.max(1.2, b.rupture.end - b.rupture.start - 0.5) );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o * dim }}>
      <RegionMap id="chile" rect={rect} box={BOX} center={[ -74.2, -41.5 ]} zoom={2.1}>
        {proj => {
          const pts = RUPTURE.map( ( [ lo, la ] ) => proj( lo, la ) );
          const d = `M${pts.map( p => p.map( f1 ).join( ',' ) ).join( 'L' )}`;
          const [ ex, ey ] = proj( EPI[0], EPI[1] );
          const [ vx, vy ] = proj( -73.25, -39.81 );
          const [ sx, sy ] = proj( -69.5, -35 );
          const [ ox, oy ] = proj( -80.5, -41 );
          return (
            <>
              <path d={d} fill="none" stroke={COLORS.redHot} strokeOpacity={0.25} strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - grow} />
              <path d={d} fill="none" stroke="#ff7a59" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - grow} />
              <circle cx={vx} cy={vy} r={7} fill="#fff" opacity={prog( t, b.date.start, 0.5 )} />
              <Epicenter x={ex} y={ey} t={t} opacity={prog( t, b.hook.start + 0.4, 0.5 )} />
              <Pill x={ex - 210} y={ey - 6} text="EPICENTER · USGS" color={COLORS.redHot} size={26} opacity={prog( t, b.date.start, 0.5 )} />
              <Pill x={ex - 250} y={ey + 330} text="RUPTURE ZONE · APPROX." color="#ff7a59" size={26} opacity={prog( t, b.rupture.start + 0.3, 0.5 )} />
              <Txt x={ox} y={oy} size={34} weight={600} color={P_COLOR} spacing={4} opacity={0.8}>PACIFIC OCEAN</Txt>
              <Txt x={sx} y={sy} size={34} weight={600} color={COLORS.textSupport} spacing={4} opacity={0.8}>SOUTH AMERICA</Txt>
            </>
          );
        }}
      </RegionMap>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Txt x={84} y={TOP + h - 20} size={26} anchor="start" weight={600} color={COLORS.textSupport} opacity={prog( t, b.rupture.start + 0.3, 0.5 )}>Rupture length estimates vary · band is illustrative</Txt>
      </svg>
    </div>
  );
};

// ---------- Pacific ----------

const PZ = 1.08;
const PC = project( -145, -14 );
const pscreen = ( lon: number, lat: number ): [ number, number ] => {
  const [ x, y ] = project( lon, lat );
  return [ 540 + ( x - PC[0] ) * PZ, TOP + 480 + ( y - PC[1] ) * PZ ];
};
const arc = ( a: [ number, number ], c: [ number, number ], lift: number ) => {
  const mx = ( a[0] + c[0] ) / 2, my = ( a[1] + c[1] ) / 2 - lift;
  return { d: `M${f1( a[0] )},${f1( a[1] )} Q${f1( mx )},${f1( my )} ${f1( c[0] )},${f1( c[1] )}`, at: ( p: number ): [ number, number ] => [ ( 1 - p ) ** 2 * a[0] + 2 * ( 1 - p ) * p * mx + p * p * c[0], ( 1 - p ) ** 2 * a[1] + 2 * ( 1 - p ) * p * my + p * p * c[1] ] };
};

const PacificMap: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = prog( t, b.tsunami.start - 0.3, 0.6 );
  if ( o <= 0.01 ) {
    return null;
  }
  const rect = { x: 60, y: TOP, w: 960, h: 960 };
  const chile = pscreen( EPI[0], EPI[1] );
  const hilo = pscreen( -155.09, 19.73 );
  const japan = pscreen( 142, 38.5 );
  const toH = arc( chile, hilo, 130 );
  const toJ = arc( chile, japan, 90 );
  const pH = smooth( ( t - b.tsunami.start ) / Math.max( 1, b.hawaii.start - b.tsunami.start + 2 ) );
  const pJ = smooth( ( t - b.tsunami.start ) / Math.max( 1, b.japan.start - b.tsunami.start + 3 ) );
  const hDot = toH.at( clamp( pH ) );
  const jDot = toJ.at( clamp( pJ ) );
  const hArr = prog( t, within( b, 'hawaii', 0.35 ), 0.4 );
  const jArr = prog( t, within( b, 'japan', 0.45 ), 0.4 );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <clipPath id="pac"><rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={16} /></clipPath>
        <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={16} fill={OCEAN} stroke={COLORS.rule} strokeWidth={3} />
        <g clipPath="url(#pac)">
          <g transform={`translate(540 ${TOP + 480}) scale(${PZ}) translate(${f1( -PC[0] )} ${f1( -PC[1] )})`}>
            <path d={LAND_PATH} fill={LAND} stroke="#B4CDE6" strokeWidth={1.4 / PZ} strokeOpacity={0.55} strokeLinejoin="round" />
            <path d={BELT_PATH} fill="none" stroke={COLORS.redHot} strokeOpacity={0.0} />
          </g>
          <path d={toH.d} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="4 12" strokeLinecap="round" opacity={0.85} pathLength={1} strokeDashoffset={0} style={{ clipPath: 'none' }} />
          <path d={toJ.d} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="4 12" strokeLinecap="round" opacity={0.85} />
          {[ [ hDot, pH ], [ jDot, pJ ] ].map( ( [ dot, p ], i ) => <circle key={i} cx={( dot as [ number, number ] )[0]} cy={( dot as [ number, number ] )[1]} r={13} fill="#7FDBFF" stroke="#fff" strokeWidth={4} opacity={( p as number ) > 0.01 && ( p as number ) < 0.995 ? 1 : 0} /> )}
          <Epicenter x={chile[0]} y={chile[1]} t={t} />
          <Epicenter x={hilo[0]} y={hilo[1]} t={t} opacity={hArr} color="#7FDBFF" r={10} />
          <Epicenter x={japan[0]} y={japan[1]} t={t} opacity={jArr} color="#7FDBFF" r={10} />
        </g>
        <Pill x={chile[0] - 20} y={chile[1] + 70} text="CHILE" color={COLORS.redHot} size={28} />
        <Pill x={hilo[0] + 10} y={hilo[1] + 90} text="HAWAII · ≈15 H" color="#7FDBFF" size={28} opacity={hArr} />
        <Pill x={japan[0] - 60} y={japan[1] - 70} text="JAPAN · ≈22 H" color="#7FDBFF" size={28} opacity={jArr} />
        <Txt x={84} y={TOP + 960 - 22} size={26} anchor="start" weight={600} color={COLORS.textSupport}>Illustrative routes, approximate times · not a simulation</Txt>
      </svg>
    </div>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const date = span( t, b, 'date', 'rupture', 0.4 );
  const hilo = span( t, b, 'hawaii', 'japan', 0.4 );
  const record = span( t, b, 'record', 'ocean', 0.4 );
  return (
    <>
      <Backdrop accent="#0d2a4a" grid={false} />
      <ChileMap t={t} b={b} />
      <PacificMap t={t} b={b} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <SubductionSection t={t} times={{ show: b.plates.start - 0.2, lock: b.lock.start + 0.3, slip: within( b, 'rupture', 0.45 ), hide: b.tsunami.start - 0.1 }} labels={{ ocean: 'NAZCA PLATE', land: 'S. AMERICAN PLATE' }} />
        <Card x={60} y={1020} w={470} label="DATE" value="MAY 22, 1960" valueSize={74} opacity={date} color="#ffffff" />
        <Card x={550} y={1020} w={470} label="MAGNITUDE · USGS" value="9.5" valueSize={110} opacity={date} />
        <Card x={60} y={1020} w={960} label="HILO, HAWAII" value="61 LIVES LOST" valueSize={90} note="Source: USGS Hawaiian Volcano Observatory" opacity={hilo} color="#7FDBFF" />
        <Card x={60} y={1020} w={960} label="USGS · INSTRUMENTAL RECORD" value="LARGEST EVER" valueSize={96} note="M9.5 · Valdivia, Chile · May 22, 1960" opacity={record} />
      </svg>
      <HistoricTitle lines={[ 'STRONGEST QUAKE', 'EVER RECORDED' ]} opacity={vis( t, 0.15, b.date.start + 0.2, 0.5 )} />
      <HistoricTag number={1} opacity={vis( t, b.date.start + 0.4, b.cta.start - 1, 0.6 )} />
    </>
  );
};

export const HistoricChile1960 = makeEduShort( {
  id: 'chile1960',
  meta: HISTORIC.chile1960,
  Visuals,
  cues: b => [
    { sfx: 'riser', at: b.hook.start + 0.3, dur: 2.2, volume: 0.22 },
    { sfx: 'boom', at: b.hook.start + 1.6, dur: 3, volume: 0.5 },
    { sfx: 'tick', at: at( b, 'date', 1.9 ), dur: 0.3, volume: 0.4 },
    { sfx: 'whoosh', at: at( b, 'plates', -0.2 ), dur: 1.4, volume: 0.3 },
    { sfx: 'rumble', at: at( b, 'lock', 0 ), dur: 6, volume: s => 0.2 * Math.min( 1, s ) * ( 1 - smooth( ( s - 4.5 ) / 1.4 ) ) },
    { sfx: 'boom', at: within( b, 'rupture', 0.45 ), dur: 3, volume: 0.65 },
    { sfx: 'rumble', at: within( b, 'rupture', 0.45 ), dur: 6, volume: s => 0.45 * Math.exp( -s / 2 ) },
    { sfx: 'whoosh', at: at( b, 'tsunami', -0.2 ), dur: 1.4, volume: 0.35 },
    { sfx: 'tick', at: within( b, 'hawaii', 0.35 ), dur: 0.3, volume: 0.5 },
    { sfx: 'tick', at: within( b, 'japan', 0.45 ), dur: 0.3, volume: 0.5 },
    { sfx: 'boom', at: at( b, 'record', 0.2 ), dur: 3, volume: 0.35 }
  ]
} );
