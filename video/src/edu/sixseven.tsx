/**
 * EXPERIMENT (not in production): "SIX SEVEN: Earthquake Edition". A meme-style "SIX SEVEN!" opener cuts to the real
 * magnitude 6.7 Northridge earthquake and one USGS fact: it broke a hidden fault about 17.5 km down and raised the
 * Santa Susana Mountains by as much as 70 cm. No narration yet (a voice would need new, paid text-to-speech): the story is
 * on-screen text, synthesized effects and music from the YouTube Audio Library. The meme's own audio is not used.
 *
 * Facts and sources: docs/experiments/six-seven-earthquake-edition.md. The cross-section is schematic and labelled so.
 * It never suggests an earthquake is happening now: the opener is about a number, and the fact is a past, named event.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { COLORS, FONT } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { MUSIC } from '../audio/music.js';
import { FPS, Layers } from './EduShort.js';
import type { EduShortProps, SfxCue } from './EduShort.js';
import { Backdrop, HOT, Pill, Txt, clamp, f1, lerp, mulberry32, prog, vis } from './kit.js';

export const SIX_SEVEN_SECONDS = 14.6;
const AMBER = '#F2A900';
const GREEN = '#3ddc97';
/** Beat times (seconds). */
const T = { opener: 0, merge: 1.25, magnitude: 1.5, joke: 2.5, notReal: 3.1, clear: 4.2, fact: 4.4, hidden: 5.1, up: 7.3, seventy: 8.7, punch: 10.5, brand: 12.7 };

const pop = ( t: number, t0: number, from = 2.2, dur = 0.2 ) => {
  const k = clamp( ( t - t0 ) / dur );
  return { scale: lerp( from, 1, 1 - Math.pow( 1 - k, 3 ) ), opacity: clamp( ( t - t0 ) / 0.06 ) };
};
const Pop: React.FC<{ t: number; t0: number; cx: number; cy: number; from?: number; children: React.ReactNode }> = ( { t, t0, cx, cy, from = 2.2, children } ) => {
  const p = pop( t, t0, from );
  return p.opacity <= 0.01 ? null : <g opacity={p.opacity} transform={`translate(${cx} ${cy}) scale(${f1( p.scale )}) translate(${-cx} ${-cy})`}>{children}</g>;
};

/** "SIX SEVEN!": the two numerals bounce in alternation, like the gesture, with a beat-synced flash. First frame is already full-on. */
const Opener: React.FC<{ t: number }> = ( { t } ) => {
  if ( t >= T.merge + 0.12 ) {
    return null;
  }
  const exit = prog( t, T.merge, 0.12 );
  const w = 2 * Math.PI * 2.5;
  const six = -85 * Math.abs( Math.sin( w * t / 2 ) ) * ( 1 - exit );
  const seven = -85 * Math.abs( Math.cos( w * t / 2 ) ) * ( 1 - exit );
  const beat = 0.22 * Math.abs( Math.sin( w * t / 2 ) ) * ( 1 - exit );
  const sixX = lerp( 285, 410, exit ), sevenX = lerp( 795, 690, exit );
  const wob = Math.sin( t * 22 ) * 2.5;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <rect width={1080} height={1920} fill={HOT} opacity={beat + 0.12 * ( 1 - exit )} />
      <text x={sixX} y={1000 + six} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={620} fill={COLORS.text} stroke={HOT} strokeWidth={14} paintOrder="stroke">6</text>
      <text x={sevenX} y={1000 + seven} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={620} fill={AMBER} stroke="#7a1a10" strokeWidth={14} paintOrder="stroke">7</text>
      <g opacity={1 - exit} transform={`rotate(${f1( wob )} 540 1230)`}><Txt x={540} y={1260} size={150} display weight={800} spacing={6} color={COLORS.text}>SIX SEVEN!</Txt></g>
    </svg>
  );
};

/** The numerals merge into 6.7 and the line "MAGNITUDE 6.7? THAT'S NO JOKE." with a seismograph underneath. */
const Magnitude: React.FC<{ t: number }> = ( { t } ) => {
  const o = vis( t, T.merge + 0.12, T.clear, 0.12 );
  if ( o <= 0.01 ) {
    return null;
  }
  const shake = t > T.magnitude && t < T.magnitude + 0.4 ? Math.sin( t * 80 ) * 14 * ( 1 - ( t - T.magnitude ) / 0.4 ) : 0;
  const rand = mulberry32( 67 );
  const amp = clamp( ( t - T.magnitude ) / 0.5 ) * ( 1 - prog( t, T.notReal, 0.8 ) * 0.75 );
  const pts = Array.from( { length: 61 }, ( _, i ) => `${f1( 60 + i * 16 )},${f1( 1440 + ( rand() * 2 - 1 ) * 130 * amp * ( 0.4 + 0.6 * Math.sin( ( i / 60 ) * Math.PI ) ) )}` ).join( ' ' );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <g opacity={o} transform={`translate(${f1( shake )} 0)`}>
        <Txt x={540} y={420} size={64} display weight={800} spacing={14} color={HOT} opacity={prog( t, T.merge + 0.15, 0.15 )}>MAGNITUDE</Txt>
        <text x={540} y={880} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={560} fill={COLORS.text} stroke={HOT} strokeWidth={12} paintOrder="stroke" opacity={prog( t, T.merge + 0.12, 0.05 )}>6<tspan fill={HOT} dx={-20}>.</tspan>7</text>
        <Pop t={t} t0={T.joke} cx={540} cy={1110}><Txt x={540} y={1130} size={104} display weight={800} color={COLORS.text}>THAT’S NO JOKE.</Txt></Pop>
        <polyline points={pts} fill="none" stroke={HOT} strokeWidth={6} strokeLinejoin="round" opacity={0.9} />
        <Pill x={540} y={1250} text="NOT A REAL EARTHQUAKE · JUST THE NUMBER" color={AMBER} size={30} opacity={prog( t, T.notReal, 0.3 )} />
      </g>
    </svg>
  );
};

/** Schematic cross-section: a hidden fault 17.5 km down; the mountains on the upthrown side rise. Not to scale, rise exaggerated. */
const Fact: React.FC<{ t: number }> = ( { t } ) => {
  const o = vis( t, T.fact, T.punch - 0.2, 0.35 );
  if ( o <= 0.01 ) {
    return null;
  }
  const rise = prog( t, T.up, 0.5 ) * 46;
  const slip = prog( t, T.up, 0.5 );
  const ground = ( x: number ) => 740 - ( x > 560 ? Math.min( 1, ( x - 560 ) / 260 ) * ( 90 + rise ) : 0 );
  const surface = Array.from( { length: 29 }, ( _, i ) => `${60 + i * 34},${f1( ground( 60 + i * 34 ) )}` ).join( ' ' );
  const faultOn = prog( t, T.hidden, 0.7 );
  const hot = t > T.up && t < T.up + 1 ? 0.6 + 0.4 * Math.sin( t * 30 ) : 0;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <g opacity={o}>
        <Txt x={540} y={300} size={50} display weight={800} spacing={8} color={HOT} opacity={prog( t, T.fact, 0.3 )}>A REAL MAGNITUDE 6.7</Txt>
        <Txt x={540} y={356} size={36} weight={700} color={COLORS.textSupport} opacity={prog( t, T.fact + 0.2, 0.3 )}>Northridge, California · January 17, 1994</Txt>
        <rect x={60} y={560} width={960} height={620} rx={18} fill="#0a111d" stroke={COLORS.rule} strokeWidth={3} />
        <polygon points={`60,1180 ${surface} 1020,1180`} fill="#17233a" opacity={0.95} />
        <polyline points={surface} fill="none" stroke="#9db2d6" strokeWidth={6} strokeLinejoin="round" />
        <line x1={150} y1={1130} x2={760} y2={740} stroke={hot > 0 ? HOT : AMBER} strokeWidth={faultOn * 10} strokeLinecap="round" strokeDasharray="8 10" opacity={0.95} />
        <line x1={150} y1={1130} x2={760} y2={740} stroke={HOT} strokeWidth={14 * hot} strokeLinecap="round" opacity={0.5} />
        <g opacity={faultOn}>
          <line x1={92} y1={740} x2={92} y2={1130} stroke={COLORS.text} strokeWidth={3} />
          <Txt x={106} y={955} size={32} anchor="start" color={COLORS.text}>≈ 17.5 KM DEEP</Txt>
          <Txt x={410} y={1020} size={32} anchor="start" color={AMBER}>HIDDEN FAULT</Txt>
        </g>
        <g opacity={slip}>
          <path d={`M820,${f1( ground( 820 ) - 70 )} l0,-60`} stroke={GREEN} strokeWidth={9} strokeLinecap="round" />
          <Txt x={820} y={ground( 820 ) - 150} size={32} color={GREEN}>SANTA SUSANA MTS.</Txt>
        </g>
        <Txt x={540} y={1160} size={30} weight={600} color={COLORS.textSupport} opacity={0.9}>Schematic · not to scale · rise exaggerated</Txt>
        <Pop t={t} t0={T.hidden} cx={540} cy={1290}><Txt x={540} y={1300} size={70} display weight={800} color={COLORS.text} opacity={1 - prog( t, T.up - 0.15, 0.2 )}>A HIDDEN FAULT, 17.5 KM DOWN</Txt></Pop>
        <Pop t={t} t0={T.up} cx={540} cy={1290}><Txt x={540} y={1300} size={86} display weight={800} color={GREEN}>THE MOUNTAINS WENT UP</Txt></Pop>
        <Pop t={t} t0={T.seventy} cx={540} cy={1420} from={2.6}><Txt x={540} y={1440} size={150} display weight={800} color={AMBER}>UP TO 70 CM</Txt></Pop>
        <Txt x={540} y={1496} size={34} weight={700} color={COLORS.textSupport} opacity={prog( t, T.seventy + 0.3, 0.3 )}>about 2.3 feet · Source: USGS</Txt>
      </g>
    </svg>
  );
};

const Punch: React.FC<{ t: number }> = ( { t } ) => {
  const o = vis( t, T.punch, SIX_SEVEN_SECONDS, 0.12 );
  if ( o <= 0.01 ) {
    return null;
  }
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <g opacity={o}>
        <Pop t={t} t0={T.punch} cx={540} cy={640}><Txt x={540} y={660} size={190} display weight={800} color={COLORS.text}>SIX SEVEN?</Txt></Pop>
        <Pop t={t} t0={T.punch + 0.7} cx={540} cy={860} from={1.6}><Txt x={540} y={880} size={84} display weight={800} color={COLORS.textSupport}>THE MOUNTAINS SAID</Txt></Pop>
        <Pop t={t} t0={T.punch + 1.2} cx={540} cy={1100} from={2.6}><Txt x={540} y={1130} size={260} display weight={800} color={AMBER}>SEVENTY</Txt></Pop>
        <Txt x={540} y={1210} size={36} weight={700} color={COLORS.textSupport} opacity={prog( t, T.punch + 1.6, 0.3 )}>(centimeters, at most)</Txt>
        <Txt x={540} y={1330} size={44} weight={700} color={COLORS.text} opacity={prog( t, T.brand - 0.2, 0.4 )}>Magnitude is a measure. Not a meme.</Txt>
        <Txt x={540} y={1410} size={54} display weight={800} spacing={6} color={COLORS.text} opacity={prog( t, T.brand, 0.4 )}>NEXT HUGE QUAKE</Txt>
      </g>
    </svg>
  );
};

const cues: SfxCue[] = [
  ...[ 0, 0.4, 0.8 ].flatMap( s => [ { sfx: 'tick' as const, at: s, dur: 0.25, volume: 0.55 }, { sfx: 'tick' as const, at: s + 0.2, dur: 0.25, volume: 0.4 } ] ),
  { sfx: 'riser', at: 0.55, dur: 0.8, volume: 0.35 },
  { sfx: 'boom', at: T.magnitude, dur: 3, volume: 0.6 },
  { sfx: 'rumble', at: T.magnitude, dur: 2.5, volume: s => 0.4 * Math.exp( -s / 1.2 ) },
  { sfx: 'tick', at: T.joke, dur: 0.3, volume: 0.6 },
  { sfx: 'whoosh', at: T.clear - 0.2, dur: 1.2, volume: 0.35 },
  { sfx: 'tick', at: T.hidden, dur: 0.3, volume: 0.45 },
  { sfx: 'rumble', at: T.up, dur: 2.5, volume: s => 0.5 * Math.exp( -s / 1.4 ) },
  { sfx: 'boom', at: T.up, dur: 3, volume: 0.5 },
  { sfx: 'boom', at: T.seventy, dur: 3, volume: 0.5 },
  { sfx: 'whoosh', at: T.punch - 0.2, dur: 1.2, volume: 0.35 },
  { sfx: 'tick', at: T.punch, dur: 0.3, volume: 0.6 },
  { sfx: 'tick', at: T.punch + 1.2, dur: 0.3, volume: 0.7 },
  { sfx: 'boom', at: T.punch + 1.2, dur: 3, volume: 0.45 }
];

export const calculateSixSevenMetadata: CalculateMetadataFunction<EduShortProps> = () => ( { durationInFrames: Math.round( SIX_SEVEN_SECONDS * FPS ) } );

export const SixSevenEarthquake: React.FC<EduShortProps> = () => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  // Layers needs an audio plan; this short has no narration clips, only music and effects.
  const audio = { clips: [], captions: [], narrationStart: 0, narrationEnd: 0.1, musicFile: MUSIC.reviver.file, musicCredit: MUSIC.reviver.credit };
  const music = ( f: number ) => 0.5 * clamp( ( total - f / FPS ) / 0.8 ) * clamp( ( f / FPS + 0.05 ) / 0.1 );
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Backdrop accent="#3f1b2b" />
      <Opener t={t} />
      <Magnitude t={t} />
      <Fact t={t} />
      <Punch t={t} />
      <Layers audio={audio} cues={cues} total={total} musicVolume={music} />
    </AbsoluteFill>
  );
};
