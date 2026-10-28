/**
 * Historic 04, "Northridge 1994". Southern California map with the USGS epicentre and a schematic San Andreas trace (the quake was NOT on it),
 * a depth-to-scale cross-section of the buried (blind) thrust fault, a shaking seismogram and restrained impact cards.
 * Facts: USGS ComCat ci3144585 (Mw 6.7, 1994-01-17 12:30:55 UTC = 4:30:55 AM PST, 34.213 N 118.537 W, depth 18.2 km); USGS OFR 96-263 (blind thrust
 * dipping about 40 degrees south, rupture began near 17.5 km and spread up and northwest, fault plane between about 5 and 19 km, no clear surface
 * rupture); USGS Science 266 (more than 3 m of reverse slip, Santa Susana Mountains raised by as much as 70 cm). Deaths, injuries and costs differ
 * between USGS pages (33 to nearly 100 deaths), so the cards stay generic. The San Andreas trace and the slip and uplift sizes are schematic.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, P_COLOR, Pill, S_COLOR, Txt, at, clamp, f1, lerp, mulberry32, prog, smooth, vis, within } from '../edu/kit.js';
import { makeEduShort } from '../edu/EduShort.js';
import type { EpisodeVisuals } from '../edu/EduShort.js';
import { HISTORIC } from './episodes.js';
import { Card, Epicenter, HistoricTag, HistoricTitle, RegionMap } from './kit.js';
import type { MapTheme } from './kit.js';

type B = Parameters<EpisodeVisuals>[0]['b'];

const THEME: MapTheme = { ocean: '#0b1830', land: '#33384a', coast: '#ece2e2', rule: COLORS.rule };
const BOX = { w: -121.5, e: -115.5, s: 32, n: 36.5 };
const EPI: [ number, number ] = [ -118.537, 34.213 ];
const DOWNTOWN: [ number, number ] = [ -118.243, 34.052 ];
/** Schematic San Andreas trace (Carrizo Plain to San Bernardino), drawn only to show where the quake was not. */
const SAN_ANDREAS: [ number, number ][] = [ [ -119.7, 35.05 ], [ -119.0, 34.82 ], [ -118.6, 34.68 ], [ -118.1, 34.52 ], [ -117.65, 34.38 ], [ -117.4, 34.28 ], [ -117.1, 34.1 ] ];

const SocalMap: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = vis( t, within( b, 'mag', 0.1 ), b.blind.start + 0.15, 0.4 );
  if ( o <= 0.01 ) {
    return null;
  }
  const rect = { x: 60, y: 330, w: 960, h: 640 };
  const notSa = prog( t, b.notsa.start - 0.1, 0.4 );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <RegionMap id="socal" rect={rect} box={BOX} center={[ -118.4, 34.5 ]} zoom={15} theme={THEME} grid={1}>
        {proj => {
          const [ ex, ey ] = proj( EPI[0], EPI[1] );
          const [ dx, dy ] = proj( DOWNTOWN[0], DOWNTOWN[1] );
          const sa = `M${SAN_ANDREAS.map( ( [ lo, la ] ) => proj( lo, la ).map( f1 ).join( ',' ) ).join( 'L' )}`;
          const [ sx, sy ] = proj( -118.1, 34.52 );
          return (
            <>
              <path d={sa} fill="none" stroke={S_COLOR} strokeWidth={7} strokeDasharray="22 12" strokeLinecap="round" opacity={0.9} />
              <Pill x={sx + 20} y={sy - 60} text="SAN ANDREAS FAULT" color={S_COLOR} size={24} opacity={prog( t, b.notsa.start - 0.1, 0.4 )} />
              <circle cx={dx} cy={dy} r={9} fill="#7FDBFF" stroke="#fff" strokeWidth={3} />
              <Pill x={dx + 20} y={dy + 70} text="LOS ANGELES" color="#7FDBFF" size={24} opacity={1} />
              <Epicenter x={ex} y={ey} t={t} opacity={prog( t, within( b, 'mag', 0.2 ), 0.5 )} />
              <Pill x={ex - 30} y={ey - 80} text="NORTHRIDGE EPICENTER · USGS" color={COLORS.redHot} size={24} opacity={prog( t, within( b, 'mag', 0.3 ), 0.5 )} />
              <Pill x={540} y={rect.y + 70} text="NOT ON THE SAN ANDREAS" color="#ffffff" size={28} opacity={notSa} />
            </>
          );
        }}
      </RegionMap>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Txt x={84} y={330 + 640 - 22} size={26} anchor="start" weight={600} color={COLORS.textSupport} opacity={notSa}>San Andreas trace is schematic</Txt>
      </svg>
    </div>
  );
};

// ---------- blind-thrust cross-section (depth to scale, slip and uplift exaggerated) ----------

const KM = 20;
const SURF = 150;
const DIP = ( 40 * Math.PI ) / 180;
const HYPO = { x: 300, y: SURF + 18 * KM };
const TIP = { x: HYPO.x + ( HYPO.y - ( SURF + 5 * KM ) ) / Math.tan( DIP ), y: SURF + 5 * KM };
const SLIP_PX = 46;
const LAYERS = [ 1.8, 3.6, 6.5, 9.5, 12.5, 15.5, 19.5, 22.5 ];
const sig = ( x: number ) => 1 / ( 1 + Math.exp( -x ) );

export type SectionTimes = { show: number; stress: number; slip: number; hide: number };

const BlindThrust: React.FC<{ t: number; times: SectionTimes; x?: number; y?: number; showLabels?: boolean }> = ( { t, times, x = 90, y = 380, showLabels = true } ) => {
  const o = clamp( ( t - times.show ) / 0.5 ) * clamp( ( times.hide - t ) / 0.5 );
  if ( o <= 0.01 ) {
    return null;
  }
  const W = 900, H = 620;
  const slipP = prog( t, times.slip, 1.4 );
  const s = SLIP_PX * slipP;
  const up = s * Math.sin( DIP ) * 0.8;
  const dxs = s * Math.cos( DIP ), dys = -s * Math.sin( DIP );
  const stress = clamp( ( t - times.stress ) / Math.max( 0.5, times.slip - times.stress ) );
  const stressColor = `rgb(${Math.round( lerp( 242, 255, stress ) )}, ${Math.round( lerp( 169, 59, stress ) )}, ${Math.round( lerp( 0, 48, stress ) )})`;
  const bump = ( px: number ) => sig( ( px - ( TIP.x - 110 ) ) / 70 );
  const ridge = ( px: number ) => 52 * sig( ( px - 600 ) / 70 );
  const surfY = ( px: number ) => SURF - ridge( px ) - up * bump( px );
  const xs = Array.from( { length: 31 }, ( _, i ) => i * 30 );
  const surfPath = `M${xs.map( px => `${px},${f1( surfY( px ) )}` ).join( 'L' )}`;
  const jolt = slipP > 0 && slipP < 1 ? Math.sin( t * 60 ) * 3 * ( 1 - slipP ) : 0;
  const rupture = clamp( ( t - times.slip ) / 1.5 );
  const front = { x: lerp( HYPO.x, TIP.x, rupture ), y: lerp( HYPO.y, TIP.y, rupture ) };
  const layerPath = ( d: number ) => {
    const ly = SURF + d * KM;
    if ( ly < TIP.y ) {
      return `M${xs.map( px => `${px},${f1( ly - ridge( px ) * 0.6 - up * bump( px ) )}` ).join( 'L' )}`;
    }
    if ( ly > HYPO.y ) {
      return `M0,${ly}L${W},${ly}`;
    }
    const xc = HYPO.x + ( HYPO.y - ly ) / Math.tan( DIP );
    return `M0,${f1( ly )}L${f1( xc )},${f1( ly )}L${f1( xc + dxs )},${f1( ly + dys )}L${f1( W + dxs )},${f1( ly + dys )}`;
  };
  const houses = [ 70, 120, 175, 235, 290, 350 ];
  return (
    <g opacity={o} transform={`translate(${x} ${y})`}>
      <clipPath id="nbsec"><rect x={0} y={0} width={W} height={H} rx={16} /></clipPath>
      <rect x={0} y={0} width={W} height={H} rx={16} fill="#0a1426" stroke={COLORS.rule} strokeWidth={3} />
      <g clipPath="url(#nbsec)">
        <path d={`${surfPath}L${W},${H}L0,${H}Z`} fill="#2b2419" />
        {LAYERS.map( ( d, i ) => <path key={d} d={layerPath( d )} fill="none" stroke={i % 2 ? '#6a5a43' : '#8a7456'} strokeWidth={6} opacity={0.85} /> )}
        <path d={surfPath} fill="none" stroke="#cdbfa0" strokeWidth={5} />
        {houses.map( hx => (
          <g key={hx} transform={`translate(${f1( jolt * ( hx % 3 ? 1 : -1 ) )} 0)`}>
            <rect x={hx} y={SURF - 19} width={28} height={19} fill="#d9c49a" />
            <polygon points={`${hx - 3},${SURF - 19} ${hx + 14},${SURF - 32} ${hx + 31},${SURF - 19}`} fill="#8a3b2f" />
          </g>
        ) )}
        {/* the fault: dashed while locked, glowing as the rupture runs up the plane; its upper edge stays buried */}
        <line x1={HYPO.x} y1={HYPO.y} x2={TIP.x} y2={TIP.y} stroke={stressColor} strokeWidth={7} strokeLinecap="round" opacity={0.95 * prog( t, times.stress - 0.6, 0.6 )} strokeDasharray={rupture > 0 ? undefined : '18 10'} />
        {rupture > 0 ? <line x1={HYPO.x} y1={HYPO.y} x2={front.x} y2={front.y} stroke="#ffffff" strokeWidth={12} strokeLinecap="round" opacity={rupture < 1 ? 0.9 : 0.45} /> : null}
        <line x1={TIP.x} y1={TIP.y} x2={TIP.x} y2={SURF - 55} stroke="#ffffff" strokeWidth={3} strokeDasharray="6 8" opacity={0.7 * prog( t, times.stress, 0.6 )} />
        <circle cx={TIP.x} cy={TIP.y} r={9} fill="#0a1426" stroke="#fff" strokeWidth={4} opacity={prog( t, times.stress, 0.6 )} />
        <Epicenter x={HYPO.x} y={HYPO.y} t={t} opacity={prog( t, times.stress - 0.6, 0.5 )} r={11} />
        {rupture > 0 && rupture < 1 ? <circle cx={HYPO.x} cy={HYPO.y} r={20 + rupture * 150} fill="none" stroke="#fff" strokeWidth={6 * ( 1 - rupture )} opacity={1 - rupture} /> : null}
        {[ 0, 5, 10, 15, 20 ].map( d => (
          <g key={d}>
            <line x1={0} y1={SURF + d * KM} x2={14} y2={SURF + d * KM} stroke="#9fb0cc" strokeWidth={3} />
            <Txt x={22} y={SURF + d * KM + 8} size={22} anchor="start" weight={600} color="#9fb0cc">{d === 20 ? '20 km' : String( d )}</Txt>
          </g>
        ) )}
      </g>
      <Txt x={90} y={34} size={22} weight={700} spacing={2} color={COLORS.textSupport}>SOUTH</Txt>
      <Txt x={W - 80} y={34} size={22} weight={700} spacing={2} color={COLORS.textSupport}>NORTH</Txt>
      <Txt x={250} y={80} size={26} weight={600} color={P_COLOR} opacity={0.9}>San Fernando Valley</Txt>
      <Txt x={W - 190} y={62} size={26} weight={600} color="#cdbfa0" opacity={0.9}>Santa Susana Mtns</Txt>
      {showLabels ? (
        <>
          <Pill x={HYPO.x + 190} y={HYPO.y + 8} text="HYPOCENTER · ~18 KM" color={COLORS.redHot} size={24} opacity={prog( t, times.stress - 0.3, 0.5 )} />
          <Pill x={TIP.x + 20} y={TIP.y + 60} text="FAULT TOP · ~5 KM DOWN" color="#ffffff" size={24} opacity={prog( t, times.stress, 0.5 )} />
          <Pill x={TIP.x - 175} y={SURF + 40} text="NO SURFACE BREAK" color="#ffffff" size={24} opacity={prog( t, times.stress + 0.4, 0.5 )} />
          <Pill x={HYPO.x + 95} y={HYPO.y - 100} text="BLIND THRUST FAULT" color={stressColor} size={26} opacity={prog( t, times.stress - 0.3, 0.5 )} />
        </>
      ) : null}
      <Txt x={W / 2} y={H - 18} size={24} weight={600} color={COLORS.textSupport}>Schematic · depth to scale · slip and uplift exaggerated</Txt>
    </g>
  );
};

// ---------- shaking seismogram ----------

const Seismogram: React.FC<{ t: number; t0: number; t1: number }> = ( { t, t0, t1 } ) => {
  const o = vis( t, t0 - 0.1, t1 + 1.2, 0.3 );
  if ( o <= 0.01 ) {
    return null;
  }
  const p = clamp( ( t - t0 ) / Math.max( 0.5, t1 - t0 ) );
  const rnd = mulberry32( 94 );
  const N = 160;
  const pts: string[] = [];
  for ( let i = 0; i <= N * p; i++ ) {
    const u = i / N;
    const amp = 10 + 115 * smooth( u / 0.18 ) * ( 1 - 0.55 * smooth( ( u - 0.7 ) / 0.3 ) );
    pts.push( `${f1( 60 + u * 960 )},${f1( 700 + ( rnd() * 2 - 1 ) * amp )}` );
  }
  const jx = Math.sin( t * 70 ) * 4 * vis( t, t0, t1, 0.15 );
  return (
    <g opacity={o} transform={`translate(${f1( jx )} 0)`}>
      <rect x={60} y={500} width={960} height={400} rx={16} fill="rgba(7,11,20,0.9)" stroke={COLORS.redHot} strokeWidth={4} />
      <line x1={80} x2={1000} y1={700} y2={700} stroke="#8fa3c7" strokeOpacity={0.3} strokeWidth={2} />
      <polyline points={pts.join( ' ' )} fill="none" stroke="#ffffff" strokeWidth={3.5} strokeLinejoin="round" />
      <Txt x={540} y={550} size={30} weight={700} spacing={3} color={COLORS.textSupport}>GROUND MOTION · SCHEMATIC</Txt>
    </g>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const secTimes: SectionTimes = { show: b.blind.start - 0.25, stress: b.blind.start + 0.2, slip: b.rupture.start + 0.25, hide: b.rupture.start + 2.1 };
  const closing: SectionTimes = { show: b.lesson.start - 0.2, stress: -100, slip: -100, hide: b.cta.start - 0.6 };
  const shake = vis( t, b.shake.start - 0.1, b.damage.start - 0.6, 0.3 );
  const lesson = vis( t, b.lesson.start - 0.1, b.cta.start - 0.8, 0.4 );
  return (
    <>
      <Backdrop accent="#3a1020" grid={false} />
      <SocalMap t={t} b={b} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <BlindThrust t={t} times={secTimes} />
        <BlindThrust t={t} times={closing} showLabels={false} />
        <Seismogram t={t} t0={b.shake.start} t1={b.shake.end} />
        <Card x={60} y={1020} w={960} label="STRONG SHAKING · USGS" value="10–20 SECONDS" valueSize={96} note="Duration varied by location" opacity={shake} />
        <Card x={60} y={1020} w={960} label="THE LESSON" value="HIDDEN FAULTS" valueSize={90} note="Strengthen buildings before the shaking" opacity={lesson} color="#ffffff" />
      </svg>
      <HistoricTitle lines={[ 'NORTHRIDGE 1994', 'EARTHQUAKE' ]} size={92} opacity={vis( t, 0.15, b.date.start + 0.2, 0.5 )} />
      <HistoricTag number={4} opacity={vis( t, b.date.start + 0.4, b.cta.start - 1, 0.6 )} />
    </>
  );
};

export const HistoricNorthridge1994 = makeEduShort( {
  id: 'northridge1994',
  meta: HISTORIC.northridge1994,
  Visuals,
  cues: b => [
    { sfx: 'riser', at: b.hook.start + 0.2, dur: 2.2, volume: 0.22 },
    { sfx: 'boom', at: b.hook.start + 1.2, dur: 3, volume: 0.5 },
    { sfx: 'tick', at: at( b, 'date', 2.0 ), dur: 0.3, volume: 0.4 },
    { sfx: 'tick', at: at( b, 'mag', 0.1 ), dur: 0.3, volume: 0.4 },
    { sfx: 'whoosh', at: at( b, 'blind', -0.3 ), dur: 1.4, volume: 0.3 },
    { sfx: 'rumble', at: at( b, 'blind', 0.3 ), dur: 5, volume: s => 0.18 * Math.min( 1, s ) * ( 1 - smooth( ( s - 3.8 ) / 1.2 ) ) },
    { sfx: 'boom', at: b.rupture.start + 0.5, dur: 3, volume: 0.6 },
    { sfx: 'rumble', at: b.rupture.start + 0.5, dur: 6, volume: s => 0.45 * Math.exp( -s / 2 ) },
    { sfx: 'rumble', at: b.shake.start, dur: 4, volume: s => 0.4 * Math.min( 1, s / 0.3 ) * ( 1 - smooth( ( s - 2.4 ) / 1.4 ) ) },
    { sfx: 'tick', at: at( b, 'toll', 0.4 ), dur: 0.3, volume: 0.4 },
    { sfx: 'tick', at: at( b, 'old', 0.4 ), dur: 0.3, volume: 0.4 },
    { sfx: 'tick', at: at( b, 'change', 0.4 ), dur: 0.3, volume: 0.4 },
    { sfx: 'whoosh', at: at( b, 'lesson', -0.3 ), dur: 1.4, volume: 0.3 }
  ]
} );
