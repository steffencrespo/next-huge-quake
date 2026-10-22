/**
 * EXPERIMENT (not in production): "Will California Fall Into the Ocean?" as a cold open + seamless loop.
 *
 * Hypothesis: opening on the Los Angeles / San Francisco reveal, then building the context, and ending on a state that
 * matches the first frame, may improve retention and replays. Reuses the published episode's map, cards, cached narration
 * and music; the narration is the cached clips in a new order (the "Fact two:" and "Fact one:" lead-ins are cut so the
 * order reads naturally) with the fast-beats pacing. Built by scripts/render-california-loop.ts.
 *
 * Order: cold open (LA/SF twist, then the conditional "well... in about fifteen million years") -> MYTH -> nowhere to fall
 * -> plates -> slide -> rate -> "Southwestern California is moving north." -> loop. The body ends with the map in the
 * exact state the cold open starts from, with the zoom and the city markers already arriving, so a replay continues the motion.
 * The music bed stays at one level the whole way (no opening swell, no closing fade) so the loop is continuous in sound too.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { StrikeSlip } from '../historic/sanfrancisco1906.js';
import { COLORS } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { audioBeats } from './episodes.js';
import type { Beats } from './episodes.js';
import { CaMap, Cards, Rate } from './ep06.js';
import { FPS, Layers } from './EduShort.js';
import type { EduShortProps, SfxCue } from './EduShort.js';
import { SeriesTag } from './EduShort.js';
import type { CalculateMetadataFunction } from 'remotion';
import { MIX } from '../audio/soundtrack.js';
import { Backdrop, HOT, Txt, at, f1, prog, vis } from './kit.js';
import { Captions } from './ScienceShort.js';

/** Seconds the end of the body leads the cold open's own zoom/marker timing by (the same offset in both, so the loop is exact). */
const LOOP_DELTA = 0.1;
/** Silence after the last word before the video loops. */
export const LOOP_TAIL = 1.0;
const FAR = 1000;
/** Narration lines in loop order (all from the published episode's claims, see ep06claims.ts). */
export const LOOP_LINES = [ 'fact2', 'punch', 'hook', 'fact', 'plates', 'slide', 'rate', 'how' ] as const;
/** On-screen qualifier under the cold-open card: the 15-million-year figure is a projection, not a forecast. */
export const COLD_OPEN_QUALIFIER = 'If today’s plate motion simply continued · schematic';
const never = { start: -10, end: -9 };

export const loopSeconds = ( b: Beats ) => b.how.end + LOOP_TAIL;

/** Beats for the cold open: everything before the twist is "already done", so the map starts zoomed on the fault with the plate labels up. */
const coldBeats = ( b: Beats ): Beats => ( {
  hook: never, fact: never, plates: never, slide: never, rate: never, how: never,
  fact2: { start: LOOP_DELTA, end: b.fact2.end }, punch: b.punch, cta: { start: FAR, end: FAR + 1 }
} );

/** Beats for the body, shifted so the hook lands at 0.4 s as in the published episode, with the twist placed right after the end. */
const bodyBeats = ( b: Beats, origin: number, length: number ): Beats => {
  const s = ( id: string ) => ( { start: b[id].start - origin, end: b[id].end - origin } );
  return { hook: s( 'hook' ), fact: s( 'fact' ), plates: s( 'plates' ), slide: s( 'slide' ), rate: s( 'rate' ), how: s( 'how' ),
    fact2: { start: length + LOOP_DELTA, end: length + 3 }, punch: { start: length + LOOP_DELTA + 2.4, end: length + 5 }, cta: { start: FAR, end: FAR + 1 } };
};

const ColdOpen: React.FC<{ t: number; b: Beats }> = ( { t, b } ) => {
  const flash = t < 0.5 ? 0.45 * ( 1 - t / 0.5 ) : 0;
  const k = prog( t, LOOP_DELTA, 0.22 );
  const scale = 2 - k;
  const punch = prog( t, b.punch.start, 0.3 );
  const shake = t > LOOP_DELTA && t < LOOP_DELTA + 0.35 ? Math.sin( t * 90 ) * 10 * ( 1 - ( t - LOOP_DELTA ) / 0.35 ) : 0;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <rect width={1080} height={1920} fill={HOT} opacity={flash} />
      <g opacity={Math.min( 1, k * 4 )} transform={`translate(${f1( shake )} 0)`}>
        <g transform={`translate(540 1110) scale(${f1( scale )}) translate(-540 -1110)`}>
          <rect x={72} y={985} width={936} height={250} rx={20} fill="rgba(7,11,20,0.96)" stroke="#3ddc97" strokeWidth={8} />
          <Txt x={540} y={1033} size={34} display weight={800} spacing={10} color="#3ddc97">THE REAL PLOT TWIST</Txt>
          <Txt x={540} y={1100} size={60} display weight={800} color={COLORS.text}>LA IS MOVING IN</Txt>
          <Txt x={540} y={1160} size={60} display weight={800} color={COLORS.text}>WITH SAN FRANCISCO</Txt>
          <g opacity={punch}><Txt x={540} y={1210} size={34} weight={700} color="#e0a43c">Well… in about 15 million years.</Txt></g>
        </g>
      </g>
      <Txt x={540} y={1272} size={28} weight={700} color={COLORS.text} opacity={punch * 0.9}>{COLD_OPEN_QUALIFIER}</Txt>
    </svg>
  );
};

const Body: React.FC<{ t: number; b: Beats }> = ( { t, b } ) => {
  const flash = t < 0.5 ? 0.35 * ( 1 - t / 0.5 ) : 0;
  const factFlash = t >= b.fact.start && t < b.fact.start + 0.4 ? 0.3 * ( 1 - ( t - b.fact.start ) / 0.4 ) : 0;
  const rateB = { ...b, fact2: { start: b.how.start - 0.1, end: b.how.start } };
  return (
    <>
      <CaMap t={t} b={b} note={1 - prog( t, b.how.start, 0.4 )} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={1080} height={1920} fill={HOT} opacity={flash} />
        <rect width={1080} height={1920} fill="#3ddc97" opacity={factFlash} />
        <Cards t={t} b={b} />
      </svg>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}><StrikeSlip t={t} b={{ ...b, strike: b.slide, offset: { start: b.slide.start + 0.8, end: b.slide.end } }} /></svg>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}><Rate t={t} b={rateB} /></svg>
      <SeriesTag number={6} opacity={vis( t, b.plates.start, b.how.end, 0.6 )} />
    </>
  );
};

const cues = ( b: Beats, cut: number ): SfxCue[] => [
  { sfx: 'boom', at: 0, dur: 3, volume: 0.45 },
  { sfx: 'tick', at: b.punch.start, dur: 0.3, volume: 0.5 },
  { sfx: 'riser', at: cut, dur: 1.8, volume: 0.3 },
  { sfx: 'rumble', at: cut, dur: 3, volume: s => 0.35 * Math.exp( -s / 2.5 ) },
  { sfx: 'boom', at: b.fact.start, dur: 3, volume: 0.45 },
  { sfx: 'whoosh', at: at( b, 'plates', 0 ), dur: 1.4, volume: 0.3 },
  { sfx: 'whoosh', at: at( b, 'slide', 0 ), dur: 1.4, volume: 0.3 },
  { sfx: 'tick', at: at( b, 'rate', 0.2 ), dur: 0.3, volume: 0.5 },
  { sfx: 'whoosh', at: at( b, 'how', 0 ), dur: 1.4, volume: 0.25 }
];

export const calculateLoopMetadata: CalculateMetadataFunction<EduShortProps> = ( { props } ) => ( {
  durationInFrames: props.audio ? Math.round( loopSeconds( audioBeats( props.audio ) ) * FPS ) : 30 * FPS
} );

export const MythCaliforniaLoop: React.FC<EduShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if ( !audio ) {
    throw new Error( 'MythCaliforniaLoop needs audio props (scripts/render-california-loop.ts)' );
  }
  const t = frame / FPS;
  const b = audioBeats( audio );
  const cut = b.hook.start - 0.4;
  const intro = t < cut;
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <Backdrop accent="#3f1b2b" />
      {intro
        ? <><CaMap t={t} b={coldBeats( b )} note={0} /><ColdOpen t={t} b={b} /></>
        : <Body t={t - cut} b={bodyBeats( b, cut, loopSeconds( b ) - cut )} />}
      <Captions t={t} captions={audio.captions} />
      <Layers audio={audio} cues={cues( b, cut )} total={durationInFrames / FPS} musicVolume={() => MIX.duckGain} />
    </AbsoluteFill>
  );
};
