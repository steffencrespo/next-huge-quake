/**
 * "Can a Skyscraper Trigger an Earthquake?" (Taipei 101), series "Can This Cause an Earthquake?" episode 1. Five AI stills generated manually
 * by the owner (full bleed, Ken Burns moves, small "AI VISUALIZATION" mark), with every number and scientific label drawn here, never baked into
 * an image: hook (AI-1), scale and seismicity (AI-2, or AI-1 again), cutaway with the two felt earthquakes (AI-3), the inferred fault (AI-4),
 * the twist and "POSSIBLE. NOT PROVEN." (AI-5). Timing follows the narration beats. Missing stills render as labelled placeholders, never as
 * substitutes. Same building blocks as the SF 1906 cinematic (Shot, scrim, shake, Headline, Captions, Layers).
 */
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { z } from 'zod';
import { COLORS, FONT } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { FPS, Layers, eduShortSchema } from '../../src/edu/EduShort.js';
import type { SfxCue } from '../../src/edu/EduShort.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { beatsFor, placeholderCaptions } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { Txt, at, clamp, f1, lerp, prog, vis, within } from '../../src/edu/kit.js';
import { Epicenter } from '../../src/historic/kit.js';
import { ASSETS } from './assets.js';
import type { AssetKey } from './assets.js';
import { TAIPEI101 } from './script.js';

export const taipei101Schema = eduShortSchema.extend( { present: z.array( z.string() ) } );
export type Taipei101Props = z.infer<typeof taipei101Schema>;

export const META = TAIPEI101;
const TAIL = META.tailSeconds ?? 1.8;
export const AMBER = '#f2b347';
export const ICE = '#9fe3ff';

export const calculateTaipei101Metadata: CalculateMetadataFunction<Taipei101Props> = ( { props } ) => {
  const b = beatsFor( META, props.audio );
  return { durationInFrames: Math.ceil( ( b.end.end + TAIL ) * FPS ) };
};

// ---------- helpers (as in the SF 1906 cinematic) ----------

type Kb = { s: [ number, number ]; x: [ number, number ]; y: [ number, number ] };
const SCRIM = 'linear-gradient(180deg, rgba(4,8,14,0.62) 0%, rgba(4,8,14,0) 28%, rgba(4,8,14,0) 58%, rgba(4,8,14,0.74) 100%)';
const kbAt = ( kb: Kb, u: number ) => ( { s: lerp( kb.s[0], kb.s[1], u ), x: lerp( kb.x[0], kb.x[1], u ), y: lerp( kb.y[0], kb.y[1], u ) } );
/** Deterministic handheld shake, amplitude in px. */
const shake = ( t: number, amp: number ): [ number, number ] => [ amp * ( Math.sin( t * 37.1 ) + 0.6 * Math.sin( t * 61.7 + 1.3 ) ), amp * ( Math.cos( t * 41.3 ) + 0.5 * Math.sin( t * 73.9 + 0.7 ) ) ];
/** Ease in-out cubic for camera moves (faster than linear in the middle: the hook's push up). */
const ease = ( u: number ) => ( u < 0.5 ? 4 * u * u * u : 1 - ( -2 * u + 2 ) ** 3 / 2 );
/** Gentler ease in-out (sine) for long moves over detailed stills, where a cubic peak would judder. */
const easeSoft = ( u: number ) => 0.5 - 0.5 * Math.cos( Math.PI * u );
/** Ease out (cubic): moves from the first frame and settles, for a hook that has to grab at once. */
const easeOut = ( u: number ) => 1 - ( 1 - u ) ** 3;
export type Cam = { from: number; to: number; moveTo?: number; kb: Kb; amp?: ( t: number ) => number; easeMove?: boolean | 'soft' | 'out' };
/** Ken Burns transform of a shot at time t, shake included. */
export const camAt = ( c: Cam, t: number ) => {
  const u = clamp( ( t - c.from ) / ( ( c.moveTo ?? c.to ) - c.from ) );
  const m = kbAt( c.kb, c.easeMove === 'soft' ? easeSoft( u ) : c.easeMove === 'out' ? easeOut( u ) : c.easeMove ? ease( u ) : u );
  const [ jx, jy ] = shake( t, c.amp ? c.amp( t ) : 0 );
  return { s: m.s, x: m.x + jx, y: m.y + jy };
};
/** Where a point of the still (1080×1920 cover coordinates = source px × 1.5) lands on screen, so overlays stay pinned to the image. */
export const pin = ( m: { s: number; x: number; y: number }, px: number, py: number ): [ number, number ] => [ 540 + ( px - 540 ) * m.s + m.x, 960 + ( py - 960 ) * m.s + m.y ];

const Placeholder: React.FC<{ label: string }> = ( { label } ) => (
  <AbsoluteFill style={{ background: 'linear-gradient(180deg,#0e1a24,#05080c)', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ border: '4px dashed rgba(159,227,255,0.5)', padding: '28px 40px', fontFamily: FONT.ui, fontWeight: 700, fontSize: 40, color: ICE, textAlign: 'center', opacity: 0.8 }}>{label}<br /><span style={{ fontSize: 28, fontWeight: 600 }}>placeholder · owner generates in ElevenLabs</span></div>
  </AbsoluteFill>
);

/** Full-bleed still with a Ken Burns move between `from` and `to` (or `moveTo`). */
export const Shot: React.FC<Cam & { k: AssetKey; present: string[]; t: number; brightness?: number; fadeIn?: number; fadeOut?: number }> = (
  { k, present, t, brightness, fadeIn = 0.3, fadeOut = 0.3, ...c }
) => {
  const { from, to } = c;
  const o = clamp( fadeIn > 0 ? ( t - from ) / fadeIn : t >= from ? 1 : 0 ) * clamp( fadeOut > 0 ? ( to - t ) / fadeOut : t < to ? 1 : 0 );
  if ( o <= 0 ) return null;
  const a = ASSETS[k];
  const m = camAt( c, t );
  return (
    <AbsoluteFill style={{ opacity: o, overflow: 'hidden', background: '#04080e' }}>
      {present.includes( a.id ) ? (
        <Img src={staticFile( a.staged )} style={{ width: 1080, height: 1920, objectFit: 'cover', transform: `translate(${f1( m.x )}px, ${f1( m.y )}px) scale(${m.s.toFixed( 4 )})`, filter: brightness ? `brightness(${brightness})` : undefined }} />
      ) : <Placeholder label={`${a.id} · ${a.scene}`} />}
      <AbsoluteFill style={{ background: SCRIM }} />
    </AbsoluteFill>
  );
};

/** Big on-screen line, kept above the caption band (captions sit at y 1330-1480). */
export const Headline: React.FC<{ text: React.ReactNode; y: number; o: number; size?: number; color?: string; x?: number; w?: number }> = ( { text, y, o, size = 96, color = COLORS.text, x = 60, w = 960 } ) => (
  o <= 0 ? null : <div style={{ position: 'absolute', left: x, width: w, top: y, textAlign: 'center', fontFamily: FONT.display, fontWeight: 800, fontSize: size, lineHeight: 1.02, textTransform: 'uppercase', color, opacity: o, textShadow: '0 4px 24px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)', transform: `scale(${lerp( 1.08, 1, clamp( o ) ).toFixed( 3 )})` }}>{text}</div>
);

/** Small label with a hairline rule, for scientific annotations over the stills. */
export const Note: React.FC<{ text: string; x: number; y: number; o: number; color?: string; size?: number; align?: 'left' | 'right'; maxWidth?: number }> = ( { text, x, y, o, color = COLORS.text, size = 30, align = 'left', maxWidth } ) => (
  o <= 0 ? null : (
    <div style={{ position: 'absolute', top: y, ...( align === 'left' ? { left: x } : { right: x } ), maxWidth, textAlign: align, lineHeight: 1.3, opacity: o, fontFamily: FONT.ui, fontWeight: 700, fontSize: size, letterSpacing: 2, color, textTransform: 'uppercase', textShadow: '0 2px 12px rgba(0,0,0,0.9)', padding: '8px 16px', background: 'rgba(4,8,14,0.55)', borderLeft: align === 'left' ? `4px solid ${color}` : undefined, borderRight: align === 'right' ? `4px solid ${color}` : undefined }}>{text}</div>
  )
);

// ---------- scientific overlays ----------

/** Downward load on the foundation: chevrons that slide down under the tower (illustrative). */
export const Load: React.FC<{ t: number; o: number; x: number; y: number; s: number }> = ( { t, o, x, y, s } ) => (
  o <= 0 ? null : (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: o }}>
      {[ 0, 1, 2 ].map( i => {
        const p = ( ( t * 0.9 + i / 3 ) % 1 );
        const yy = y + p * 120 * s;
        return <path key={i} d={`M${f1( x - 60 * s )},${f1( yy )} L${f1( x )},${f1( yy + 34 * s )} L${f1( x + 60 * s )},${f1( yy )}`} fill="none" stroke={AMBER} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={0.85 * Math.sin( p * Math.PI )} />;
      } )}
    </svg>
  )
);

/** AI-3 camera: tilt down from the tower into the bedrock, arriving just before the first quake. */
const cam3 = ( b: Beats, amp: ( t: number ) => number ): Cam => ( { from: scenes( b ).scaleTo, to: scenes( b ).cutTo + 0.15, moveTo: within( b, 'mags', 0.08 ), kb: { s: [ 1.15, 1.42 ], x: [ 0, 0 ], y: [ 140, -400 ] }, amp, easeMove: 'soft' } );
/** Foundation of AI-3 (top of the pile group), in still coordinates. */
export const PILES = { x: 540, y: 885 };
/** Felt earthquake markers in the AI-3 bedrock, in still coordinates; schematic (not to scale), offset from the pile group. */
export const QUAKES = [ { x: 345, y: 1462, label: 'ML 3.8 · OCT 2004' }, { x: 735, y: 1432, label: 'ML 3.2 · MAR 2005' } ] as const;

/** AI-4 camera: a slow push toward the fault seam. */
const cam4 = ( b: Beats ): Cam => ( { from: scenes( b ).cutTo, to: scenes( b ).faultTo + 0.15, kb: { s: [ 1.05, 1.22 ], x: [ 0, -60 ], y: [ 0, 0 ] } } );
/** The seam in AI-4 (upper left to lower right), in still coordinates. */
export const SEAM: [ number, number ][] = [ [ 90, 225 ], [ 255, 450 ], [ 450, 690 ], [ 630, 900 ], [ 720, 1050 ], [ 840, 1245 ], [ 960, 1410 ], [ 1050, 1515 ] ];
/** Point at fraction f of a polyline's length. */
export const along = ( pts: [ number, number ][], f: number ): [ number, number ] => {
  const seg = pts.slice( 1 ).map( ( p, i ) => Math.hypot( p[0] - pts[i][0], p[1] - pts[i][1] ) );
  let d = clamp( f ) * seg.reduce( ( x, y ) => x + y, 0 );
  for ( let i = 0; i < seg.length; i++ ) {
    if ( d <= seg[i] || i === seg.length - 1 ) {
      const u = clamp( d / seg[i] );
      return [ lerp( pts[i][0], pts[i + 1][0], u ), lerp( pts[i][1], pts[i + 1][1], u ) ];
    }
    d -= seg[i];
  }
  return pts[pts.length - 1];
};

/** The inferred fault on AI-4: a dashed trace drawn along the seam, then a slow stress pulse travelling down it; no rupture. */
export const FaultTrace: React.FC<{ t: number; o: number; from: number; m: { s: number; x: number; y: number } }> = ( { t, o, from, m } ) => {
  if ( o <= 0 ) return null;
  const drawn = clamp( ( t - from ) / 1.2 );
  const n = 40;
  const pts = Array.from( { length: n + 1 }, ( _, i ) => pin( m, ...along( SEAM, drawn * i / n ) ) );
  const p = ( ( t - from - 0.6 ) * 0.45 ) % 1;
  const [ cx, cy ] = pin( m, ...along( SEAM, 0.1 + 0.8 * Math.max( 0, p ) ) );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: o }}>
      <defs>
        <radialGradient id="fp"><stop offset="0" stopColor={AMBER} stopOpacity={0.6} /><stop offset="1" stopColor={AMBER} stopOpacity={0} /></radialGradient>
      </defs>
      <polyline points={pts.map( q => `${f1( q[0] )},${f1( q[1] )}` ).join( ' ' )} fill="none" stroke={AMBER} strokeWidth={5} strokeDasharray="18 14" strokeLinecap="round" opacity={0.75} />
      {t > from + 0.6 ? <circle cx={f1( cx )} cy={f1( cy )} r={140} fill="url(#fp)" opacity={Math.sin( Math.max( 0, p ) * Math.PI )} /> : null}
    </svg>
  );
};

// ---------- timeline ----------

/** Scene windows from the narration beats. */
export const scenes = ( b: Beats ) => ( {
  heroTo: within( b, 'taiwan', 0.62 ),
  scaleTo: b.two.start + 0.1,
  cutTo: b.fault.start + 0.1,
  faultTo: b.catch.start + 0.05
} );

/** Shaking: a subtle tremor as the hook turns toward the ground, and a short jolt on each felt earthquake. */
export const quake = ( b: Beats ) => ( t: number ) => {
  const hook = 5 * prog( t, within( b, 'hook', 0.6 ), 0.3 ) * ( 1 - prog( t, b.taiwan.start + 0.2, 0.6 ) );
  const beneath = 4 * prog( t, within( b, 'taiwan', 0.78 ), 0.2 ) * ( 1 - prog( t, b.taiwan.end, 0.5 ) );
  const jolt = ( t0: number, a: number ) => a * prog( t, t0, 0.08 ) * Math.exp( -Math.max( 0, t - t0 - 0.1 ) / 0.45 );
  return hook + beneath + jolt( quakeAt( b, 0 ), 12 ) + jolt( quakeAt( b, 1 ), 8 );
};
export const quakeAt = ( b: Beats, i: number ) => ( i === 0 ? within( b, 'mags', 0.12 ) : within( b, 'mags', 0.62 ) );

export const cues = ( b: Beats ): SfxCue[] => [
  { sfx: 'riser', at: 0, dur: 1.6, volume: 0.22 },
  { sfx: 'boom', at: within( b, 'hook', 0.6 ), dur: 2.5, volume: 0.4 },
  { sfx: 'rumble', at: within( b, 'hook', 0.6 ), dur: 3, volume: x => 0.22 * Math.min( 1, x / 0.3 ) * ( 1 - clamp( ( x - 2.2 ) / 0.8 ) ) },
  { sfx: 'rumble', at: within( b, 'taiwan', 0.75 ), dur: 2, volume: 0.16 },
  { sfx: 'whoosh', at: scenes( b ).heroTo - 0.2, dur: 1.2, volume: 0.25 },
  { sfx: 'whoosh', at: scenes( b ).scaleTo - 0.25, dur: 1.2, volume: 0.28 },
  { sfx: 'boom', at: quakeAt( b, 0 ), dur: 2.5, volume: 0.5 },
  { sfx: 'rumble', at: quakeAt( b, 0 ), dur: 2.2, volume: x => 0.3 * Math.exp( -x / 0.9 ) },
  { sfx: 'boom', at: quakeAt( b, 1 ), dur: 2.5, volume: 0.38 },
  { sfx: 'whoosh', at: scenes( b ).cutTo - 0.25, dur: 1.2, volume: 0.25 },
  { sfx: 'rumble', at: b.fault.start, dur: 7, volume: x => 0.14 * Math.min( 1, x / 1.2 ) * ( 1 - clamp( ( x - 6 ) / 1 ) ) },
  { sfx: 'riser', at: at( b, 'catch', -1.4 ), dur: 1.5, volume: 0.22 },
  { sfx: 'tick', at: at( b, 'proof', 0.5 ), dur: 0.3, volume: 0.4 },
  { sfx: 'whoosh', at: at( b, 'q', -0.2 ), dur: 1.2, volume: 0.2 },
  { sfx: 'boom', at: at( b, 'end', 0.05 ), dur: 2.5, volume: 0.3 },
  { sfx: 'tick', at: within( b, 'end', 0.55 ), dur: 0.3, volume: 0.4 }
];

export const Taipei101Cinematic: React.FC<Taipei101Props> = ( { audio, present } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( META, audio );
  const s = scenes( b );
  const amp = quake( b );
  const hasScale = present.includes( ASSETS.ai2.id );
  const c3 = cam3( b, amp ), m3 = camAt( c3, t );
  const c4 = cam4( b ), m4 = camAt( c4, t );
  const [ lx, ly ] = pin( m3, PILES.x, PILES.y );
  /** Right-hand column over the dark sky of AI-5 (the tower stands on the left). */
  const R = { x: 400, w: 640 };
  return (
    <AbsoluteFill style={{ background: '#04080e' }}>
      {/* Hook: an eased tilt from the spire down to the base, then a tremor as the narration says "beneath". */}
      <Shot k="ai1" present={present} t={t} from={0} to={s.heroTo + 0.15} moveTo={b.taiwan.start} kb={{ s: [ 1.32, 1.1 ], x: [ 0, 0 ], y: [ 300, -40 ] }} amp={amp} fadeIn={0} easeMove />
      {/* The tower rose: AI-2 over the basin, or AI-1 again tilting up from the base to the spire. */}
      {hasScale
        ? <Shot k="ai2" present={present} t={t} from={s.heroTo} to={s.scaleTo + 0.15} kb={{ s: [ 1.04, 1.16 ], x: [ 0, 0 ], y: [ 10, -30 ] }} />
        : <Shot k="ai1" present={present} t={t} from={s.heroTo} to={s.scaleTo + 0.15} kb={{ s: [ 1.3, 1.24 ], x: [ 0, 0 ], y: [ -270, 250 ] }} brightness={0.8} easeMove />}
      {/* Two earthquakes: the cutaway tilts down from the tower into the bedrock; a jolt on each. */}
      <Shot k="ai3" present={present} t={t} {...c3} />
      <Load t={t} o={vis( t, b.two.start + 0.3, b.two.end, 0.3 )} x={lx} y={ly} s={m3.s} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        {QUAKES.map( ( q, i ) => {
          const [ x, y ] = pin( m3, q.x, q.y );
          return <Epicenter key={q.label} x={x} y={y} t={t} r={14} opacity={vis( t, quakeAt( b, i ), s.cutTo, 0.15 )} />;
        } )}
      </svg>
      <Note text={QUAKES[0].label} x={72} y={1150} o={vis( t, quakeAt( b, 0 ) + 0.1, s.cutTo, 0.25 )} color={COLORS.redHot} />
      <Note text={QUAKES[1].label} x={72} y={1060} align="right" o={vis( t, quakeAt( b, 1 ) + 0.1, s.cutTo, 0.25 )} color={AMBER} />
      <Note text="≈10 km deep · not to scale" x={72} y={990} o={vis( t, within( b, 'mags', 0.75 ), s.cutTo, 0.3 )} color={COLORS.textSupport} size={24} />
      {/* The hidden fault: inferred, a stress pulse along it, no rupture. */}
      <Shot k="ai4" present={present} t={t} {...c4} />
      <FaultTrace t={t} o={vis( t, b.fault.start + 0.3, s.faultTo, 0.4 )} from={b.fault.start + 0.3} m={m4} />
      {/* Twist and ending: the night hero, a slow pull-back to the last frame. */}
      <Shot k="ai5" present={present} t={t} from={s.faultTo} to={total + 1} moveTo={total} kb={{ s: [ 1.22, 1.04 ], x: [ 0, 0 ], y: [ -50, 0 ] }} fadeIn={0.2} fadeOut={0} />
      <AbsoluteFill style={{ background: 'rgba(4,8,14,0.3)', opacity: vis( t, b.end.start, total + 1, 0.4 ) }} />

      {/* Hook titles */}
      <Headline text="Can a building" y={360} o={vis( t, 0.15, s.heroTo - 0.1, 0.15 )} size={96} />
      <Headline text="trigger an earthquake?" y={470} o={vis( t, within( b, 'hook', 0.35 ), s.heroTo - 0.1, 0.15 )} size={96} color={AMBER} />
      <Note text="Taipei 101 · Taiwan" x={72} y={640} o={vis( t, b.taiwan.start + 0.2, s.heroTo - 0.1, 0.3 )} color={ICE} />
      {/* Scale and seismicity */}
      <Headline text="508 m" y={330} o={vis( t, s.heroTo + 0.1, s.scaleTo, 0.25 )} size={130} />
      <Headline text="≈700,000 tonnes" y={480} o={vis( t, b.rose.start + 0.2, s.scaleTo, 0.25 )} size={80} color={AMBER} />
      <Note text="Local quakes ↑ after completion · Lin, GRL 2005" x={72} y={620} o={vis( t, within( b, 'rose', 0.5 ), s.scaleTo, 0.3 )} color={ICE} size={26} />
      {/* Two earthquakes */}
      <Headline text="Two felt earthquakes" y={300} o={vis( t, b.two.start + 0.15, s.cutTo, 0.25 )} size={80} />
      {/* The hidden fault and the hypothesis */}
      <Headline text="Hidden fault" y={300} o={vis( t, b.fault.start + 0.15, s.faultTo, 0.25 )} size={110} color={AMBER} />
      <Note text="Blind normal fault · inferred from quake data" x={72} y={440} align="right" o={vis( t, within( b, 'fault', 0.4 ), s.faultTo, 0.3 )} color={ICE} size={26} />
      <Note text="Tower load: +4.7 bar at the foundation (est.)" x={72} y={510} align="right" o={vis( t, b.weight.start + 0.3, s.faultTo, 0.3 )} color={AMBER} size={26} />
      <Headline text="Hypothesis" y={1150} o={vis( t, within( b, 'weight', 0.45 ), s.faultTo, 0.25 )} size={84} color={COLORS.text} />
      {/* The twist, in the dark sky to the right of the tower */}
      <Headline text="But…" y={380} o={vis( t, b.catch.start + 0.05, b.proof.start, 0.15 )} size={150} {...R} />
      <Headline text="Not proven" y={340} o={vis( t, within( b, 'proof', 0.4 ), b.q.start, 0.2 )} size={120} color={COLORS.redHot} {...R} />
      <Note text="Quakes ≈10 km deep · the load fades with depth" x={60} y={620} align="right" maxWidth={600} o={vis( t, within( b, 'proof', 0.55 ), b.q.start, 0.25 )} color={COLORS.textSupport} size={26} />
      <Headline text={<>Can a skyscraper <span style={{ color: AMBER }}>trigger an earthquake?</span></>} y={340} o={vis( t, b.q.start + 0.05, b.end.start, 0.2 )} size={84} {...R} />
      {/* Closing frame */}
      <Headline text="Possible." y={360} o={vis( t, b.end.start + 0.05, total + 1, 0.2 )} size={118} color={AMBER} {...R} />
      <Headline text="Not proven." y={500} o={vis( t, within( b, 'end', 0.5 ), total + 1, 0.2 )} size={118} {...R} />

      {/* Series kicker and the AI mark (every image in this episode is synthetic). */}
      <div style={{ position: 'absolute', left: 72, top: 196, fontFamily: FONT.display, fontWeight: 800, fontSize: 28, letterSpacing: 3, color: ICE, opacity: 0.9 * vis( t, 0.2, b.catch.start, 0.4 ) }}>CAN THIS CAUSE AN EARTHQUAKE?</div>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Txt x={1008} y={262} size={20} weight={700} spacing={3} anchor="end" color={COLORS.text} opacity={0.5}>AI VISUALIZATION</Txt>
      </svg>

      <Captions t={t} captions={audio?.captions ?? placeholderCaptions( META.script )} />
      {audio ? <Layers audio={audio} cues={cues( b )} total={total} /> : null}
    </AbsoluteFill>
  );
};
