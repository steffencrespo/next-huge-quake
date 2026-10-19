/**
 * Historic 03, "The 1906 San Francisco Earthquake". Sepia, archival-inspired palette (graphics only: no archival footage, no recreated
 * photographs). Northern California map with the approximate San Andreas rupture trace, a top-down strike-slip diagram, an illustrative
 * city-skyline fire graphic, and an elastic-rebound diagram.
 * Facts: USGS ComCat (M7.9 Mw, 1906-04-18, 37.75 N 122.55 W); USGS 1906 event pages (foreshock about 5:12 AM local, rupture of the
 * northernmost 296 miles / 477 km from NW of San Juan Bautista to Cape Mendocino; about 20 feet offset near Point Reyes, Lawson report;
 * commonly quoted toll of 700 believed to undercount by a factor of 3 or 4; Lawson 1908, Reid 1910 elastic rebound).
 * The trace, the skyline and the flames are illustrations.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, Pill, Txt, at, clamp, f1, lerp, prog, smooth, span, vis, within } from '../edu/kit.js';
import { makeEduShort } from '../edu/EduShort.js';
import type { EpisodeVisuals } from '../edu/EduShort.js';
import { HISTORIC } from './episodes.js';
import { Card, Epicenter, HistoricTag, HistoricTitle, RegionMap, SEPIA_THEME } from './kit.js';

type B = Parameters<EpisodeVisuals>[0]['b'];

const TOP = 330;
const EPI: [ number, number ] = [ -122.55, 37.75 ];
const BOX = { w: -130, e: -115, s: 32, n: 44 };
const AMBER = '#e0a43c';
const PAPER = '#f1e4c3';
/** Approximate trace of the 1906 rupture, [lon, lat], from NW of San Juan Bautista to Cape Mendocino. Schematic. */
const TRACE: [ number, number ][] = [ [ -121.54, 36.85 ], [ -121.9, 37.12 ], [ -122.3, 37.5 ], [ -122.5, 37.72 ], [ -122.65, 37.9 ], [ -122.85, 38.07 ], [ -123.0, 38.25 ], [ -123.35, 38.55 ], [ -123.7, 38.95 ], [ -123.85, 39.5 ], [ -124.07, 40.03 ], [ -124.4, 40.44 ] ];

const mapH = ( t: number, b: B ) => lerp( 960, 600, prog( t, b.strike.start - 0.3, 0.8 ) - prog( t, b.offset.end + 0.2, 0.8 ) );

const NorCalMap: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = 1 - prog( t, b.fire.start - 0.3, 0.5 );
  if ( o <= 0.01 ) {
    return null;
  }
  const h = mapH( t, b );
  const rect = { x: 60, y: TOP, w: 960, h };
  const dim = lerp( 0.35, 1, prog( t, b.time.start - 0.3, 0.8 ) );
  const grow = prog( t, b.length.start, Math.max( 1.5, b.length.end - b.length.start - 0.4 ) );
  const faultShow = prog( t, b.fault.start, 0.6 );
  const reveal = Math.max( faultShow * 0.05, grow );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o * dim }}>
      <RegionMap id="norcal" rect={rect} box={BOX} center={[ -122.7, 38.5 ]} zoom={5.0} theme={SEPIA_THEME} grid={1}>
        {proj => {
          const d = `M${TRACE.map( ( [ lo, la ] ) => proj( lo, la ).map( f1 ).join( ',' ) ).join( 'L' )}`;
          const [ ex, ey ] = proj( EPI[0], EPI[1] );
          const [ px, py ] = proj( -123.4, 39.2 );
          const [ ox, oy ] = proj( -125.6, 37.2 );
          const [ jx, jy ] = proj( -121.54, 36.85 );
          return (
            <>
              <path d={d} fill="none" stroke={AMBER} strokeOpacity={0.3} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - reveal} />
              <path d={d} fill="none" stroke="#ffcf6b" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - reveal} />
              <circle cx={jx} cy={jy} r={7} fill="#ffcf6b" opacity={prog( t, b.length.start, 0.4 )} />
              <Epicenter x={ex} y={ey} t={t} opacity={prog( t, b.hook.start + 0.4, 0.5 )} r={10} />
              <Pill x={ex + 250} y={ey + 20} text="EPICENTER · USGS" color={COLORS.redHot} size={24} opacity={prog( t, b.mag.start, 0.5 )} />
              <Pill x={px + 120} y={py} text="SAN ANDREAS FAULT" color={AMBER} size={26} opacity={prog( t, b.fault.start, 0.6 )} />
              <Pill x={ex - 190} y={ey - 60} text="SAN FRANCISCO" color="#fff" size={24} opacity={prog( t, b.hook.start + 1, 0.5 )} />
              <Pill x={jx + 150} y={jy + 50} text="SAN JUAN BAUTISTA" color={AMBER} size={22} opacity={prog( t, b.length.start + 0.2, 0.5 )} />
              <Txt x={ox} y={oy} size={34} weight={600} spacing={4} color={PAPER} opacity={0.7}>PACIFIC OCEAN</Txt>
            </>
          );
        }}
      </RegionMap>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Txt x={84} y={TOP + h - 20} size={26} anchor="start" weight={600} color={COLORS.textSupport} opacity={prog( t, b.fault.start, 0.6 )}>Fault trace is approximate and schematic</Txt>
        <Pill x={800} y={TOP + 60} text="≈ 296 MILES · 477 KM" color={AMBER} size={28} opacity={prog( t, b.length.start + 1.5, 0.5 )} />
      </svg>
    </div>
  );
};

// ---------- top-down strike-slip ----------

const StrikeSlip: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = vis( t, b.strike.start - 0.2, b.offset.end + 0.3, 0.45 );
  if ( o <= 0.01 ) {
    return null;
  }
  const slipT = within( b, 'offset', 0.1 );
  const slipP = prog( t, slipT, 1.6 );
  const dx = slipP * 70;
  const arrows = prog( t, b.strike.start + 0.8, 0.5 );
  const jolt = t > slipT && t < slipT + 1.2 ? Math.sin( t * 50 ) * 4 : 0;
  return (
    <g opacity={o} transform="translate(90 970)">
      <clipPath id="ss"><rect x={0} y={0} width={900} height={320} rx={16} /></clipPath>
      <rect x={0} y={0} width={900} height={320} rx={16} fill="#2a2218" stroke={SEPIA_THEME.rule} strokeWidth={3} />
      <g clipPath="url(#ss)">
        <rect x={-60} y={20} width={1020} height={140} fill="#4a3d2a" transform={`translate(${f1( -dx / 2 + jolt )} 0)`} />
        <rect x={-60} y={160} width={1020} height={140} fill="#3d3223" transform={`translate(${f1( dx / 2 - jolt )} 0)`} />
        <line x1={0} x2={900} y1={160} y2={160} stroke={AMBER} strokeWidth={6} strokeDasharray="18 10" />
        <rect x={430} y={20} width={44} height={140} fill="#8f8266" transform={`translate(${f1( -dx / 2 + jolt )} 0)`} />
        <rect x={430} y={160} width={44} height={140} fill="#8f8266" transform={`translate(${f1( dx / 2 - jolt )} 0)`} />
        <g opacity={arrows}>
          <path d="M110,90 h150 l-26,-24 m26,24 l-26,24" stroke={PAPER} strokeWidth={8} fill="none" strokeLinecap="round" transform={`translate(${f1( -dx / 2 )} 0)`} />
          <path d="M790,230 h-150 l26,-24 m-26,24 l26,24" stroke={PAPER} strokeWidth={8} fill="none" strokeLinecap="round" transform={`translate(${f1( dx / 2 )} 0)`} />
        </g>
      </g>
      <Pill x={170} y={52} text="PACIFIC PLATE" color={AMBER} size={24} opacity={arrows} />
      <Pill x={730} y={270} text="N. AMERICAN PLATE" color={AMBER} size={24} opacity={arrows} />
      <Pill x={450} y={160} text={slipP > 0.9 ? 'ROAD OFFSET' : 'FAULT'} color="#fff" size={24} opacity={prog( t, b.strike.start + 1.2, 0.4 )} />
      <Txt x={450} y={312} size={24} weight={600} color={COLORS.textSupport}>Top-down schematic · strike-slip: sideways motion</Txt>
    </g>
  );
};

// ---------- skyline and fire (illustration) ----------

const BUILDINGS: [ number, number, number ][] = [ [ 30, 120, 110 ], [ 150, 190, 90 ], [ 250, 140, 120 ], [ 380, 230, 100 ], [ 490, 160, 90 ], [ 590, 260, 110 ], [ 710, 150, 100 ], [ 820, 200, 60 ] ];

const Fire: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = vis( t, b.fire.start - 0.2, b.toll.end + 0.3, 0.45 );
  if ( o <= 0.01 ) {
    return null;
  }
  const burn = prog( t, b.fire.start + 0.5, Math.max( 3, b.fire.end - b.fire.start ) );
  const dusk = prog( t, b.fire.start, 1.5 );
  return (
    <g opacity={o} transform="translate(90 400)">
      <clipPath id="fire"><rect x={0} y={0} width={900} height={580} rx={16} /></clipPath>
      <rect x={0} y={0} width={900} height={580} rx={16} fill="#1b140d" stroke={SEPIA_THEME.rule} strokeWidth={3} />
      <g clipPath="url(#fire)">
        <rect x={0} y={0} width={900} height={580} fill={`rgb(${Math.round( lerp( 27, 80, burn * 0.7 ) )},${Math.round( lerp( 20, 30, burn ) )},${Math.round( lerp( 13, 10, burn ) )})`} opacity={dusk} />
        {BUILDINGS.map( ( [ x, h, w ], i ) => {
          const top = 500 - h;
          const k = clamp( burn * 1.4 - i * 0.07 );
          return (
            <g key={i}>
              <rect x={x} y={top} width={w} height={h} fill="#0b0805" />
              {Array.from( { length: Math.floor( h / 40 ) }, ( _, r ) => <rect key={r} x={x + 16} y={top + 14 + r * 40} width={14} height={18} fill={k > 0.2 ? '#ff9a3c' : '#6a5a3a'} opacity={0.5 + 0.4 * k} /> )}
              {k > 0.05 ? [ 0, 1, 2 ].map( j => {
                const fl = 0.7 + 0.3 * Math.sin( t * 11 + i * 2 + j * 1.7 );
                const fx = x + w * ( 0.2 + j * 0.3 );
                const fh = ( 40 + 70 * k ) * fl;
                return <path key={j} d={`M${f1( fx - 20 )},${top + 6} Q${f1( fx - 8 )},${f1( top - fh * 0.6 )} ${f1( fx )},${f1( top - fh )} Q${f1( fx + 6 )},${f1( top - fh * 0.5 )} ${f1( fx + 22 )},${top + 6} Z`} fill={j === 1 ? '#ffd27a' : '#ff6a2c'} opacity={0.85 * k} />;
              } ) : null}
            </g>
          );
        } )}
        <rect x={0} y={500} width={900} height={80} fill="#0b0805" />
        {Array.from( { length: 14 }, ( _, i ) => {
          const p = ( t * 0.25 + i / 14 ) % 1;
          return <circle key={i} cx={( i * 67 + 40 ) % 900 + 20 * Math.sin( p * 6 )} cy={400 - p * 400} r={16 + p * 30} fill="#3a3028" opacity={0.35 * burn * ( 1 - p )} />;
        } )}
      </g>
      <Txt x={450} y={545} size={26} weight={600} color={COLORS.textSupport}>Illustration · not archival footage</Txt>
    </g>
  );
};

// ---------- elastic rebound ----------

const Rebound: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = vis( t, b.reid.start - 0.2, b.rebound.end + 0.5, 0.45 );
  if ( o <= 0.01 ) {
    return null;
  }
  const load = clamp( ( t - b.rebound.start - 0.4 ) / Math.max( 1.5, ( b.rebound.end - b.rebound.start ) * 0.45 ) );
  const snapAt = within( b, 'rebound', 0.62 );
  const snap = smooth( ( t - snapAt ) / 0.25 );
  const bend = 110 * load * ( 1 - snap );
  const off = 50 * snap;
  const left: [ number, number ][] = [ [ 40, 160 ], [ 290, 160 + bend * 0.3 ], [ 410, 160 + bend * 0.85 ], [ 450, 160 + bend ] ];
  const right: [ number, number ][] = [ [ 450, 160 + bend ], [ 490, 160 + bend * 0.85 ], [ 610, 160 + bend * 0.3 ], [ 860, 160 ] ];
  const path = ( p: [ number, number ][] ) => `M${p.map( ( [ x, y ] ) => `${f1( x )},${f1( y )}` ).join( 'L' )}`;
  return (
    <g opacity={o} transform="translate(90 700)">
      <rect x={0} y={0} width={900} height={330} rx={16} fill="#2a2218" stroke={SEPIA_THEME.rule} strokeWidth={3} />
      <line x1={450} x2={450} y1={20} y2={310} stroke={AMBER} strokeWidth={5} strokeDasharray="16 10" />
      <path d="M40,160 H860" fill="none" stroke={PAPER} strokeWidth={3} strokeDasharray="4 12" opacity={0.5 * ( 1 - snap )} />
      <path d={path( left )} fill="none" stroke={PAPER} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${f1( -off * 0.6 )} 0)`} />
      <path d={path( right )} fill="none" stroke={PAPER} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${f1( off * 0.6 )} 0)`} />
      <Pill x={225} y={60} text="BENDING" color={AMBER} size={26} opacity={load * ( 1 - snap )} />
      <Pill x={225} y={60} text="SNAPS BACK" color={COLORS.redHot} size={26} opacity={snap} />
      <Pill x={675} y={270} text="ENERGY STORED" color={AMBER} size={26} opacity={load * ( 1 - snap )} />
      <Pill x={675} y={270} text="ENERGY RELEASED" color={COLORS.redHot} size={26} opacity={snap} />
      <Txt x={450} y={318} size={24} weight={600} color={COLORS.textSupport}>Elastic rebound · schematic</Txt>
    </g>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const dateCard = span( t, b, 'time', 'fault', 0.4 );
  const magCard = span( t, b, 'mag', 'fault', 0.4 );
  const offsetCard = span( t, b, 'offset', 'fire', 0.4 );
  const tollCard = span( t, b, 'toll', 'reid', 0.4 );
  const science = vis( t, b.reid.start - 0.1, b.rebound.end + 0.6, 0.4 );
  return (
    <>
      <Backdrop accent="#4a3414" grid={false} />
      <NorCalMap t={t} b={b} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <StrikeSlip t={t} b={b} />
        <Fire t={t} b={b} />
        <Rebound t={t} b={b} />
        <Card x={60} y={1020} w={540} label="DATE · LOCAL TIME" value="APRIL 18, 1906" valueSize={62} note="Foreshock just after 5:12 AM" opacity={dateCard} color={PAPER} />
        <Card x={620} y={1020} w={400} label="MAGNITUDE · USGS" value="7.9" valueSize={110} opacity={magCard} color={AMBER} />
        <Card x={60} y={1040} w={960} label="THE DEATH TOLL" value="IN THE THOUSANDS" valueSize={80} note="Early official reports underestimated it · USGS, NPS" opacity={tollCard} color={PAPER} />
        <Card x={60} y={1080} w={960} label="LAWSON REPORT 1908 · REID 1910" value="ELASTIC REBOUND" valueSize={80} opacity={science} color={AMBER} />
      </svg>
      <div style={{ position: 'absolute', left: 90, top: 1292, width: 900, textAlign: 'center', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 28, color: COLORS.textSupport, opacity: offsetCard }}>About 20 feet of offset observed near Point Reyes · Lawson report</div>
      <HistoricTitle lines={[ 'SAN FRANCISCO', '1906' ]} opacity={vis( t, 0.15, b.time.start + 0.2, 0.5 )} color={AMBER} />
      <HistoricTag number={3} opacity={vis( t, b.time.start + 0.4, b.cta.start - 1, 0.6 )} color={AMBER} />
    </>
  );
};

export const HistoricSanFrancisco1906 = makeEduShort( {
  id: 'sanfrancisco1906',
  meta: HISTORIC.sanfrancisco1906,
  Visuals,
  cues: b => [
    { sfx: 'riser', at: b.hook.start + 0.3, dur: 2.2, volume: 0.22 },
    { sfx: 'rumble', at: b.time.start + 0.5, dur: 6, volume: s => 0.4 * Math.min( 1, s ) * ( 1 - smooth( ( s - 4.5 ) / 1.4 ) ) },
    { sfx: 'boom', at: at( b, 'mag', 0 ), dur: 3, volume: 0.5 },
    { sfx: 'whoosh', at: at( b, 'fault', 0 ), dur: 1.4, volume: 0.3 },
    { sfx: 'whoosh', at: at( b, 'strike', -0.2 ), dur: 1.4, volume: 0.3 },
    { sfx: 'rumble', at: at( b, 'length', 0.3 ), dur: 6, volume: s => 0.3 * Math.exp( -s / 3 ) },
    { sfx: 'boom', at: within( b, 'offset', 0.1 ), dur: 3, volume: 0.4 },
    { sfx: 'whoosh', at: at( b, 'fire', -0.2 ), dur: 1.4, volume: 0.3 },
    { sfx: 'rumble', at: at( b, 'fire', 0.5 ), dur: 8, volume: s => 0.22 * Math.min( 1, s / 2 ) },
    { sfx: 'tick', at: at( b, 'toll', 0.3 ), dur: 0.3, volume: 0.4 },
    { sfx: 'riser', at: within( b, 'rebound', 0.3 ), dur: 2.2, volume: 0.22 },
    { sfx: 'boom', at: within( b, 'rebound', 0.62 ), dur: 3, volume: 0.55 }
  ]
} );
