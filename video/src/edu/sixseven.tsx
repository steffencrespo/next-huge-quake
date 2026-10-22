/**
 * EXPERIMENT (not in production): "SIX SEVEN: Earthquake Edition" v2. A meme-style "SIX SEVEN!" opener, the numerals merge into a
 * magnitude 6.7, then a clearly marked switch to the real 1994 Northridge earthquake and one USGS fact: the Santa Susana
 * Mountains rose by as much as 70 cm. Daniel narration (cached, fast-beats paced), original synthesized effects, YouTube
 * Audio Library music; the meme's own audio is not used. Timing follows the narration beats (src/edu/sixsevenScript.ts).
 *
 * Facts and sources: docs/experiments/six-seven-earthquake-edition.md. The side view is schematic and labelled so. The meme
 * section never suggests an earthquake is happening: it is a number; the real event is introduced as a past, named one.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { COLORS, FONT } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { audioBeats } from './episodes.js';
import type { Beats } from './episodes.js';
import { FPS, Layers } from './EduShort.js';
import type { EduShortProps, SfxCue } from './EduShort.js';
import { Backdrop, HOT, Pill, Txt, clamp, f1, lerp, mulberry32, prog, vis } from './kit.js';
import { Captions } from './ScienceShort.js';

const AMBER = '#F2A900';
const REAL = '#7FDBFF';
const GREEN = '#3ddc97';
/** Seconds after the last word before the video ends. */
const TAIL = 1.4;

const pop = ( t: number, t0: number, from = 2.2, dur = 0.2 ) => {
  const k = clamp( ( t - t0 ) / dur );
  return { scale: lerp( from, 1, 1 - Math.pow( 1 - k, 3 ) ), opacity: clamp( ( t - t0 ) / 0.06 ) };
};
const Pop: React.FC<{ t: number; t0: number; cx: number; cy: number; from?: number; children: React.ReactNode }> = ( { t, t0, cx, cy, from = 2.2, children } ) => {
  const p = pop( t, t0, from );
  return p.opacity <= 0.01 ? null : <g opacity={p.opacity} transform={`translate(${cx} ${cy}) scale(${f1( p.scale )}) translate(${-cx} ${-cy})`}>{children}</g>;
};
const Layer: React.FC<{ children: React.ReactNode }> = ( { children } ) => <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>{children}</svg>;

/** Key moments, from the narration beats and caption times. */
const moments = ( b: Beats, captions: { text: string; start: number }[] ) => ( {
  merge: b.magnitude.start - 0.12,
  dot: b.magnitude.start + 0.9,
  joke: captions.find( c => c.text.startsWith( 'That’s' ) )?.start ?? b.magnitude.start + 1.9,
  real: b.real.start - 0.1,
  fault: b.fault.start,
  rise: b.rise.start + 1.0,
  seventyCm: captions.find( c => c.text.startsWith( 'to seventy' ) )?.start ?? b.rise.start + 1.9,
  said: b.said.start - 0.05,
  seventy: b.seventy.start,
  brand: b.seventy.end + 0.5
} );
type M = ReturnType<typeof moments>;

/** "SIX SEVEN!": the two numerals bounce in alternation, like the gesture, with a beat-synced flash. The first frame is already full-on. */
const Opener: React.FC<{ t: number; m: M }> = ( { t, m } ) => {
  if ( t >= m.merge + 0.12 ) {
    return null;
  }
  const exit = prog( t, m.merge, 0.12 );
  const w = 2 * Math.PI * 2.5;
  const six = -85 * Math.abs( Math.sin( w * t / 2 ) ) * ( 1 - exit );
  const seven = -85 * Math.abs( Math.cos( w * t / 2 ) ) * ( 1 - exit );
  const beat = 0.22 * Math.abs( Math.sin( w * t / 2 ) ) * ( 1 - exit );
  return (
    <Layer>
      <rect width={1080} height={1920} fill={HOT} opacity={beat + 0.12 * ( 1 - exit )} />
      <text x={lerp( 285, 410, exit )} y={1000 + six} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={620} fill={COLORS.text} stroke={HOT} strokeWidth={14} paintOrder="stroke">6</text>
      <text x={lerp( 795, 690, exit )} y={1000 + seven} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={620} fill={AMBER} stroke="#7a1a10" strokeWidth={14} paintOrder="stroke">7</text>
      <g opacity={1 - exit} transform={`rotate(${f1( Math.sin( t * 22 ) * 2.5 )} 540 1230)`}><Txt x={540} y={1260} size={150} display weight={800} spacing={6} color={COLORS.text}>SIX SEVEN!</Txt></g>
    </Layer>
  );
};

/** The numerals become 6.7 ("point"), then "THAT'S NO JOKE." with a seismograph line and the not-a-real-earthquake label. */
const Magnitude: React.FC<{ t: number; m: M }> = ( { t, m } ) => {
  const o = vis( t, m.merge + 0.12, m.real, 0.1 );
  if ( o <= 0.01 ) {
    return null;
  }
  const dotK = pop( t, m.dot, 3, 0.16 );
  const shake = t > m.dot && t < m.dot + 0.4 ? Math.sin( t * 80 ) * 14 * ( 1 - ( t - m.dot ) / 0.4 ) : 0;
  const rand = mulberry32( 67 );
  const amp = clamp( ( t - m.dot ) / 0.4 ) * ( 1 - prog( t, m.joke + 0.4, 0.8 ) * 0.7 );
  const pts = Array.from( { length: 61 }, ( _, i ) => `${f1( 60 + i * 16 )},${f1( 1610 + ( rand() * 2 - 1 ) * 90 * amp * ( 0.4 + 0.6 * Math.sin( ( i / 60 ) * Math.PI ) ) )}` ).join( ' ' );
  return (
    <Layer>
      <g opacity={o} transform={`translate(${f1( shake )} 0)`}>
        <Txt x={540} y={420} size={64} display weight={800} spacing={14} color={HOT}>MAGNITUDE</Txt>
        <text x={540} y={880} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={560} fill={COLORS.text} stroke={HOT} strokeWidth={12} paintOrder="stroke">6<tspan fill={HOT} fillOpacity={dotK.opacity} dx={-20}>.</tspan><tspan dx={dotK.opacity > 0.5 ? 0 : -40}>7</tspan></text>
        <Pop t={t} t0={m.joke} cx={540} cy={1110}><Txt x={540} y={1130} size={104} display weight={800} color={COLORS.text}>THAT’S NO JOKE.</Txt></Pop>
        <polyline points={pts} fill="none" stroke={HOT} strokeWidth={6} strokeLinejoin="round" opacity={0.9} />
        <Pill x={540} y={1250} text="NOT A REAL EARTHQUAKE · JUST THE NUMBER" color={AMBER} size={30} opacity={prog( t, m.joke + 0.3, 0.3 )} />
      </g>
    </Layer>
  );
};

/** Real event, simplified side view: a hidden fault, and the mountain lifting off its dashed original outline. */
const Real: React.FC<{ t: number; m: M }> = ( { t, m } ) => {
  const o = vis( t, m.real, m.said, 0.15 );
  if ( o <= 0.01 ) {
    return null;
  }
  const flash = t > m.real && t < m.real + 0.35 ? 0.35 * ( 1 - ( t - m.real ) / 0.35 ) : 0;
  const lift = prog( t, m.rise, 0.7 ) * 130;
  const hill = `M60,900 L520,900 C600,900 640,660 780,640 C900,630 940,900 1020,900`;
  const faultOn = prog( t, m.fault, 0.8 );
  const ruptured = t > m.fault + 0.6 && t < m.fault + 1.4 ? 0.6 + 0.4 * Math.sin( t * 34 ) : 0;
  const shake = t > m.rise && t < m.rise + 0.5 ? Math.sin( t * 70 ) * 8 * ( 1 - ( t - m.rise ) / 0.5 ) : 0;
  const cm = prog( t, m.seventyCm, 0.3 );
  return (
    <Layer>
      <rect width={1080} height={1920} fill={REAL} opacity={flash} />
      <g opacity={o} transform={`translate(${f1( shake )} 0)`}>
        <rect x={72} y={280} width={936} height={150} rx={18} fill="rgba(7,11,20,0.92)" stroke={REAL} strokeWidth={6} />
        <Txt x={540} y={346} size={44} display weight={800} spacing={8} color={REAL}>A REAL ONE · NORTHRIDGE, CALIFORNIA</Txt>
        <Txt x={540} y={402} size={36} weight={700} color={COLORS.textSupport}>January 17, 1994</Txt>
        <rect x={60} y={470} width={960} height={640} rx={18} fill="#0a111d" stroke={COLORS.rule} strokeWidth={3} />
        <path d={`${hill} L1020,1110 L60,1110 Z`} fill="#17233a" />
        <path d="M120,1070 L720,905" stroke={ruptured > 0 ? HOT : AMBER} strokeWidth={faultOn * 12} strokeLinecap="round" strokeDasharray="6 12" opacity={0.95} />
        <path d="M120,1070 L720,905" stroke={HOT} strokeWidth={22 * ruptured} strokeLinecap="round" opacity={0.5} />
        <Txt x={420} y={1078} size={34} anchor="start" color={AMBER} opacity={faultOn}>HIDDEN FAULT</Txt>
        <path d={hill} fill="none" stroke="#9db2d6" strokeWidth={5} strokeDasharray="14 12" opacity={lift > 2 ? 0.8 : 0} />
        <g transform={`translate(0 ${f1( -lift )})`}>
          <path d={`${hill} L1020,${900 + lift} L60,${900 + lift} Z`} fill="#2a4d6e" opacity={0.9} />
          <path d={hill} fill="none" stroke={GREEN} strokeWidth={8} strokeLinejoin="round" />
        </g>
        <g opacity={prog( t, m.rise - 0.2, 0.4 )}><Txt x={90} y={560} size={36} anchor="start" color={GREEN}>SANTA SUSANA</Txt><Txt x={90} y={604} size={36} anchor="start" color={GREEN}>MOUNTAINS</Txt></g>
        <g opacity={cm}>
          <line x1={960} y1={640} x2={960} y2={640 - lift} stroke={AMBER} strokeWidth={8} strokeLinecap="round" />
          <path d={`M960,${640 - lift} l-18,26 m18,-26 l18,26`} stroke={AMBER} strokeWidth={8} strokeLinecap="round" fill="none" />
        </g>
        <Txt x={540} y={1150} size={30} weight={600} color={COLORS.textSupport}>Schematic · not to scale · rise exaggerated</Txt>
        <Pop t={t} t0={m.seventyCm} cx={540} cy={1260} from={2.4}><Txt x={540} y={1290} size={150} display weight={800} color={AMBER}>UP TO 70 CM</Txt></Pop>
        <Txt x={540} y={1345} size={34} weight={700} color={COLORS.textSupport} opacity={cm}>about 2.3 feet · USGS</Txt>
      </g>
    </Layer>
  );
};

/** The punchline: SIX SEVEN? THE MOUNTAINS SAID… (beat) SEVENTY! */
const Punch: React.FC<{ t: number; m: M; end: number }> = ( { t, m, end } ) => {
  const o = vis( t, m.said, end, 0.1 );
  if ( o <= 0.01 ) {
    return null;
  }
  const hit = t - m.seventy;
  const shake = hit > 0 && hit < 0.45 ? Math.sin( t * 85 ) * 16 * ( 1 - hit / 0.45 ) : 0;
  const flash = hit > 0 && hit < 0.4 ? 0.5 * ( 1 - hit / 0.4 ) : 0;
  const hold = t < m.seventy ? 0.88 + 0.12 * Math.sin( t * 8 ) : 0.55;
  return (
    <Layer>
      <rect width={1080} height={1920} fill={AMBER} opacity={flash} />
      <g opacity={o} transform={`translate(${f1( shake )} 0)`}>
        <Pop t={t} t0={m.said} cx={540} cy={620}><Txt x={540} y={640} size={190} display weight={800} color={COLORS.text}>SIX SEVEN?</Txt></Pop>
        <Pop t={t} t0={m.said + 0.55} cx={540} cy={850} from={1.5}><Txt x={540} y={870} size={84} display weight={800} color={COLORS.textSupport} opacity={hold}>THE MOUNTAINS SAID…</Txt></Pop>
        <Pop t={t} t0={m.seventy} cx={540} cy={1090} from={3}><Txt x={540} y={1130} size={270} display weight={800} color={AMBER}>SEVENTY!</Txt></Pop>
        <Txt x={540} y={1210} size={36} weight={700} color={COLORS.textSupport} opacity={prog( t, m.seventy + 0.5, 0.3 )}>(centimeters, at most)</Txt>
        <Txt x={540} y={1300} size={44} weight={700} color={COLORS.text} opacity={prog( t, m.brand - 0.1, 0.4 )}>Magnitude is a measure. Not a meme.</Txt>
        <Txt x={540} y={1470} size={54} display weight={800} spacing={6} color={COLORS.text} opacity={prog( t, m.brand + 0.2, 0.4 )}>NEXT HUGE QUAKE</Txt>
      </g>
    </Layer>
  );
};

const cues = ( b: Beats, m: M ): SfxCue[] => [
  ...[ 0, 0.2, 0.4, 0.6, 0.8, 1.0 ].filter( s => s < m.merge ).map( s => ( { sfx: 'tick' as const, at: s, dur: 0.25, volume: 0.5 } ) ),
  { sfx: 'whoosh', at: m.merge - 0.15, dur: 0.8, volume: 0.3 },
  { sfx: 'boom', at: m.dot, dur: 3, volume: 0.55 },
  { sfx: 'tick', at: m.joke, dur: 0.3, volume: 0.5 },
  { sfx: 'whoosh', at: m.real - 0.15, dur: 1.2, volume: 0.35 },
  { sfx: 'rumble', at: m.fault + 0.6, dur: 2.5, volume: s => 0.45 * Math.exp( -s / 1.2 ) },
  { sfx: 'rumble', at: m.rise, dur: 2.5, volume: s => 0.5 * Math.exp( -s / 1.4 ) },
  { sfx: 'boom', at: m.rise, dur: 3, volume: 0.45 },
  { sfx: 'tick', at: m.seventyCm, dur: 0.3, volume: 0.6 },
  { sfx: 'whoosh', at: m.said - 0.15, dur: 1.2, volume: 0.3 },
  { sfx: 'riser', at: b.said.end, dur: Math.max( 0.5, b.seventy.start - b.said.end ), volume: 0.4 },
  { sfx: 'boom', at: m.seventy, dur: 3, volume: 0.7 },
  { sfx: 'tick', at: m.brand, dur: 0.3, volume: 0.4 }
];

export const sixSevenSeconds = ( b: Beats ) => b.seventy.end + TAIL;
export const calculateSixSevenMetadata: CalculateMetadataFunction<EduShortProps> = ( { props } ) => ( {
  durationInFrames: props.audio ? Math.round( sixSevenSeconds( audioBeats( props.audio ) ) * FPS ) : 18 * FPS
} );

export const SixSevenEarthquake: React.FC<EduShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if ( !audio ) {
    throw new Error( 'SixSevenEarthquake needs audio props (scripts/render-six-seven.ts)' );
  }
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = audioBeats( audio );
  const m = moments( b, audio.captions );
  const music = ( f: number ) => 0.24 * clamp( ( total - f / FPS ) / 0.8 );
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Backdrop accent={t < m.real ? '#3f1b2b' : '#12304a'} />
      <Opener t={t} m={m} />
      <Magnitude t={t} m={m} />
      <Real t={t} m={m} />
      <Punch t={t} m={m} end={total} />
      <Captions t={t} captions={audio.captions} />
      <Layers audio={audio} cues={cues( b, m )} total={total} musicVolume={music} />
    </AbsoluteFill>
  );
};
