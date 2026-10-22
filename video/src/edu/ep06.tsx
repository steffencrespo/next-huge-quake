/**
 * Episode 06 (Myth vs Fact experiment), "Will California Fall Into the Ocean?". Claims and sources: ep06claims.ts. Opens on a
 * MYTH card slamming in over a map that tips toward the sea; FACT one snaps it level; the California map then zooms through the
 * plate boundary, the strike-slip diagram (reused from Historic 03) and a rate card; FACT two plays the Los Angeles / San
 * Francisco joke on the same map with a schematic, accelerated move. Facts are from USGS pages only; the trace, arrows, the
 * accelerated travel and the diagram are illustrations and are labelled as such.
 */
import { COLORS, FONT, TYPE } from '../design/tokens.js';
import { StrikeSlip } from '../historic/sanfrancisco1906.js';
import { Card, RegionMap } from '../historic/kit.js';
import { Backdrop, HOT, Pill, Txt, at, clamp, f1, lerp, prog, vis } from './kit.js';
import { CTA_LINE, plan } from './episodes.js';
import type { EpisodeMeta } from './episodes.js';
import { SeriesTag, makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';

type B = Parameters<EpisodeVisuals>[0]['b'];

export const CALIFORNIA: EpisodeMeta = {
  id: 'california', number: 6, compositionId: 'MythCaliforniaOcean', title: 'Will California Fall Into the Ocean?', baseSeconds: 40, tailSeconds: 1.2,
  script: plan( [
    { id: 'hook', text: 'Myth: California will fall into the ocean.', gap: 0.3 },
    { id: 'fact', text: 'Fact one: there’s nowhere for it to fall.', gap: 0.4 },
    { id: 'plates', text: 'The San Andreas Fault System is where the Pacific and North American plates meet.' },
    { id: 'slide', text: 'Those plates slide past each other, sideways.' },
    { id: 'rate', text: 'Relative to the North American Plate, the Pacific Plate moves northwest about forty-six millimeters a year.' },
    { id: 'fact2', text: 'Fact two: Los Angeles is moving in with San Francisco.', gap: 0.35 },
    { id: 'punch', text: 'Well… in about fifteen million years.', gap: 0.35 },
    { id: 'how', text: 'Southwestern California is moving north.' },
    CTA_LINE
  ], 0.4 )
};

const AMBER = '#e0a43c';
const FACT = '#3ddc97';
const PACIFIC = '#7FDBFF';
const BOX = { w: -127, e: -112, s: 30, n: 44 };
/** Schematic San Andreas trace, [lon, lat], Salton Sea to Cape Mendocino (the endpoints the USGS FAQ gives). Not survey data. */
const TRACE: [ number, number ][] = [ [ -115.7, 33.4 ], [ -116.5, 34.0 ], [ -117.4, 34.3 ], [ -118.4, 34.8 ], [ -119.6, 35.2 ], [ -120.5, 35.9 ], [ -121.5, 36.8 ], [ -122.4, 37.6 ], [ -123.1, 38.3 ], [ -123.7, 38.95 ], [ -124.3, 40.0 ], [ -124.4, 40.4 ] ];
const SF: [ number, number ] = [ -122.42, 37.77 ];
const LA: [ number, number ] = [ -118.24, 34.05 ];
/** Schematic route of the accelerated Los Angeles move: northwest, parallel to the fault, ending beside San Francisco. */
const ROUTE: [ number, number ][] = [ LA, [ -119.6, 34.6 ], [ -120.9, 35.5 ], [ -121.9, 36.6 ], [ -122.75, 37.65 ] ];
const MAP = { x: 60, y: 330, w: 960, h: 630 };

const pop = ( t: number, t0: number, from = 2.4, dur = 0.22 ) => {
  const k = clamp( ( t - t0 ) / dur );
  const e = 1 - Math.pow( 1 - k, 3 );
  return { scale: lerp( from, 1, e ), opacity: clamp( ( t - t0 ) / 0.07 ) };
};

const along = ( pts: [ number, number ][], k: number ): [ number, number ] => {
  const lens = pts.slice( 1 ).map( ( p, i ) => Math.hypot( p[0] - pts[i][0], p[1] - pts[i][1] ) );
  let d = clamp( k ) * lens.reduce( ( a, b ) => a + b, 0 );
  for ( let i = 0; i < lens.length; i++ ) {
    if ( d <= lens[i] ) {
      const u = d / lens[i];
      return [ lerp( pts[i][0], pts[i + 1][0], u ), lerp( pts[i][1], pts[i + 1][1], u ) ];
    }
    d -= lens[i];
  }
  return pts.at( -1 )!;
};

const Arrow: React.FC<{ x1: number; y1: number; x2: number; y2: number; color: string; opacity: number }> = ( { x1, y1, x2, y2, color, opacity } ) => {
  if ( opacity <= 0.01 ) {
    return null;
  }
  const len = Math.hypot( x2 - x1, y2 - y1 ) || 1;
  const ux = ( x2 - x1 ) / len, uy = ( y2 - y1 ) / len;
  const barb = ( a: number ) => `${f1( ( ux * Math.cos( a ) - uy * Math.sin( a ) ) * 38 )},${f1( ( ux * Math.sin( a ) + uy * Math.cos( a ) ) * 38 )}`;
  return <path d={`M${f1( x1 )},${f1( y1 )} L${f1( x2 )},${f1( y2 )} l${barb( 2.6 )} m${f1( -( ux * Math.cos( 2.6 ) - uy * Math.sin( 2.6 ) ) * 38 )},${f1( -( ux * Math.sin( 2.6 ) + uy * Math.cos( 2.6 ) ) * 38 )} l${barb( -2.6 )}`} stroke={color} strokeWidth={11} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
};

/** MYTH card slams in word by word; FACT one slams in, strikes the myth through and levels the map. */
export const Cards: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = vis( t, -1, b.plates.start + 0.25, 0.4 );
  if ( o <= 0.01 ) {
    return null;
  }
  const struck = prog( t, b.fact.start, 0.3 );
  const myth = pop( t, 0 );
  const word = ( text: string, y: number, t0: number ) => {
    const w = pop( t, t0, 1.7, 0.18 );
    return <g key={text} transform={`translate(540 ${y}) scale(${f1( w.scale )}) translate(-540 ${-y})`} opacity={w.opacity}><Txt x={540} y={y} size={80} display weight={800} color={COLORS.text}>{text}</Txt></g>;
  };
  const fact = pop( t, b.fact.start, 2.2, 0.2 );
  const shake = t > b.fact.start && t < b.fact.start + 0.35 ? Math.sin( t * 90 ) * 9 * ( 1 - ( t - b.fact.start ) / 0.35 ) : 0;
  return (
    <g opacity={o} transform={`translate(${f1( shake )} 0)`}>
      <g transform={`translate(540 640) scale(${f1( myth.scale )}) translate(-540 -640)`} opacity={myth.opacity * ( 1 - 0.35 * struck )}>
        <rect x={72} y={430} width={936} height={420} rx={20} fill="rgba(7,11,20,0.62)" stroke={HOT} strokeWidth={8} />
        <Txt x={540} y={545} size={72} display weight={800} spacing={12} color={HOT}>MYTH</Txt>
      </g>
      {word( 'CALIFORNIA WILL', 650, 0.3 )}
      {word( 'FALL INTO THE OCEAN', 745, 0.6 )}
      {[ 628, 718 ].map( ( y, i ) => <line key={y} x1={110} x2={970} y1={y} y2={y} stroke={HOT} strokeWidth={10} strokeLinecap="round" strokeDasharray="860 860" strokeDashoffset={860 * ( 1 - prog( t, b.fact.start + i * 0.12, 0.25 ) )} opacity={struck} /> )}
      <g opacity={fact.opacity} transform={`translate(540 1100) scale(${f1( fact.scale )}) translate(-540 -1100)`}>
        <rect x={72} y={930} width={936} height={340} rx={20} fill="rgba(7,11,20,0.94)" stroke={FACT} strokeWidth={8} />
        <Txt x={540} y={1040} size={64} display weight={800} spacing={10} color={FACT}>FACT #1</Txt>
        <Txt x={540} y={1150} size={88} display weight={800} color={COLORS.text}>NOWHERE TO FALL</Txt>
        <Txt x={540} y={1230} size={34} weight={600} color={COLORS.textSupport}>Source: USGS</Txt>
      </g>
    </g>
  );
};

/** One California map for the whole video: tips toward the sea during the myth, then zooms with the explanation. */
export const CaMap: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const end = b.cta.start + 1.2;
  const o = vis( t, -1, end, 0.5 );
  if ( o <= 0.01 ) {
    return null;
  }
  const hook = t < b.fact.start;
  const dim = lerp( 0.8, 1, prog( t, b.plates.start - 0.1, 0.5 ) );
  const tilt = hook ? 15 * Math.pow( clamp( t / ( b.fact.start + 0.1 ) ), 2 ) : 0;
  const snap = t >= b.fact.start ? 1 - prog( t, b.fact.start, 0.3 ) : 0;
  const jitter = hook ? Math.sin( t * 47 ) * ( 2 + 6 * clamp( t / b.fact.start ) ) : 0;
  const z1 = prog( t, b.slide.start - 0.3, 1.6 );
  const z2 = prog( t, b.fact2.start - 0.2, 1.8 );
  const zoom = lerp( lerp( 3.5, 4.4, z1 ), 5.0, z2 );
  const center: [ number, number ] = [ lerp( lerp( -119.8, -121.2, z1 ), -120.3, z2 ), lerp( lerp( 36.7, 36.1, z1 ), 35.5, z2 ) ];
  const trace = prog( t, b.plates.start + 0.4, 1.6 );
  const labels = prog( t, b.plates.start + 0.3, 0.5 );
  const arrows = prog( t, b.slide.start + 0.3, 0.5 ) * ( 1 - z2 );
  const naFade = 1 - prog( t, b.rate.start, 0.5 );
  const pulse = 0.75 + 0.25 * Math.sin( t * 7 );
  const travel = prog( t, b.fact2.start + 0.7, Math.max( 2.5, b.punch.start + 1.4 - ( b.fact2.start + 0.7 ) ) );
  const cities = prog( t, b.fact2.start - 0.4, 0.5 );
  const years = Math.round( travel * 15 );
  const [ lonLa, latLa ] = along( ROUTE, travel );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o * dim, transformOrigin: '60px 960px', transform: `translate(${f1( jitter + snap * 6 )}px, ${f1( tilt * 14 )}px) rotate(${f1( tilt - snap * 1.5 )}deg)` }}>
      <RegionMap id="ca" rect={MAP} box={BOX} center={center} zoom={zoom} grid={5}>
        {proj => {
          const d = `M${TRACE.map( ( [ lo, la ] ) => proj( lo, la ).map( f1 ).join( ',' ) ).join( 'L' )}`;
          const keep = ( [ x, y ]: [ number, number ], m = 150 ): [ number, number ] => [ clamp( x, MAP.x + m, MAP.x + MAP.w - m ), clamp( y, MAP.y + 100, MAP.y + MAP.h - 60 ) ];
          const [ px, py ] = keep( proj( -124.2, 34.9 ) );
          const [ nx, ny ] = keep( proj( -116.2, 38.0 ), 240 );
          const [ sx, sy ] = proj( SF[0], SF[1] );
          const [ lx, ly ] = proj( lonLa, latLa );
          const [ a1x, a1y ] = proj( -122.9, 35.3 ), [ a2x, a2y ] = proj( -124.0, 36.5 );
          const [ n1x, n1y ] = proj( -119.4, 36.5 ), [ n2x, n2y ] = proj( -118.3, 35.5 );
          return (
            <>
              <path d={d} fill="none" stroke={AMBER} strokeOpacity={0.35} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - trace} />
              <path d={d} fill="none" stroke="#ffcf6b" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - trace} />
              <Pill x={px} y={py} text="PACIFIC PLATE" color={PACIFIC} size={30} opacity={labels} />
              <Pill x={nx} y={ny} text="NORTH AMERICAN PLATE" color={AMBER} size={30} opacity={labels} />
              <Arrow x1={a1x} y1={a1y} x2={a2x} y2={a2y} color={PACIFIC} opacity={arrows * pulse} />
              <Arrow x1={n1x} y1={n1y} x2={n2x} y2={n2y} color={AMBER} opacity={arrows * naFade} />
              <circle cx={sx} cy={sy} r={12} fill="#fff" opacity={cities} />
              <Pill x={sx - 40} y={sy - 52} text="SAN FRANCISCO" color="#fff" size={26} opacity={cities} />
              <circle cx={lx} cy={ly} r={12} fill={FACT} stroke="#fff" strokeWidth={4} opacity={cities} />
              <Pill x={lx + ( travel > 0.6 ? -150 : 40 )} y={ly + 66} text="LOS ANGELES" color={FACT} size={26} opacity={cities} />
              {travel > 0 ? <path d={`M${Array.from( { length: 17 }, ( _, i ) => proj( ...along( ROUTE, ( travel * i ) / 16 ) ).map( f1 ).join( ',' ) ).join( 'L' )}`} stroke={FACT} strokeWidth={6} strokeDasharray="12 12" fill="none" opacity={0.8} /> : null}
            </>
          );
        }}
      </RegionMap>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Pill x={690} y={MAP.y + 52} text="SAN ANDREAS FAULT SYSTEM" color={AMBER} size={28} opacity={prog( t, b.plates.start + 1.2, 0.5 ) * ( 1 - z2 )} />
        <Pill x={540} y={MAP.y + MAP.h - 44} text={`SCHEMATIC · ACCELERATED · ${years} MILLION YEARS`} color={FACT} size={26} opacity={cities * z2} />
        <Txt x={84} y={MAP.y + MAP.h - 18} size={26} weight={600} anchor="start" color={COLORS.textSupport} opacity={trace * ( 1 - z2 )}>Fault trace, arrows and motion are schematic</Txt>
      </svg>
    </div>
  );
};

export const Rate: React.FC<{ t: number; b: B }> = ( { t, b } ) => (
  <Card x={90} y={1010} w={900} label="PACIFIC PLATE vs NORTH AMERICAN PLATE" value="≈ 46 MM / YEAR" note="northwest · about the rate fingernails grow" color={AMBER} opacity={vis( t, b.rate.start - 0.1, b.fact2.start + 0.1, 0.4 )} valueSize={96} />
);

const Fact2: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = vis( t, b.fact2.start - 0.1, 999, 0.1 );
  if ( o <= 0.01 ) {
    return null;
  }
  const p = pop( t, b.fact2.start, 2.0, 0.22 );
  const punch = pop( t, b.punch.start, 1.3, 0.3 );
  return (
    <g opacity={p.opacity}>
      <g transform={`translate(540 1160) scale(${f1( p.scale )}) translate(-540 -1160)`}>
        <rect x={72} y={1000} width={936} height={330} rx={20} fill="rgba(7,11,20,0.94)" stroke={FACT} strokeWidth={8} />
        <Txt x={540} y={1068} size={46} display weight={800} spacing={10} color={FACT}>FACT #2</Txt>
        <Txt x={540} y={1148} size={62} display weight={800} color={COLORS.text}>LA IS MOVING IN</Txt>
        <Txt x={540} y={1216} size={62} display weight={800} color={COLORS.text}>WITH SAN FRANCISCO</Txt>
      </g>
      <g opacity={punch.opacity} transform={`translate(540 1285) scale(${f1( punch.scale )}) translate(-540 -1285)`}>
        <Txt x={540} y={1296} size={40} weight={700} color={AMBER}>Well… in about 15 million years.</Txt>
      </g>
    </g>
  );
};

/** Compact closing call to action: keeps the payoff on screen instead of a full-screen brand card. */
export const CompactCta: React.FC<{ frame: number; start: number }> = ( { frame, start } ) => {
  const k = prog( frame / 30, start, 0.4 );
  if ( k <= 0.01 ) {
    return null;
  }
  const pill = ( text: string, bg: string, border: string ) => (
    <div style={{ padding: '14px 34px', borderRadius: 60, background: bg, border: `3px solid ${border}`, ...TYPE.tag, color: COLORS.text }}>{text}</div>
  );
  return (
    <div style={{ position: 'absolute', left: 0, width: 1080, top: 1500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: k, transform: `translateY(${f1( ( 1 - k ) * 40 )}px)` }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 56, letterSpacing: 4, color: COLORS.text }}>NEXT HUGE QUAKE</div>
      <div style={{ display: 'flex', gap: 24 }}>{pill( 'LIKE', 'rgba(244,246,250,0.1)', COLORS.text )}{pill( 'SUBSCRIBE', COLORS.red, COLORS.red )}</div>
    </div>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const flash = t < 0.5 ? 0.35 * ( 1 - t / 0.5 ) : 0;
  const factFlash = t >= b.fact.start && t < b.fact.start + 0.4 ? 0.3 * ( 1 - ( t - b.fact.start ) / 0.4 ) : 0;
  return (
    <>
      <Backdrop accent="#3f1b2b" />
      <CaMap t={t} b={b} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={1080} height={1920} fill={HOT} opacity={flash} />
        <rect width={1080} height={1920} fill={FACT} opacity={factFlash} />
        <Cards t={t} b={b} />
      </svg>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}><StrikeSlip t={t} b={{ ...b, strike: b.slide, offset: { start: b.slide.start + 0.8, end: b.slide.end } }} /></svg>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Rate t={t} b={b} />
        <Fact2 t={t} b={b} />
      </svg>
      <SeriesTag number={6} opacity={vis( t, b.plates.start, b.cta.start - 1, 0.6 )} />
    </>
  );
};

export const MythCaliforniaOcean = makeEduShort( {
  id: 'california',
  meta: CALIFORNIA,
  Visuals,
  Cta: CompactCta,
  cues: b => [
    { sfx: 'riser', at: b.hook.start, dur: 1.8, volume: 0.3 },
    { sfx: 'rumble', at: b.hook.start, dur: 3, volume: s => 0.35 * Math.exp( -s / 2.5 ) },
    { sfx: 'boom', at: b.fact.start, dur: 3, volume: 0.45 },
    { sfx: 'whoosh', at: at( b, 'plates', 0 ), dur: 1.4, volume: 0.3 },
    { sfx: 'whoosh', at: at( b, 'slide', 0 ), dur: 1.4, volume: 0.3 },
    { sfx: 'tick', at: at( b, 'rate', 0.2 ), dur: 0.3, volume: 0.5 },
    { sfx: 'boom', at: b.fact2.start, dur: 3, volume: 0.35 },
    { sfx: 'tick', at: b.punch.start, dur: 0.3, volume: 0.5 },
    { sfx: 'whoosh', at: at( b, 'how', 0 ), dur: 1.4, volume: 0.25 }
  ]
} );
