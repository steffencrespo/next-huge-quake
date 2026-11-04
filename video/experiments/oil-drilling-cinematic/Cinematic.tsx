/**
 * "We're Triggering Earthquakes. And We Know How." (oil fields and wastewater injection), series "Can This Cause an Earthquake?" episode 2. AI stills
 * generated manually by the owner (full bleed, Ken Burns moves, small "AI VISUALIZATION" mark while one is on screen), with every number and
 * scientific label drawn here: hook on the oil field (AI-1), injection cutaway (AI-2), pressure and slip on a pre-existing fault (AI-3), the real
 * Pawnee epicenter on a Natural Earth map (no AI image is presented as Pawnee), the evidence over a generic plains landscape (AI-4), the twist, and the
 * ending (AI-5, or AI-1 again). Timing follows the narration beats. Missing stills render as labelled placeholders, never as substitutes.
 * Same building blocks as the Taipei 101 episode (camAt, pin, Headline, Note, Captions, Layers); that episode is imported, not changed.
 */
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
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
import { LiveMap } from '../../src/map/LiveMap.js';
import type { MapCamera } from '../../src/map/LiveMap.js';
import { localStyle } from '../../src/spike/styles.js';
import { AMBER, Headline, ICE, Note, along, camAt, pin } from '../taipei101-cinematic/Cinematic.js';
import type { Cam } from '../taipei101-cinematic/Cinematic.js';
import { ASSETS } from './assets.js';
import type { AssetKey } from './assets.js';
import { OIL_DRILLING, PAWNEE_EVENT } from './script.js';

export const oilDrillingSchema = eduShortSchema.extend( { present: z.array( z.string() ) } );
export type OilDrillingProps = z.infer<typeof oilDrillingSchema>;

export const META = OIL_DRILLING;
const TAIL = META.tailSeconds ?? 1.8;

export const calculateOilDrillingMetadata: CalculateMetadataFunction<OilDrillingProps> = ( { props } ) => {
  const b = beatsFor( META, props.audio );
  return { durationInFrames: Math.ceil( ( b.end.end + TAIL ) * FPS ) };
};

const SCRIM = 'linear-gradient(180deg, rgba(4,8,14,0.62) 0%, rgba(4,8,14,0) 28%, rgba(4,8,14,0) 58%, rgba(4,8,14,0.74) 100%)';

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

// ---------- scientific overlays (pinned to the real stills; coordinates are 1080×1920 cover = source px × 1.5) ----------

/** The well in AI-2, surface to perforations, and the disposal formation it feeds. */
const WELL = { x: 370, top: 330, bottom: 1400, formationY: 1478 };

/** Wastewater going down the well (chevrons), then pressure spreading sideways through the disposal formation; schematic. */
export const Injection: React.FC<{ t: number; o: number; m: { s: number; x: number; y: number }; spread: number }> = ( { t, o, m, spread } ) => {
  if ( o <= 0 ) return null;
  const [ x, top ] = pin( m, WELL.x, WELL.top );
  const [ , bottom ] = pin( m, WELL.x, WELL.bottom );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: o }}>
      {[ 0, 1, 2, 3, 4, 5 ].map( i => {
        const p = ( t * 0.55 + i / 6 ) % 1;
        const y = lerp( top, bottom, p ), w = 26 * m.s;
        return <path key={i} d={`M${f1( x - w )},${f1( y )} L${f1( x )},${f1( y + w * 0.7 )} L${f1( x + w )},${f1( y )}`} fill="none" stroke={ICE} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={0.9 * Math.sin( p * Math.PI )} />;
      } )}
      {[ 0, 1, 2 ].map( i => {
        const p = ( t * 0.5 + i / 3 ) % 1;
        const r = lerp( 30, 60 + 320 * spread, p ) * m.s;
        return <ellipse key={i} cx={f1( x )} cy={f1( pin( m, WELL.x, WELL.formationY )[1] )} rx={f1( r )} ry={f1( r * 0.17 )} fill="none" stroke={AMBER} strokeWidth={5} opacity={0.75 * ( 1 - p ) * clamp( spread * 3 )} />;
      } )}
    </svg>
  );
};

/** The pre-existing fault in AI-3, upper left to lower right. */
const SEAM: [ number, number ][] = [ [ 322, 495 ], [ 450, 720 ], [ 555, 930 ], [ 660, 1080 ], [ 780, 1275 ], [ 855, 1470 ] ];
/** Where the pressure fronts come from in AI-3: toward the injection interval, above the fault. */
const PRESSURE_FROM: [ number, number ] = [ 960, 330 ];

/** Pressure fronts reaching the fault, its trace, and at `slipAt` a brief opposed pair of arrows along it: schematic, the fault moves, not a plate. */
export const FaultPressure: React.FC<{ t: number; o: number; from: number; slipAt: number; m: { s: number; x: number; y: number } }> = ( { t, o, from, slipAt, m } ) => {
  if ( o <= 0 ) return null;
  const drawn = clamp( ( t - from ) / 1 );
  const pts = Array.from( { length: 41 }, ( _, i ) => pin( m, ...along( SEAM, drawn * i / 40 ) ) );
  const [ ox, oy ] = pin( m, ...PRESSURE_FROM );
  const slip = prog( t, slipAt, 0.14 );
  const [ cx, cy ] = pin( m, ...along( SEAM, 0.52 ) );
  const a = pin( m, ...along( SEAM, 0.4 ) ), z = pin( m, ...along( SEAM, 0.6 ) );
  const len = Math.hypot( z[0] - a[0], z[1] - a[1] ), dx = ( z[0] - a[0] ) / len, dy = ( z[1] - a[1] ) / len;
  const arrow = ( side: 1 | -1 ) => {
    // Normal offset from the fault; hanging wall (upper right) moves down-dip, footwall up-dip.
    const nx = -dy * side * 56, ny = dx * side * 56, dir = side === -1 ? 1 : -1, l = 94, shift = dir * 18 * slip;
    const x0 = cx + nx - dir * dx * l + dx * shift, y0 = cy + ny - dir * dy * l + dy * shift;
    const x1 = cx + nx + dir * dx * l + dx * shift, y1 = cy + ny + dir * dy * l + dy * shift;
    const hx = dir * dx, hy = dir * dy;
    return <path key={side} d={`M${f1( x0 )},${f1( y0 )} L${f1( x1 )},${f1( y1 )} M${f1( x1 - 28 * hx - 18 * hy )},${f1( y1 - 28 * hy + 18 * hx )} L${f1( x1 )},${f1( y1 )} L${f1( x1 - 28 * hx + 18 * hy )},${f1( y1 - 28 * hy - 18 * hx )}`} fill="none" stroke={COLORS.text} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" opacity={slip} />;
  };
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: o }}>
      {[ 0, 1, 2, 3 ].map( i => {
        const p = ( ( t - from ) * 0.42 + i / 4 ) % 1;
        return t < from ? null : <circle key={i} cx={f1( ox )} cy={f1( oy )} r={f1( lerp( 60, 760, p ) * m.s )} fill="none" stroke={AMBER} strokeWidth={6} opacity={0.42 * Math.sin( p * Math.PI ) * ( 1 - slip * 0.7 )} />;
      } )}
      <polyline points={pts.map( q => `${f1( q[0] )},${f1( q[1] )}` ).join( ' ' )} fill="none" stroke={slip > 0 ? COLORS.redHot : AMBER} strokeWidth={slip > 0 ? 8 : 5} strokeDasharray={slip > 0 ? undefined : '18 14'} strokeLinecap="round" opacity={0.85} />
      {slip > 0 ? [ arrow( -1 ), arrow( 1 ) ] : null}
    </svg>
  );
};

// ---------- the real place: a Natural Earth map, never an AI image ----------

const EPI: [ number, number ] = [ PAWNEE_EVENT.lon, PAWNEE_EVENT.lat ];
/** Town centers for orientation (gazetteer coordinates; Pawnee agrees with USGS's "14 km NW of Pawnee" for the epicenter). */
const PLACES: { name: string; at: [ number, number ]; dx: number; anchor: 'start' | 'end' }[] = [
  { name: 'Pawnee', at: [ -96.803, 36.338 ], dx: 34, anchor: 'start' },
  { name: 'Tulsa', at: [ -95.993, 36.154 ], dx: -18, anchor: 'end' },
  { name: 'Oklahoma City', at: [ -97.516, 35.468 ], dx: 18, anchor: 'start' }
];
const PAD = { top: 240, bottom: 560, left: 0, right: 0 };
const smooth = ( x: number ) => x * x * ( 3 - 2 * x );
const mapCamera = ( t: number, t0: number, t1: number, zoomEnd = 8 ): MapCamera => {
  const k = smooth( clamp( ( t - t0 ) / ( ( t1 - t0 ) * 0.72 ) ) );
  return { center: [ lerp( -96.5, EPI[0], k ), lerp( 37.5, EPI[1], k ) ], zoom: lerp( 3.7, zoomEnd, k ) + 0.12 * clamp( ( t - t0 ) / ( t1 - t0 ) ), bearing: 0, pitch: 0, padding: PAD };
};

// ---------- timeline ----------

export const scenes = ( b: Beats ) => ( {
  heroTo: b.pump.start + 0.1,
  cutTo: b.pressure.start + 0.05,
  mapFrom: b.pawnee.start - 0.1,
  mapTo: b.linked.start + 0.15,
  evidenceTo: b.wrong.start + 0.05,
  twistTo: b.after.start + 0.05,
  closeFrom: b.end.start
} );

export const slipAt = ( b: Beats ) => within( b, 'slip', 0.62 );
const mainshockAt = ( b: Beats ) => within( b, 'pawnee', 0.36 );

/** Shaking: a brief tremor on the hook, a jolt when the fault slips. Readable, never continuous. */
export const quake = ( b: Beats ) => ( t: number ) => {
  const hook = 6 * prog( t, within( b, 'hook', 0.5 ), 0.12 ) * Math.exp( -Math.max( 0, t - within( b, 'hook', 0.5 ) ) / 0.5 );
  const slip = 13 * prog( t, slipAt( b ), 0.06 ) * Math.exp( -Math.max( 0, t - slipAt( b ) ) / 0.42 );
  return hook + slip;
};

export const cues = ( b: Beats ): SfxCue[] => [
  { sfx: 'riser', at: 0, dur: 1.2, volume: 0.2 },
  { sfx: 'boom', at: within( b, 'hook', 0.5 ), dur: 2.5, volume: 0.42 },
  { sfx: 'rumble', at: within( b, 'hook', 0.5 ), dur: 2.4, volume: x => 0.2 * Math.min( 1, x / 0.3 ) * ( 1 - clamp( ( x - 1.7 ) / 0.7 ) ) },
  { sfx: 'tick', at: b.how.start, dur: 0.3, volume: 0.35 },
  { sfx: 'whoosh', at: scenes( b ).heroTo - 0.25, dur: 1.2, volume: 0.28 },
  { sfx: 'whoosh', at: scenes( b ).cutTo - 0.25, dur: 1.2, volume: 0.25 },
  { sfx: 'rumble', at: b.pressure.start, dur: 3.8, volume: x => 0.15 * Math.min( 1, x / 1.2 ) * ( 1 - clamp( ( x - 3.2 ) / 0.6 ) ) },
  { sfx: 'boom', at: slipAt( b ), dur: 2.5, volume: 0.5 },
  { sfx: 'rumble', at: slipAt( b ), dur: 2.2, volume: x => 0.3 * Math.exp( -x / 0.8 ) },
  { sfx: 'whoosh', at: scenes( b ).mapFrom - 0.2, dur: 1.2, volume: 0.25 },
  { sfx: 'boom', at: mainshockAt( b ), dur: 2.5, volume: 0.42 },
  { sfx: 'tick', at: within( b, 'pawnee', 0.6 ), dur: 0.3, volume: 0.35 },
  { sfx: 'whoosh', at: scenes( b ).mapTo - 0.25, dur: 1.2, volume: 0.22 },
  { sfx: 'riser', at: at( b, 'wrong', -0.6 ), dur: 1.3, volume: 0.2 },
  { sfx: 'tick', at: within( b, 'drill', 0.4 ), dur: 0.3, volume: 0.35 },
  { sfx: 'whoosh', at: scenes( b ).twistTo - 0.25, dur: 1.2, volume: 0.22 },
  { sfx: 'boom', at: at( b, 'end', 0.05 ), dur: 2.5, volume: 0.32 },
  { sfx: 'tick', at: within( b, 'end', 0.55 ), dur: 0.3, volume: 0.35 }
];

/** Text on the map, with a dark halo. */
const Label: React.FC<{ x: number; y: number; size: number; children: React.ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end'; o?: number; display?: boolean }> = ( { x, y, size, children, color = COLORS.text, anchor = 'start', o = 1, display } ) => (
  <text x={x} y={y} textAnchor={anchor} opacity={o} fontFamily={display ? FONT.display : FONT.ui} fontWeight={800} fontSize={size} letterSpacing={display ? 1 : 2} fill={color} stroke="#070B14" strokeWidth={size * 0.16} strokeLinejoin="round" paintOrder="stroke">{children}</text>
);

/** The epicenter on the map: places appear as the camera arrives, then the real marker, magnitude and date. */
export const PawneeMap: React.FC<{ b: Beats; from: number; to: number; zoomEnd?: number }> = ( { b, from, to, zoomEnd } ) => {
  const f0 = Math.round( from * FPS );
  return (
    <LiveMap
      cameraAt={f => mapCamera( ( f + f0 ) / FPS, from, to, zoomEnd )} epicenter={EPI} tiles="local" style={() => localStyle()} trackPoints={PLACES.map( p => p.at )}
      diagnostics={{ event: PAWNEE_EVENT.id, tiles: 'local' }} background={COLORS.background}
      overlay={( marker, frame, tracked ) => {
        const t = ( frame + f0 ) / FPS;
        const hit = mainshockAt( b ), k = prog( t, hit, 0.2 ), names = vis( t, hit - 0.5, to + 1, 0.4 );
        return (
          <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
            {PLACES.map( ( p, i ) => tracked?.[i] ? (
              <g key={p.name} opacity={names}>
                <circle cx={tracked[i].x} cy={tracked[i].y} r={7} fill={COLORS.text} stroke="#070B14" strokeWidth={3} />
                <Label x={tracked[i].x + p.dx} y={tracked[i].y + 11} size={32} anchor={p.anchor} color={i === 0 ? COLORS.text : COLORS.textSupport}>{p.name}</Label>
              </g>
            ) : null )}
            {k > 0 ? <Epicenter x={marker.x} y={marker.y} t={t} r={18} opacity={k} /> : null}
          </svg>
        );
      }}
    />
  );
};

export const OilDrillingCinematic: React.FC<OilDrillingProps> = ( { audio, present } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( META, audio );
  const s = scenes( b );
  const amp = quake( b );
  const hasClosing = present.includes( ASSETS.ai5.id );
  const c2: Cam = { from: s.heroTo, to: s.cutTo + 0.15, kb: { s: [ 1.1, 1.5 ], x: [ 40, 120 ], y: [ 90, -451 ] }, easeMove: 'soft' };
  const c2b: Cam = { from: s.twistTo, to: s.closeFrom + 0.15, kb: { s: [ 1.62, 1.72 ], x: [ 190, 200 ], y: [ -590, -670 ] }, easeMove: 'soft' };
  const c3: Cam = { from: s.cutTo, to: s.mapFrom + 0.2, kb: { s: [ 1.05, 1.2 ], x: [ 0, -30 ], y: [ 0, -30 ] }, amp, easeMove: 'soft' };
  const m2 = camAt( c2, t ), m2b = camAt( c2b, t ), m3 = camAt( c3, t );
  const onMap = t >= s.mapFrom + 0.3 && t < s.mapTo - 0.3;
  const mapFrom = Math.round( s.mapFrom * FPS );
  return (
    <AbsoluteFill style={{ background: '#04080e' }}>
      {/* Hook: from the storm sky down onto the pumpjacks, moving from the first frame; a tremor on "triggering". */}
      <Shot k="ai1" present={present} t={t} from={0} to={s.heroTo + 0.15} moveTo={b.pump.start} kb={{ s: [ 1.34, 1.08 ], x: [ 0, 0 ], y: [ 290, -60 ] }} amp={amp} fadeIn={0} easeMove="out" />
      {/* Injection: the cutaway tilts down the well into the disposal formation. */}
      <Shot k="ai2" present={present} t={t} {...c2} />
      <Injection t={t} o={vis( t, b.pump.start + 0.25, s.cutTo, 0.25 )} m={m2} spread={prog( t, within( b, 'pump', 0.45 ), 1.2 )} />
      {/* Mechanism: pressure reaches a fault that was already there; a jolt when it slips. */}
      <Shot k="ai3" present={present} t={t} {...c3} />
      <FaultPressure t={t} o={vis( t, b.pressure.start + 0.2, s.mapFrom + 0.1, 0.3 )} from={b.pressure.start + 0.2} slipAt={slipAt( b )} m={m3} />
      {/* Evidence, the real place: Natural Earth map, USGS epicenter. */}
      <Sequence from={mapFrom} durationInFrames={Math.round( s.mapTo * FPS ) - mapFrom} layout="none">
        <AbsoluteFill style={{ opacity: vis( t, s.mapFrom, s.mapTo, 0.25 ) }}>
          <PawneeMap b={b} from={s.mapFrom} to={s.mapTo} />
        </AbsoluteFill>
      </Sequence>
      {/* The link: a generic plains landscape, labelled as an illustration; no earthquake marker on it. */}
      <Shot k="ai4" present={present} t={t} from={s.mapTo - 0.3} to={s.evidenceTo + 0.15} kb={{ s: [ 1.04, 1.15 ], x: [ -20, 20 ], y: [ 10, -20 ] }} />
      {/* The twist: back on the oil field, darker and closer. */}
      <Shot k="ai1" present={present} t={t} from={s.evidenceTo} to={s.twistTo + 0.15} kb={{ s: [ 1.22, 1.32 ], x: [ 90, 110 ], y: [ 60, 80 ] }} brightness={0.62} />
      {/* "Deep underground afterward": back to the bottom of the well. */}
      <Shot k="ai2" present={present} t={t} {...c2b} />
      <Injection t={t} o={vis( t, s.twistTo + 0.1, s.closeFrom, 0.25 )} m={m2b} spread={1} />
      {/* The ending: AI-5, or AI-1 again with a slow pull-back. */}
      {hasClosing
        ? <Shot k="ai5" present={present} t={t} from={s.closeFrom - 0.1} to={total + 1} moveTo={total} kb={{ s: [ 1.2, 1.04 ], x: [ 0, 0 ], y: [ -40, 0 ] }} fadeIn={0.2} fadeOut={0} />
        : <Shot k="ai1" present={present} t={t} from={s.closeFrom - 0.1} to={total + 1} moveTo={total} kb={{ s: [ 1.24, 1.06 ], x: [ 0, 0 ], y: [ 120, 20 ] }} brightness={0.72} fadeIn={0.2} fadeOut={0} />}

      {/* The rock under the closing line is bright: settle it so the title reads. */}
      <AbsoluteFill style={{ background: 'rgba(4,8,14,0.34)', opacity: vis( t, b.end.start, total + 1, 0.4 ) }} />

      {/* Hook titles */}
      <Headline text="We’re triggering earthquakes." y={330} o={vis( t, 0.1, b.deep.start + 0.1, 0.12 )} size={104} />
      <Headline text="And we know how." y={590} o={vis( t, b.how.start, b.deep.start + 0.1, 0.12 )} size={84} color={AMBER} />
      <Headline text={<>Deep beneath<br />the oil fields</>} y={330} o={vis( t, b.deep.start + 0.15, s.heroTo, 0.2 )} size={88} />
      {/* Injection */}
      <Headline text="Wastewater injection" y={320} o={vis( t, b.pump.start + 0.15, s.cutTo, 0.2 )} size={88} color={ICE} />
      <Note text="Disposal well · not drilling · not to scale" x={72} y={530} o={vis( t, within( b, 'pump', 0.3 ), s.cutTo, 0.25 )} color={COLORS.textSupport} size={26} />
      <Note text="Fluid fills pores in deep rock · not a cave" x={72} y={960} o={vis( t, within( b, 'pump', 0.55 ), s.cutTo, 0.25 )} color={AMBER} size={28} />
      {/* Mechanism */}
      <Headline text="More pressure" y={320} o={vis( t, b.pressure.start + 0.15, slipAt( b ) - 0.05, 0.2 )} size={100} color={AMBER} />
      <Note text="Pore pressure rises · less grip on the fault" x={72} y={450} align="right" o={vis( t, within( b, 'pressure', 0.25 ), slipAt( b ) - 0.05, 0.25 )} color={AMBER} size={26} />
      <Note text="Pre-existing fault · already stressed" x={72} y={1180} maxWidth={470} o={vis( t, within( b, 'pressure', 0.55 ), s.mapFrom, 0.25 )} color={ICE} size={26} />
      <Headline text="Slip" y={320} o={vis( t, slipAt( b ) - 0.02, s.mapFrom, 0.1 )} size={170} color={COLORS.redHot} />
      <Note text="Schematic · no plate moves" x={72} y={520} align="right" o={vis( t, slipAt( b ) + 0.1, s.mapFrom, 0.2 )} color={COLORS.textSupport} size={24} />
      {/* Pawnee, on the map */}
      <Headline text="Pawnee, Oklahoma" y={280} o={vis( t, within( b, 'pawnee', 0.55 ), s.mapTo - 0.05, 0.2 )} size={82} />
      <Headline text="M5.8" y={380} o={vis( t, within( b, 'pawnee', 0.36 ), s.mapTo - 0.05, 0.12 )} size={150} color={COLORS.redHot} />
      <Note text="Sep 3, 2016 · 14 km NW of Pawnee" x={72} y={545} o={vis( t, within( b, 'pawnee', 0.55 ), s.mapTo - 0.05, 0.2 )} color={ICE} size={28} />
      <Note text="Oklahoma’s largest recorded quake · USGS" x={72} y={1205} o={vis( t, within( b, 'pawnee', 0.72 ), s.mapTo - 0.05, 0.2 )} color={COLORS.textSupport} size={26} />
      {/* The link, with its caveat */}
      <Headline text="Linked to wastewater" y={320} o={vis( t, b.linked.start + 0.1, s.evidenceTo, 0.2 )} size={92} color={AMBER} />
      <Note text="Appears induced · disposal within 10 km · McGarr & Barbour 2017" x={72} y={530} maxWidth={760} o={vis( t, within( b, 'linked', 0.2 ), s.evidenceTo, 0.2 )} color={ICE} size={26} />
      <Note text="Illustration · not Pawnee · not footage" x={72} y={1205} o={vis( t, b.linked.start + 0.1, s.evidenceTo, 0.2 )} color={COLORS.textSupport} size={24} />
      {/* The twist */}
      <Headline text="Most people get this wrong" y={340} o={vis( t, b.wrong.start + 0.05, b.drill.start, 0.15 )} size={92} />
      <Headline text={<>Not usually <span style={{ color: COLORS.redHot }}>the drilling</span></>} y={340} o={vis( t, b.drill.start + 0.02, s.twistTo, 0.12 )} size={92} />
      <Note text="Fracking: only 1–2% of Oklahoma quakes · USGS" x={72} y={560} o={vis( t, within( b, 'drill', 0.35 ), s.twistTo, 0.2 )} color={ICE} size={26} />
      <Headline text="Wastewater disposal" y={340} o={vis( t, b.after.start + 0.1, s.closeFrom, 0.15 )} size={92} color={ICE} />
      <Note text="Deep underground · after production" x={72} y={550} o={vis( t, within( b, 'after', 0.3 ), s.closeFrom, 0.2 )} color={AMBER} size={26} />
      {/* Closing frame */}
      <Headline text="Humans can" y={700} o={vis( t, b.end.start + 0.05, total + 1, 0.15 )} size={120} />
      <Headline text="trigger earthquakes" y={830} o={vis( t, within( b, 'end', 0.45 ), total + 1, 0.15 )} size={108} color={AMBER} />
      <Note text="Not every well · most aren’t linked to felt quakes · USGS" x={72} y={1205} maxWidth={760} o={vis( t, within( b, 'end', 0.6 ), total + 1, 0.25 )} color={COLORS.textSupport} size={24} />

      {/* Series kicker, and the AI mark only while an AI image is on screen. */}
      <div style={{ position: 'absolute', left: 72, top: 196, fontFamily: FONT.display, fontWeight: 800, fontSize: 28, letterSpacing: 3, color: ICE, opacity: 0.9 * vis( t, 0.2, b.wrong.start, 0.4 ) }}>CAN THIS CAUSE AN EARTHQUAKE? · EP 02</div>
      {onMap ? null : (
        <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Txt x={1008} y={262} size={20} weight={700} spacing={3} anchor="end" color={COLORS.text} opacity={0.5}>AI VISUALIZATION</Txt>
        </svg>
      )}

      <Captions t={t} captions={audio?.captions ?? placeholderCaptions( META.script )} />
      {audio ? <Layers audio={audio} cues={cues( b )} total={total} /> : null}
    </AbsoluteFill>
  );
};
