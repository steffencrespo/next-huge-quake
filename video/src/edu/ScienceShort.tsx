/**
 * ScienceShort: "Why Do Earthquakes Happen?" (Earthquake Science Explained), 60 s, 1080x1920, 30 fps.
 *
 * One continuous 2.5D cross-section drawn as layered SVG: parallax sky and hills, deforming strata, a rock grid that
 * shows elastic strain, the fault, wave fronts and surface objects. A keyframed camera moves through it; the six
 * storyboard scenes are time windows of overlays (labels, arrows, gauge, captions), not separate renders. The
 * physics is in geo.ts. Captions are placeholders for the narration that is generated after script approval.
 */
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { z } from 'zod';
import { musicGain } from '../audio/soundtrack.js';
import { eduAudioSchema, videoSeconds } from './narration.js';
import type { EduAudio } from './narration.js';
import { SFX_FILES } from './sfx.js';
import { Wordmark } from '../components/Wordmark.js';
import { fadeIn, progressAt, slideUp, wipeIn } from '../design/motion.js';
import { COLORS, FONT, TYPE } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import {
  CAPTIONS, D, EVENTS, FAULT, FOCUS, FPS, HEIGHT, N, TOTAL_FRAMES, VP, VS, WIDTH, arrival, cameraAt, faultPoint, faultState, faultDisplacement, lerp, mapPoint, mulberry32,
  project, rumble, smooth, win
} from './geo.js';

const f1 = ( n: number ) => n.toFixed( 1 );
const P_COLOR = '#7FDBFF';
const S_COLOR = '#FFB800';
const HOT = COLORS.redHot;

// ---------- static geometry ----------

const BANDS: { y0: number; y1: number; color: string }[] = [
  { y0: 0, y1: 90, color: '#6b5640' },
  { y0: 90, y1: 210, color: '#5d4a3b' },
  { y0: 210, y1: 360, color: '#4f4547' },
  { y0: 360, y1: 540, color: '#453f4d' },
  { y0: 540, y1: 760, color: '#3a3b4f' },
  { y0: 760, y1: 1000, color: '#2e3247' },
  { y0: 1000, y1: 1800, color: '#242840' }
];

const X_MIN = -1500;
const X_MAX = 1500;

/** x positions along a horizontal line at world y: a regular step plus a dense cluster where the line crosses the fault. */
function lineXs( y: number ): number[] {
  const xs: number[] = [];
  for ( let x = X_MIN; x <= X_MAX; x += 25 ) {
    xs.push( x );
  }
  const crossing = FOCUS.x + ( ( y - FOCUS.y ) / D.y ) * D.x;
  for ( const off of [ -16, -8, -4, -2, 0, 2, 4, 8, 16 ] ) {
    xs.push( crossing + off );
  }
  return xs.sort( ( a, b ) => a - b );
}

/** y positions along a vertical line at world x, with a dense cluster at the fault crossing. */
function lineYs( x: number, yMax: number ): number[] {
  const ys: number[] = [];
  for ( let y = 0; y <= yMax; y += 30 ) {
    ys.push( y );
  }
  const crossing = FOCUS.y + ( ( x - FOCUS.x ) / D.x ) * D.y;
  if ( crossing > 0 && crossing < yMax ) {
    for ( const off of [ -16, -8, -4, -2, 0, 2, 4, 8, 16 ] ) {
      ys.push( crossing + off );
    }
  }
  return ys.sort( ( a, b ) => a - b );
}

const BAND_XS = BANDS.map( b => ( { top: lineXs( b.y0 ), bottom: lineXs( b.y1 ) } ) );
const GRID_H = [ 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200 ].map( y => ( { y, xs: lineXs( y ) } ) );
const GRID_V = Array.from( { length: 21 }, ( _, i ) => -1000 + i * 100 ).map( x => ( { x, ys: lineYs( x, 1250 ) } ) );

const rand = mulberry32( 7 );
const DOTS = Array.from( { length: 260 }, () => ( { x: -900 + rand() * 1800, y: 4 + rand() * 1250, r: 1.6 + rand() * 3, a: 0.06 + rand() * 0.14 } ) );
const STARS = Array.from( { length: 80 }, () => ( { x: -900 + rand() * 1800, y: -1500 + rand() * 1350, r: 1 + rand() * 2.2, a: 0.25 + rand() * 0.6 } ) );

const RIDGE = ( () => {
  const pts: string[] = [];
  for ( let x = -1600; x <= 1600; x += 40 ) {
    pts.push( `${x},${f1( -70 - 55 * Math.sin( x / 210 ) - 28 * Math.sin( x / 67 + 1 ) - 14 * Math.sin( x / 29 + 2 ) )}` );
  }
  return `M-1600,900 L${pts.join( ' L' )} L1600,900 Z`;
} )();

// ---------- world ----------

const SURFACE_OBJECTS: { x: number; kind: 'tower' | 'house' | 'block'; w: number; h: number }[] = [
  { x: -430, kind: 'tower', w: 56, h: 330 },
  { x: -300, kind: 'house', w: 120, h: 90 },
  { x: -160, kind: 'house', w: 96, h: 74 },
  { x: 175, kind: 'block', w: 130, h: 240 },
  { x: 335, kind: 'house', w: 120, h: 92 },
  { x: 470, kind: 'house', w: 90, h: 70 }
];

const SurfaceObject: React.FC<{ o: ( typeof SURFACE_OBJECTS )[number]; t: number }> = ( { o, t } ) => {
  const [ bx, by ] = mapPoint( o.x, 0, t );
  const angle = ( bx - o.x - faultDisplacement( o.x, 0, t ).x ) * ( o.h / 100 ) * 0.045;
  const lit = '#f6c86a';
  const dark = '#0c1220';
  let body: React.ReactNode;
  if ( o.kind === 'tower' ) {
    body = (
      <>
        <rect x={-o.w / 2} y={-o.h} width={o.w} height={o.h} fill={dark} />
        <rect x={-3} y={-o.h - 70} width={6} height={70} fill={dark} />
        {[ 0, 1, 2, 3, 4, 5 ].map( i => <rect key={i} x={-14} y={-o.h + 30 + i * 46} width={28} height={14} fill={lit} opacity={0.75} /> )}
      </>
    );
  } else if ( o.kind === 'block' ) {
    body = (
      <>
        <rect x={-o.w / 2} y={-o.h} width={o.w} height={o.h} fill={dark} />
        {[ 0, 1, 2, 3, 4 ].map( r => [ 0, 1, 2 ].map( c => (
          <rect key={`${r}${c}`} x={-o.w / 2 + 16 + c * 38} y={-o.h + 20 + r * 42} width={22} height={18} fill={lit} opacity={( r + c ) % 3 === 0 ? 0.25 : 0.75} />
        ) ) )}
      </>
    );
  } else {
    body = (
      <>
        <rect x={-o.w / 2} y={-o.h} width={o.w} height={o.h} fill={dark} />
        <polygon points={`${-o.w / 2 - 8},${-o.h} 0,${-o.h - o.h * 0.55} ${o.w / 2 + 8},${-o.h}`} fill={dark} />
        <rect x={-o.w * 0.22} y={-o.h * 0.62} width={o.w * 0.2} height={o.h * 0.28} fill={lit} opacity={0.8} />
        <rect x={o.w * 0.1} y={-o.h * 0.62} width={o.w * 0.2} height={o.h * 0.28} fill={lit} opacity={0.5} />
      </>
    );
  }
  return <g transform={`translate(${f1( bx )} ${f1( by + 2 )}) rotate(${f1( angle )})`}>{body}</g>;
};

const Arrow: React.FC<{ x: number; y: number; dx: number; dy: number; opacity: number }> = ( { x, y, dx, dy, opacity } ) => {
  const angle = ( Math.atan2( dy, dx ) * 180 ) / Math.PI;
  return (
    <g transform={`translate(${f1( x )} ${f1( y )}) rotate(${f1( angle )})`} opacity={opacity}>
      <path d="M-90,-14 L40,-14 L40,-36 L100,0 L40,36 L40,14 L-90,14 Z" fill="#f4f6fa" stroke="#070b14" strokeWidth={4} strokeLinejoin="round" />
    </g>
  );
};

const Rings: React.FC<{ radius: number; color: string; width: number; clip: string }> = ( { radius, color, width, clip } ) => {
  if ( radius <= 4 ) {
    return null;
  }
  const fade = 1 - smooth( ( radius - 950 ) / 350 );
  return (
    <g clipPath={`url(#${clip})`}>
      {[ 0, 22, 44 ].map( ( back, i ) => radius - back > 2 ? (
        <circle key={i} cx={FOCUS.x} cy={FOCUS.y} r={radius - back} fill="none" stroke={color} strokeWidth={width - i * 1.5} opacity={fade * ( 0.95 - i * 0.3 )} />
      ) : null )}
    </g>
  );
};

const World: React.FC<{ t: number }> = ( { t } ) => {
  const cam = cameraAt( t );
  const [ rx, ry ] = rumble( t );
  const fs = faultState( t );
  const tw = t - EVENTS.rupture;
  const gridOpacity = 0.4 * smooth( ( t - 5.2 ) / 1.2 );

  const poly = ( i: number ) => {
    const b = BANDS[i];
    const top = BAND_XS[i].top.map( x => mapPoint( x, b.y0, t ) );
    const bottom = BAND_XS[i].bottom.map( x => mapPoint( x, b.y1, t ) ).reverse();
    return `M${[ ...top, ...bottom ].map( ( [ x, y ] ) => `${f1( x )},${f1( y )}` ).join( ' L' )} Z`;
  };
  const gridH = GRID_H.map( ( { y, xs } ) => `M${xs.map( x => mapPoint( x, y, t ) ).map( ( [ a, b ] ) => `${f1( a )},${f1( b )}` ).join( ' L' )}` ).join( ' ' );
  const gridV = GRID_V.map( ( { x, ys } ) => `M${ys.map( y => mapPoint( x, y, t ) ).map( ( [ a, b ] ) => `${f1( a )},${f1( b )}` ).join( ' L' )}` ).join( ' ' );

  const topLeft = faultPoint( FAULT.top );
  const bottomRight = faultPoint( FAULT.bottom );
  const patchA = faultPoint( -FAULT.lockedHalf );
  const patchB = faultPoint( FAULT.lockedHalf );
  const lockOn = smooth( ( t - EVENTS.lockStart ) / 1 );
  const burst = tw > 0 && tw < 1.6 ? 1 - tw / 1.6 : 0;
  const stressColor = `rgb(${Math.round( lerp( 242, 255, fs.stress ) )}, ${Math.round( lerp( 169, 59, fs.stress ) )}, ${Math.round( lerp( 0, 48, fs.stress ) )})`;
  const patchOpacity = lockOn * ( t < EVENTS.rupture ? 1 : Math.max( 0, 1 - tw / 1.2 ) );
  const ticks = Array.from( { length: 15 }, ( _, i ) => -FAULT.lockedHalf + 20 + i * ( ( 2 * FAULT.lockedHalf - 40 ) / 14 ) );
  const par = ( pf: number ) => `translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${f1( 1 + ( cam.z - 1 ) * pf )}) translate(${f1( -cam.cx * pf )} ${f1( -cam.cy * pf )})`;

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="-1500" x2="0" y2="40">
          <stop offset="0" stopColor="#060a14" />
          <stop offset="0.7" stopColor="#14213d" />
          <stop offset="1" stopColor="#4a3b52" />
        </linearGradient>
        <linearGradient id="hills" gradientUnits="userSpaceOnUse" x1="0" y1="-190" x2="0" y2="500">
          <stop offset="0" stopColor="#1a2542" />
          <stop offset="1" stopColor="#0d1428" />
        </linearGradient>
        <radialGradient id="stressGlow">
          <stop offset="0" stopColor="#ff5a3c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff5a3c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <clipPath id="below"><rect x={-3000} y={0} width={6000} height={4000} /></clipPath>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill="#0a0f1c" />
      <g transform={par( 0.3 )}>
        <rect x={-3000} y={-4000} width={6000} height={6000} fill="url(#sky)" />
        {STARS.map( ( s, i ) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.a} /> )}
      </g>
      <g transform={par( 0.55 )}><path d={RIDGE} fill="url(#hills)" /></g>
      <g transform={`translate(${f1( rx )} ${f1( ry )}) translate(${WIDTH / 2} ${HEIGHT / 2}) scale(${f1( cam.z )}) translate(${f1( -cam.cx )} ${f1( -cam.cy )})`}>
        {BANDS.map( ( b, i ) => <path key={i} d={poly( i )} fill={b.color} /> )}
        <g>
          {DOTS.map( ( d, i ) => {
            const [ x, y ] = mapPoint( d.x, d.y, t );
            return <circle key={i} cx={f1( x )} cy={f1( y )} r={f1( d.r )} fill="#fff" opacity={d.a} />;
          } )}
        </g>
        <path d={gridH} fill="none" stroke="#e8eef8" strokeWidth={2.2} opacity={gridOpacity} />
        <path d={gridV} fill="none" stroke="#e8eef8" strokeWidth={2.2} opacity={gridOpacity} />
        {/* surface line */}
        <path d={`M${BAND_XS[0].top.map( x => mapPoint( x, 0, t ) ).map( ( [ a, b ] ) => `${f1( a )},${f1( b )}` ).join( ' L' )}`} fill="none" stroke="#cdbfa0" strokeWidth={4} opacity={0.7} />
        {/* stress halo around the locked patch */}
        <circle cx={FOCUS.x} cy={FOCUS.y} r={330} fill="url(#stressGlow)" opacity={lockOn * fs.stress * 0.9} />
        {/* fault plane */}
        <line x1={topLeft.x} y1={topLeft.y} x2={bottomRight.x} y2={bottomRight.y} stroke="#05080f" strokeWidth={7} strokeLinecap="round" />
        <line x1={topLeft.x} y1={topLeft.y} x2={bottomRight.x} y2={bottomRight.y} stroke="#9aa6bd" strokeWidth={2} strokeDasharray="14 12" opacity={0.7} />
        <line x1={patchA.x} y1={patchA.y} x2={patchB.x} y2={patchB.y} stroke={stressColor} strokeWidth={34} opacity={0.22 * patchOpacity} strokeLinecap="round" />
        <line x1={patchA.x} y1={patchA.y} x2={patchB.x} y2={patchB.y} stroke={burst > 0 ? '#ffffff' : stressColor} strokeWidth={12} opacity={patchOpacity} strokeLinecap="round" />
        {ticks.map( ( a, i ) => {
          const p = faultPoint( a );
          return <line key={i} x1={p.x - N.x * 22} y1={p.y - N.y * 22} x2={p.x + N.x * 22} y2={p.y + N.y * 22} stroke="#fff" strokeWidth={3} opacity={0.55 * patchOpacity} />;
        } )}
        {/* waves */}
        {tw > 0 ? <Rings radius={VP * tw} color={P_COLOR} width={6} clip="below" /> : null}
        {tw > 0 ? <Rings radius={VS * tw} color={S_COLOR} width={8} clip="below" /> : null}
        {/* focus */}
        <circle cx={FOCUS.x} cy={FOCUS.y} r={13 + 5 * Math.sin( t * 5 ) * ( t < EVENTS.rupture ? 1 : 0 )} fill={HOT} stroke="#fff" strokeWidth={3} opacity={win( t, 17.5, 60, 0.8 )} />
        {burst > 0 ? <circle cx={FOCUS.x} cy={FOCUS.y} r={40 + tw * 260} fill="none" stroke="#fff" strokeWidth={10 * burst} opacity={burst} /> : null}
        {burst > 0 ? <circle cx={FOCUS.x} cy={FOCUS.y} r={90} fill="#fff" opacity={0.5 * burst * burst} /> : null}
        {/* arrows: plate motion along the fault */}
        {[ { x: 300, y: 170, s: -1 }, { x: -300, y: 600, s: 1 } ].map( ( a, i ) => {
          const [ ax, ay ] = mapPoint( a.x, a.y, t );
          return <Arrow key={i} x={ax} y={ay} dx={D.x * a.s} dy={D.y * a.s} opacity={win( t, 5.6, 19.5, 0.7 )} />;
        } )}
        {SURFACE_OBJECTS.map( o => <SurfaceObject key={o.x} o={o} t={t} /> )}
      </g>
      <rect width={WIDTH} height={HEIGHT} fill="url(#vignette)" />
    </svg>
  );
};

// ---------- overlays ----------

const pillWidth = ( text: string ) => Math.round( text.length * 22 + 52 );

/** A label pill with a leader line to a world point. The pill is placed at a screen position clamped inside the safe area. */
const Callout: React.FC<{ anchor: [ number, number ]; at: [ number, number ]; text: string; opacity: number; accent?: string }> = (
  { anchor, at, text, opacity, accent = COLORS.text }
) => {
  if ( opacity <= 0.01 ) {
    return null;
  }
  const w = pillWidth( text );
  const x = Math.min( 930 - w / 2, Math.max( 72 + w / 2, at[0] ) );
  const y = Math.min( 1265, Math.max( 230, at[1] ) );
  return (
    <g opacity={opacity}>
      <line x1={x} y1={y} x2={anchor[0]} y2={anchor[1]} stroke={accent} strokeWidth={3} />
      <circle cx={anchor[0]} cy={anchor[1]} r={8} fill={accent} stroke="#070b14" strokeWidth={3} />
      <rect x={x - w / 2} y={y - 30} width={w} height={60} rx={12} fill="rgba(7, 11, 20, 0.88)" stroke={accent} strokeWidth={3} />
      <text x={x} y={y + 12} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={34} letterSpacing={2} fill={COLORS.text}>{text}</text>
    </g>
  );
};

const Gauge: React.FC<{ t: number }> = ( { t } ) => {
  const fs = faultState( t );
  const opacity = win( t, 18.2, 36, 0.8 );
  if ( opacity <= 0.01 ) {
    return null;
  }
  const x = 870;
  const top = 560;
  const height = 480;
  const fill = height * fs.stress;
  const color = `rgb(${Math.round( lerp( 242, 255, fs.stress ) )}, ${Math.round( lerp( 169, 59, fs.stress ) )}, ${Math.round( lerp( 0, 48, fs.stress ) )})`;
  return (
    <g opacity={opacity}>
      <text x={x} y={top - 28} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={34} letterSpacing={3} fill={COLORS.text}>STRESS</text>
      <rect x={x - 26} y={top} width={52} height={height} rx={10} fill="rgba(7, 11, 20, 0.85)" stroke={COLORS.text} strokeWidth={3} />
      <rect x={x - 20} y={top + height - 6 - Math.max( 0, fill - 12 )} width={40} height={Math.max( 0, fill - 12 )} rx={6} fill={color} />
      <line x1={x - 46} y1={top + 14} x2={x + 46} y2={top + 14} stroke={HOT} strokeWidth={4} strokeDasharray="10 6" />
      <text x={930} y={top + height + 44} textAnchor="end" fontFamily={FONT.ui} fontWeight={600} fontSize={30} fill={COLORS.textSupport}>FRICTION LIMIT ▲</text>
    </g>
  );
};

const Overlays: React.FC<{ t: number }> = ( { t } ) => {
  const cam = cameraAt( t );
  const [ rx, ry ] = rumble( t );
  const proj = ( x: number, y: number ): [ number, number ] => {
    const [ sx, sy ] = project( cam, x, y );
    return [ sx + rx, sy + ry ];
  };
  const tw = t - EVENTS.rupture;
  const slip = faultPoint( -200 );
  const fault = faultPoint( -150 );
  const strain: [ number, number ] = [ 178, 474 ];
  const pAt = tw > 0 ? [ FOCUS.x + VP * tw * Math.cos( -0.9 ), FOCUS.y + VP * tw * Math.sin( -0.9 ) ] : [ 0, 0 ];
  const sAt = tw > 0 ? [ FOCUS.x + VS * tw * Math.cos( -2.3 ), FOCUS.y + VS * tw * Math.sin( -2.3 ) ] : [ 0, 0 ];
  const shown = ( p: number[] ) => p[1] > 40;
  const surfaceY = proj( 0, 0 )[1];
  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ position: 'absolute', left: 0, top: 0 }}>
      {/* scene 2 */}
      <Callout anchor={proj( mapPoint( 300, 170, t )[0], mapPoint( 300, 170, t )[1] )} at={[ 760, 640 ]} text="TECTONIC PLATE" opacity={win( t, 6.4, 16.8 )} />
      <Callout anchor={proj( mapPoint( -300, 600, t )[0], mapPoint( -300, 600, t )[1] )} at={[ 330, 1090 ]} text="TECTONIC PLATE" opacity={win( t, 8, 16.8 )} />
      {/* scene 3 */}
      <Callout anchor={proj( fault.x, fault.y )} at={[ 300, 560 ]} text="LOCKED FAULT" opacity={win( t, 18.4, 31.6 )} accent={S_COLOR} />
      <Callout anchor={proj( strain[0], strain[1] )} at={[ 400, 1010 ]} text="ROCK BENDS: ELASTIC STRAIN" opacity={win( t, 22, 31.6 )} accent={S_COLOR} />
      <Gauge t={t} />
      {/* scene 4 */}
      <Callout anchor={proj( slip.x, slip.y )} at={[ 280, 1040 ]} text="SUDDEN SLIP" opacity={win( t, 32.4, 36.2 )} accent={HOT} />
      <Callout anchor={proj( FOCUS.x, FOCUS.y )} at={[ 760, 1180 ]} text="FOCUS" opacity={win( t, 33, 40 )} accent={HOT} />
      <Callout anchor={proj( pAt[0], pAt[1] )} at={[ proj( pAt[0], pAt[1] )[0] + 150, proj( pAt[0], pAt[1] )[1] - 120 ]} text="P WAVES: FAST" opacity={shown( pAt ) ? win( t, 35.5, 43, 0.6 ) : 0} accent={P_COLOR} />
      <Callout anchor={proj( sAt[0], sAt[1] )} at={[ proj( sAt[0], sAt[1] )[0] - 150, proj( sAt[0], sAt[1] )[1] - 120 ]} text="S WAVES: SLOWER" opacity={shown( sAt ) ? win( t, 37, 46, 0.6 ) : 0} accent={S_COLOR} />
      {/* scene 5 */}
      <Callout anchor={proj( 0, 0 )} at={[ 540, surfaceY - 250 ]} text="EPICENTER" opacity={win( t, 43.4, 51.8 )} accent={HOT} />
      <Callout anchor={[ 540, surfaceY - 460 ]} at={[ 540, surfaceY - 460 ]} text="P WAVES ARRIVE FIRST" opacity={win( t, 43.2, 47.2 )} accent={P_COLOR} />
      <Callout anchor={[ 540, surfaceY - 460 ]} at={[ 540, surfaceY - 460 ]} text="S WAVES: STRONGER SHAKING" opacity={win( t, 47.4, 51.8 )} accent={S_COLOR} />
      {/* diagram note */}
      <text x={930} y={268} textAnchor="end" fontFamily={FONT.ui} fontWeight={600} fontSize={30} fill={COLORS.textSupport} opacity={win( t, 5.6, 51.8, 0.8 ) * 0.9}>Simplified diagram</text>
    </svg>
  );
};

const Title: React.FC<{ t: number }> = ( { t } ) => {
  const o = win( t, 0.2, 4.6, 0.6 );
  if ( o <= 0.01 ) {
    return null;
  }
  return (
    <div style={{ position: 'absolute', left: 72, top: 230, width: 858, opacity: o }}>
      <div style={{ position: 'absolute', left: -72, top: -60, width: WIDTH, height: 420, background: 'linear-gradient(to bottom, rgba(7,11,20,0.8), rgba(7,11,20,0))' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ ...TYPE.kicker, color: COLORS.redText }}>EARTHQUAKE SCIENCE EXPLAINED</div>
        <div style={{ ...TYPE.headline, color: COLORS.text, marginTop: 18 }}>WHY DO</div>
        <div style={{ ...TYPE.headline, color: COLORS.text }}>EARTHQUAKES HAPPEN?</div>
      </div>
    </div>
  );
};

const QuakeTag: React.FC<{ t: number }> = ( { t } ) => {
  const o = progressAt( t * FPS, 49 * FPS, 10 ) * win( t, 49, 52.2, 0.2 );
  if ( o <= 0.01 ) {
    return null;
  }
  return (
    <div style={{ position: 'absolute', left: 72, top: 250, opacity: o }}>
      <div style={{ ...TYPE.tag, background: COLORS.red, color: COLORS.text, padding: '14px 28px', display: 'inline-block' }}>EARTHQUAKE</div>
    </div>
  );
};

export const Captions: React.FC<{ t: number; captions: { text: string; start: number; end: number }[] }> = ( { t, captions } ) => {
  const c = captions.find( x => t >= x.start && t < x.end );
  if ( !c ) {
    return null;
  }
  return (
    <div style={{ position: 'absolute', left: 72, width: 858, top: 1330, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          fontFamily: FONT.ui, fontWeight: 700, fontSize: 46, lineHeight: 1.2, textAlign: 'center', color: COLORS.text,
          background: 'rgba(7, 11, 20, 0.78)', padding: '12px 24px', borderRadius: 12, textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)'
        }}
      >
        {c.text}
      </div>
    </div>
  );
};

// ---------- closing CTA ----------

const THUMB = 'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z';
const BELL = 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z';

export const Cta: React.FC<{ frame: number; start?: number }> = ( { frame, start = 52 } ) => {
  const local = frame - start * FPS;
  if ( local < 0 ) {
    return null;
  }
  const part = ( p: 'glyph' | 'name' | 'rule' | 'tagline' ): React.CSSProperties => {
    switch ( p ) {
      case 'glyph': return wipeIn( local, 22, 14 );
      case 'name': return slideUp( local, 30, 30 );
      case 'rule': return { transform: `scaleX(${progressAt( local, 38, 10 )})` };
      case 'tagline': return slideUp( local, 44, 20 );
    }
  };
  const pill = ( start: number, bg: string, border: string ): React.CSSProperties => ( {
    ...slideUp( local, start, 30 ), display: 'flex', alignItems: 'center', gap: 16, padding: '18px 34px', borderRadius: 60, background: bg, border: `3px solid ${border}`
  } );
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: COLORS.background, opacity: interpolate( local, [ 0, 28 ], [ 0, 1 ], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } ) }} />
      <div style={{ position: 'absolute', left: 0, width: 1080, top: 330, display: 'flex', justifyContent: 'center' }}>
        <Wordmark partStyle={part} fontSize={100} />
      </div>
      <div style={{ position: 'absolute', left: 0, width: 1080, top: 1010, display: 'flex', justifyContent: 'center', gap: 28 }}>
        <div style={pill( 62, 'rgba(244, 246, 250, 0.1)', COLORS.text )}>
          <svg width={52} height={52} viewBox="0 0 24 24"><path d={THUMB} fill={COLORS.text} /></svg>
          <span style={{ ...TYPE.tag, color: COLORS.text }}>LIKE</span>
        </div>
        <div style={pill( 74, COLORS.red, COLORS.red )}>
          <svg width={52} height={52} viewBox="0 0 24 24"><path d={BELL} fill={COLORS.text} /></svg>
          <span style={{ ...TYPE.tag, color: COLORS.text }}>SUBSCRIBE</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, width: 1080, top: 1190, textAlign: 'center', ...TYPE.kicker, color: COLORS.textSupport, ...fadeIn( local, 90 ) }}>
        MORE EARTHQUAKE SCIENCE
      </div>
    </AbsoluteFill>
  );
};

/** Narration clips, ducked music and synthesized rumble/impact effects timed to the model's events (tremor, rupture, wave arrival). */
const EduAudioLayers: React.FC<{ audio: EduAudio }> = ( { audio } ) => {
  const { durationInFrames } = useVideoConfig();
  const span = { narrationStart: audio.narrationStart, narrationDuration: audio.narrationEnd - audio.narrationStart };
  const total = durationInFrames / FPS;
  const tremor = 0.3;
  const quake = EVENTS.rupture;
  const surface = arrival( 0, VP );
  const at = ( seconds: number ) => Math.round( seconds * FPS );
  return (
    <>
      <Audio src={staticFile( audio.musicFile )} volume={f => musicGain( f / FPS, span, total )} />
      {audio.clips.map( clip => (
        <Sequence key={clip.id} from={at( clip.start )} layout="none">
          <Audio src={staticFile( clip.file )} volume={clip.gain ?? 1} />
        </Sequence>
      ) )}
      <Sequence from={at( tremor )} durationInFrames={at( 4.8 )} layout="none">
        <Audio src={staticFile( SFX_FILES.rumble )} volume={f => 0.38 * smooth( ( f / FPS ) / 0.6 ) * ( 1 - smooth( ( f / FPS - 2.7 ) / 1.6 ) )} />
      </Sequence>
      <Sequence from={at( quake )} durationInFrames={at( 3 )} layout="none">
        <Audio src={staticFile( SFX_FILES.boom )} volume={0.8} />
      </Sequence>
      <Sequence from={at( quake )} durationInFrames={at( 11 )} layout="none">
        <Audio src={staticFile( SFX_FILES.rumble )} volume={f => 0.42 * Math.exp( -( f / FPS ) / 4 ) * Math.min( 1, f / 6 )} />
      </Sequence>
      <Sequence from={at( surface )} durationInFrames={at( 12 )} layout="none">
        <Audio
          src={staticFile( SFX_FILES.rumble )}
          volume={f => {
            const t = surface + f / FPS;
            const s = EVENTS.rupture + Math.hypot( FOCUS.x, FOCUS.y ) / VS;
            return ( 0.1 * smooth( ( t - surface ) / 1 ) + 0.4 * smooth( ( t - s + 0.3 ) / 0.8 ) * Math.exp( -Math.max( 0, t - s - 0.8 ) / 3.5 ) ) * ( 1 - smooth( ( t - 51 ) / 2 ) );
          }}
        />
      </Sequence>
    </>
  );
};

export const scienceShortSchema = z.object( { audio: eduAudioSchema.optional() } );
export type ScienceShortProps = z.infer<typeof scienceShortSchema>;

/** Storyboard length, extended when the natural narration needs more time. */
export const calculateScienceShortMetadata: CalculateMetadataFunction<ScienceShortProps> = ( { props } ) => ( {
  durationInFrames: props.audio ? videoSeconds( props.audio.narrationEnd ) * FPS : TOTAL_FRAMES
} );

export const ScienceShort: React.FC<ScienceShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <World t={t} />
      <Overlays t={t} />
      <Title t={t} />
      <QuakeTag t={t} />
      <Cta frame={frame} />
      <Captions t={t} captions={audio?.captions ?? CAPTIONS} />
      {audio ? <EduAudioLayers audio={audio} /> : null}
    </AbsoluteFill>
  );
};
