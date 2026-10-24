/**
 * "Where Will the Next Big One Hit?" V2 visual experiment (12 s, silent, no captions): the existing MapLibre globe (LiveMap, offline
 * Natural Earth style) with a cinematic camera and SVG seismic overlays projected through map.project. Opens on a hypothetical
 * "could both" question, dives to the Bay Area, sweeps north to Cascadia and pulls back to two separate regions.
 * Fault traces are schematic. Probabilities: Bay Area 72% (USGS 2014-2043 outlook, verified), Cascadia 10-15% (USGS 2025).
 */
import { AbsoluteFill } from 'remotion';
import { COLORS } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { LiveMap } from '../map/LiveMap.js';
import type { MapCamera } from '../map/LiveMap.js';
import { HOT, Txt, clamp, f1, lerp, prog, vis } from './kit.js';
import { Pop } from './octShared.js';

const FPS = 30;
export const AMBER = '#F2A900';
export const CYAN = '#7FDBFF';
export type LL = [ number, number ];

export const SF: LL = [ -122.42, 37.77 ];
export const SEA: LL = [ -122.33, 47.6 ];
/** Schematic traces, [lon, lat]. Not survey data. */
const SAN_ANDREAS: LL[] = [ [ -120.5, 35.9 ], [ -121.5, 36.8 ], [ -122.4, 37.6 ], [ -123.1, 38.3 ], [ -123.7, 38.95 ], [ -124.3, 40.0 ], [ -124.4, 40.4 ] ];
const HAYWARD: LL[] = [ [ -121.85, 37.3 ], [ -121.97, 37.55 ], [ -122.2, 37.8 ], [ -122.3, 37.95 ], [ -122.45, 38.1 ], [ -122.55, 38.35 ], [ -122.7, 38.6 ] ];
const CALAVERAS: LL[] = [ [ -121.5, 36.9 ], [ -121.7, 37.3 ], [ -121.85, 37.6 ], [ -121.95, 37.85 ] ];
const CASCADIA: LL[] = [ [ -124.6, 40.4 ], [ -125.1, 42 ], [ -125.3, 44 ], [ -125.3, 46 ], [ -125.5, 47.5 ], [ -126.6, 48.5 ], [ -127.7, 49.5 ] ];

const densify = ( pts: LL[], n = 4 ): LL[] => pts.flatMap( ( p, i ) => ( i === pts.length - 1 ? [ p ] : Array.from( { length: n }, ( _, k ) => [ lerp( p[0], pts[i + 1][0], k / n ), lerp( p[1], pts[i + 1][1], k / n ) ] as LL ) ) );
export const LINES = { sa: densify( SAN_ANDREAS ), hay: densify( HAYWARD ), cal: densify( CALAVERAS ), cas: densify( CASCADIA ) };
export const TRACK: LL[] = [ SEA, ...LINES.sa, ...LINES.hay, ...LINES.cal, ...LINES.cas ];
export const OFF = { sa: 1, hay: 1 + LINES.sa.length, cal: 1 + LINES.sa.length + LINES.hay.length, cas: 1 + LINES.sa.length + LINES.hay.length + LINES.cal.length };

export const V2_SECONDS = 12;
const T = { dive: [ 2.2, 3.6 ], north: [ 5.6, 8.4 ], back: [ 10.0, 12.0 ] } as const;
export const ease = ( x: number ) => ( x < 0.5 ? 4 * x * x * x : 1 - ( ( -2 * x + 2 ) ** 3 ) / 2 );
export const seg = ( t: number, [ a, b ]: readonly [ number, number ] ) => ease( clamp( ( t - a ) / ( b - a ) ) );

export type Cam = { c: LL; z: number; b: number; p: number };
export const BOTH: Cam = { c: [ -123.2, 43.0 ], z: 5.4, b: -14, p: 42 };
export const BAY: Cam = { c: [ -122.25, 37.75 ], z: 8.4, b: 22, p: 58 };
export const CAS: Cam = { c: [ -124.0, 46.4 ], z: 7.2, b: -12, p: 56 };
export const mix = ( a: Cam, b: Cam, k: number ): Cam => ( { c: [ lerp( a.c[0], b.c[0], k ), lerp( a.c[1], b.c[1], k ) ], z: lerp( a.z, b.z, k ), b: lerp( a.b, b.b, k ), p: lerp( a.p, b.p, k ) } );

export const cameraV2 = ( frame: number ): MapCamera => {
  const t = frame / FPS;
  let cam = BOTH;
  if ( t < T.dive[0] ) {
    cam = { ...BOTH, z: lerp( 5.15, BOTH.z, clamp( t / T.dive[0] ) ) };
  } else if ( t < T.north[0] ) {
    const drift = clamp( ( t - T.dive[1] ) / ( T.north[0] - T.dive[1] ) );
    cam = mix( BOTH, { ...BAY, z: BAY.z + 0.25 * drift, b: BAY.b + 8 * drift }, seg( t, T.dive ) );
  } else if ( t < T.back[0] ) {
    const k = seg( t, T.north );
    const from = { ...BAY, z: BAY.z + 0.25, b: BAY.b + 8 };
    cam = mix( from, CAS, k );
    cam.z -= 2.0 * Math.sin( Math.PI * k );
    cam.p -= 8 * Math.sin( Math.PI * k );
  } else {
    const drift = clamp( ( t - T.north[1] ) / ( T.back[0] - T.north[1] ) );
    cam = mix( { ...CAS, z: CAS.z + 0.2 * drift }, BOTH, seg( t, T.back ) );
  }
  return { center: cam.c, zoom: cam.z, bearing: cam.b, pitch: cam.p };
};

export const Rings: React.FC<{ x: number; y: number; frame: number; start: number; color: string; ry: number; max?: number }> = ( { x, y, frame, start, color, ry, max = 330 } ) => {
  const local = frame - start;
  if ( local < 0 ) {
    return null;
  }
  return (
    <g>
      {[ 0, 1, 2, 3 ].map( i => {
        const ph = ( ( local - i * 14 ) % 56 ) / 56;
        if ( local - i * 14 < 0 || ph < 0 ) {
          return null;
        }
        return <ellipse key={i} cx={x} cy={y} rx={14 + ph * max} ry={( 14 + ph * max ) * ry} fill="none" stroke={color} strokeWidth={12 * ( 1 - ph ) + 2} opacity={( 1 - ph ) ** 1.3} />;
      } )}
      <circle cx={x} cy={y} r={14} fill="#fff" />
      <circle cx={x} cy={y} r={30 + 6 * Math.sin( frame / 3 )} fill={color} opacity={0.35} />
    </g>
  );
};

export const Trace: React.FC<{ pts: { x: number; y: number }[]; color: string; core: string; draw: number; glow?: number; width?: number }> = ( { pts, color, core, draw, glow = 1, width = 9 } ) => {
  if ( draw <= 0.001 ) {
    return null;
  }
  const d = `M${pts.map( p => `${f1( p.x )},${f1( p.y )}` ).join( 'L' )}`;
  const dash = { pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - draw };
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={width * 3.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.45 * glow} filter="url(#glow)" {...dash} />
      <path d={d} fill="none" stroke={core} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" {...dash} />
    </g>
  );
};

export const Chip: React.FC<{ t: number; t0: number; t1: number; color: string; kicker: string; big: string; line: string }> = ( { t, t0, t1, color, kicker, big, line } ) => (
  <g opacity={vis( t, t0 - 0.05, t1, 0.3 )}>
    <Pop t={t} t0={t0} cx={540} cy={1650} from={1.4}>
      <rect x={60} y={1500} width={960} height={310} rx={26} fill="rgba(7,11,20,0.9)" stroke={color} strokeWidth={8} />
      <Txt x={540} y={1562} size={42} display weight={800} spacing={6} color={color}>{kicker}</Txt>
      <Txt x={540} y={1690} size={132} display weight={800} color={COLORS.text}>{big}</Txt>
      <Txt x={540} y={1768} size={44} weight={700} color={COLORS.textSupport}>{line}</Txt>
    </Pop>
  </g>
);

export const Tag: React.FC<{ x: number; y: number; text: string; color: string; o: number }> = ( { x, y, text, color, o } ) => {
  if ( o <= 0.01 ) {
    return null;
  }
  const w = text.length * 29 + 56;
  return (
    <g opacity={o}>
      <rect x={x - w / 2} y={y - 40} width={w} height={74} rx={16} fill="rgba(7,11,20,0.92)" stroke={color} strokeWidth={5} />
      <text x={x} y={y + 14} textAnchor="middle" fontFamily="inherit" fontWeight={800} fontSize={44} letterSpacing={3} fill={color} style={{ fontFamily: 'Barlow Condensed, sans-serif', textTransform: 'uppercase' }}>{text}</text>
    </g>
  );
};

const Overlay = ( sf: { x: number; y: number }, frame: number, tracked?: { x: number; y: number }[] ) => {
  if ( !tracked ) {
    return null;
  }
  const t = frame / FPS;
  const sea = tracked[0];
  const slice = ( o: number, n: number ) => tracked.slice( o, o + n );
  const sa = slice( OFF.sa, LINES.sa.length ), hay = slice( OFF.hay, LINES.hay.length ), cal = slice( OFF.cal, LINES.cal.length ), cas = slice( OFF.cas, LINES.cas.length );
  const ry = Math.cos( ( cameraV2( frame ).pitch / 180 ) * Math.PI ) * 0.95 + 0.1;
  const bayDraw = prog( t, 0.2, 1.4 ) ;
  const hayDraw = prog( t, 3.3, 1.2 );
  const casDraw = prog( t, 6.4, 2.0 );
  const toNorth = seg( t, T.north );
  const toBack = seg( t, T.back );
  const bayFocus = 1 - 0.65 * toNorth * ( 1 - toBack );
  const casFocus = 0.55 + 0.45 * Math.max( toNorth, toBack );
  const pulse = 0.7 + 0.3 * Math.sin( t * 6 );
  const hook = vis( t, -1, T.dive[0] + 0.1, 0.35 );
  const hit = t < 0.5 ? 1 - t / 0.5 : 0;
  const shake = t > T.dive[0] && t < T.dive[0] + 0.4 ? Math.sin( t * 90 ) * 10 * ( 1 - ( t - T.dive[0] ) / 0.4 ) : t < 0.4 ? Math.sin( t * 110 ) * 14 * ( 1 - t / 0.4 ) : 0;
  const tagBay = vis( t, T.dive[1] - 0.4, T.north[0] + 0.6, 0.3 ) + 0 * 0;
  const tagCas = vis( t, T.north[1] - 0.4, T.back[0] + 0.6, 0.3 );
  const end = prog( t, T.back[0] + 0.7, 0.3 );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter></defs>
      <rect width={1080} height={1920} fill={HOT} opacity={0.45 * hit} />
      <g transform={`translate(${f1( shake )} 0)`}>
        <g opacity={bayFocus}>
          <Trace pts={sa} color={AMBER} core="#ffe08a" draw={bayDraw} glow={0.6 + 0.4 * pulse} />
          <Trace pts={hay} color={AMBER} core="#ffd04d" draw={hayDraw} width={7} glow={pulse} />
          <Trace pts={cal} color={AMBER} core="#ffd04d" draw={hayDraw} width={6} glow={pulse} />
        </g>
        <g opacity={casFocus}>
          <Trace pts={cas} color={CYAN} core="#eafcff" draw={casDraw} glow={0.6 + 0.4 * pulse} width={10} />
        </g>
        <Rings x={sf.x} y={sf.y} frame={frame} start={0} color={AMBER} ry={ry} max={t < T.dive[0] ? 240 : 360} />
        <Rings x={sea.x} y={sea.y} frame={frame} start={t < T.dive[0] ? 6 : 190} color={CYAN} ry={ry} max={t < T.dive[0] ? 240 : 360} />
        <Tag x={sf.x} y={sf.y + 130} text="BAY AREA" color={AMBER} o={Math.max( tagBay, prog( t, T.back[0] + 0.7, 0.3 ) ) * ( t < 5.6 || t > 10 ? 1 : 0.0 )} />
        <Tag x={sea.x} y={sea.y + 130} text="CASCADIA" color={CYAN} o={Math.max( tagCas, end ) * ( t > 8 ? 1 : 0 )} />
      </g>
      <g opacity={hook}>
        <Txt x={540} y={170} size={44} display weight={800} spacing={8} color={HOT}>HYPOTHETICAL QUESTION</Txt>
        <Pop t={t} t0={0.05} cx={540} cy={380} from={1.6}>
          <Txt x={540} y={320} size={150} display weight={800} color={COLORS.text}>COULD BOTH</Txt>
          <Txt x={540} y={470} size={150} display weight={800} color={HOT}>HIT TOGETHER?</Txt>
        </Pop>
        <Txt x={540} y={555} size={44} weight={700} color={COLORS.textSupport} opacity={prog( t, 0.7, 0.3 )}>Bay Area + Cascadia · not a forecast</Txt>
      </g>
      <Chip t={t} t0={3.7} t1={T.north[0] + 0.4} color={AMBER} kicker="BAY AREA · WHOLE FAULT SYSTEM" big="72%" line="M6.7+ somewhere in 30 years" />
      <Chip t={t} t0={8.3} t1={T.back[0] + 0.3} color={CYAN} kicker="CASCADIA SUBDUCTION ZONE" big="10–15%" line="≈M9 in 50 years" />
      <g opacity={end}>
        <rect x={60} y={1500} width={960} height={250} rx={26} fill="rgba(7,11,20,0.92)" stroke={HOT} strokeWidth={8} />
        <Txt x={540} y={1610} size={84} display weight={800} color={COLORS.text}>TWO SEPARATE SYSTEMS</Txt>
        <Txt x={540} y={1690} size={46} weight={700} color={HOT}>NOT A FORECAST</Txt>
      </g>
      <Txt x={540} y={1876} size={34} weight={700} color={COLORS.text} opacity={0.9}>Fault traces schematic · Sources: USGS</Txt>
    </svg>
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)', pointerEvents: 'none' }} />
);

export const NextBigOneV2: React.FC = () => {
  useBundledFonts();
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap
        cameraAt={cameraV2}
        epicenter={SF}
        tiles="local"
        diagnostics={{ event: 'next-big-one-v2', tiles: 'local' }}
        background={COLORS.background}
        trackPoints={TRACK}
        overlay={Overlay}
      >
        <Vignette />
      </LiveMap>
    </AbsoluteFill>
  );
};
