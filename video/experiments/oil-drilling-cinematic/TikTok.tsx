/**
 * TikTok edition of EP 02: same narration, SFX, stills, timing and scientific labels as `OilDrillingCinematic` (the approved YouTube cut), with no
 * music, every text overlay moved inside a conservative TikTok safe area, a tighter hook and deeper underground framing so the fluid stays above the
 * raised captions. Safe area on 1080×1920, as in the Taipei 101 edition (no official TikTok spec exists; this is the cautious end of current guides):
 * top 240 px, bottom 480 px, right 140 px, left 60 px, so all text stays in x 60–940, y 240–1440. `simulateUi` draws a mock TikTok interface for
 * diagnostic frames only; exported renders never set it.
 */
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { COLORS, FONT } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { FPS, Layers } from '../../src/edu/EduShort.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { beatsFor, placeholderCaptions } from '../../src/edu/episodes.js';
import { Txt, clamp, prog, vis, within } from '../../src/edu/kit.js';
import { AMBER, Headline, ICE, Note, camAt } from '../taipei101-cinematic/Cinematic.js';
import type { Cam } from '../taipei101-cinematic/Cinematic.js';
import { FaultPressure, Injection, META, PawneeMap, Shot, cues, oilDrillingSchema, quake, scenes, slipAt } from './Cinematic.js';

export const oilDrillingTikTokSchema = oilDrillingSchema.extend( { simulateUi: z.boolean().optional() } );
export type OilDrillingTikTokProps = z.infer<typeof oilDrillingTikTokSchema>;

export const SAFE = { left: 60, right: 940, top: 240, bottom: 1440 };
/** Centred headlines use the safe width, so their centre sits at x 500 rather than 540. */
const C = { x: SAFE.left, w: SAFE.right - SAFE.left };
/** Right edge margin for right-aligned notes, so they end at x 930. */
const RIGHT = 1080 - SAFE.right + 10;
/** The shared caption band (y 1330–1480) moves up so its box stays above the bottom interface. */
const CAPTION_LIFT = 130;

/** Mock TikTok feed interface (generic shapes, no logos) with the unsafe areas tinted. Diagnostic frames only. */
const TikTokUi: React.FC = () => {
  const zone = 'rgba(255,40,80,0.22)';
  const icon = ( y: number, label: string, r = 44 ) => (
    <g key={label}>
      <circle cx={1010} cy={y} r={r} fill="rgba(255,255,255,0.9)" />
      <text x={1010} y={y + r + 30} fill="#fff" fontSize={24} fontFamily="sans-serif" fontWeight={700} textAnchor="middle">{label}</text>
    </g>
  );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <rect x={0} y={0} width={1080} height={SAFE.top} fill={zone} />
      <rect x={0} y={SAFE.bottom} width={1080} height={1920 - SAFE.bottom} fill={zone} />
      <rect x={SAFE.right} y={SAFE.top} width={1080 - SAFE.right} height={SAFE.bottom - SAFE.top} fill={zone} />
      <rect x={0} y={SAFE.top} width={SAFE.left} height={SAFE.bottom - SAFE.top} fill={zone} />
      <rect x={SAFE.left} y={SAFE.top} width={SAFE.right - SAFE.left} height={SAFE.bottom - SAFE.top} fill="none" stroke="#39ff88" strokeWidth={3} strokeDasharray="16 10" />
      <text x={540} y={140} fill="#fff" fontSize={40} fontFamily="sans-serif" fontWeight={700} textAnchor="middle">Following    For You</text>
      <rect x={60} y={108} width={70} height={40} rx={8} fill="none" stroke="#fff" strokeWidth={4} />
      <circle cx={1010} cy={128} r={22} fill="none" stroke="#fff" strokeWidth={5} />
      {icon( 960, 'avatar', 52 )}
      {icon( 1130, '1.2M' )}
      {icon( 1290, '4,512' )}
      {icon( 1450, '8,900' )}
      {icon( 1610, 'Share' )}
      <circle cx={1010} cy={1760} r={44} fill="#222" stroke="#fff" strokeWidth={6} />
      <text x={40} y={1560} fill="#fff" fontSize={38} fontFamily="sans-serif" fontWeight={800}>@nexthugequake</text>
      <text x={40} y={1615} fill="#fff" fontSize={32} fontFamily="sans-serif">Humans can trigger earthquakes, and oil fields…</text>
      <text x={40} y={1660} fill="#fff" fontSize={32} fontFamily="sans-serif">#earthquake #science #oklahoma … more</text>
      <text x={40} y={1720} fill="#fff" fontSize={30} fontFamily="sans-serif">♫ original sound</text>
      <rect x={0} y={1800} width={1080} height={120} fill="rgba(0,0,0,0.92)" />
      {[ 'Home', 'Friends', '+', 'Inbox', 'Profile' ].map( ( l, i ) => <text key={l} x={108 + i * 216} y={1875} fill="#fff" fontSize={30} fontFamily="sans-serif" textAnchor="middle">{l}</text> )}
    </svg>
  );
};

export const OilDrillingTikTok: React.FC<OilDrillingTikTokProps> = ( { audio, present, simulateUi } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( META, audio );
  const s = scenes( b );
  const amp = quake( b );
  const slip = slipAt( b );
  const c2: Cam = { from: s.heroTo, to: s.cutTo + 0.15, kb: { s: [ 1.1, 1.72 ], x: [ 40, 182 ], y: [ 90, -690 ] }, easeMove: 'soft' };
  const c2b: Cam = { from: s.twistTo, to: s.closeFrom + 0.15, kb: { s: [ 1.72, 1.82 ], x: [ 180, 200 ], y: [ -690, -787 ] }, easeMove: 'soft' };
  const c3: Cam = { from: s.cutTo, to: s.mapFrom + 0.2, kb: { s: [ 1.05, 1.2 ], x: [ -20, -50 ], y: [ 0, -30 ] }, amp, easeMove: 'soft' };
  const m2 = camAt( c2, t ), m2b = camAt( c2b, t ), m3 = camAt( c3, t );
  const onMap = t >= s.mapFrom + 0.3 && t < s.mapTo - 0.3;
  const mapFrom = Math.round( s.mapFrom * FPS );
  return (
    <AbsoluteFill style={{ background: '#04080e' }}>
      {/* Hook: starts tighter on the pumpjack, the move lands by "how"; a slow 6% push-in then keeps the frame alive until the cut. */}
      <AbsoluteFill style={{ transform: `scale(${( 1 + 0.06 * clamp( ( t - b.how.end ) / ( s.heroTo - b.how.end ) ) ).toFixed( 4 )})`, transformOrigin: '50% 70%' }}>
        <Shot k="ai1" present={present} t={t} from={0} to={s.heroTo + 0.15} moveTo={b.deep.start + 0.5} kb={{ s: [ 1.45, 1.08 ], x: [ 60, 0 ], y: [ 420, -60 ] }} amp={amp} fadeIn={0} easeMove="out" />
      </AbsoluteFill>
      <Shot k="ai2" present={present} t={t} {...c2} />
      <Injection t={t} o={vis( t, b.pump.start + 0.25, s.cutTo, 0.25 )} m={m2} spread={prog( t, within( b, 'pump', 0.45 ), 1.2 )} />
      <Shot k="ai3" present={present} t={t} {...c3} />
      <FaultPressure t={t} o={vis( t, b.pressure.start + 0.2, s.mapFrom + 0.1, 0.3 )} from={b.pressure.start + 0.2} slipAt={slip} m={m3} />
      <Sequence from={mapFrom} durationInFrames={Math.round( s.mapTo * FPS ) - mapFrom} layout="none">
        <AbsoluteFill style={{ opacity: vis( t, s.mapFrom, s.mapTo, 0.25 ) }}>
          {/* A little wider than YouTube, so Oklahoma City stays above the raised captions. */}
          <PawneeMap b={b} from={s.mapFrom} to={s.mapTo} zoomEnd={7.6} />
        </AbsoluteFill>
      </Sequence>
      <Shot k="ai4" present={present} t={t} from={s.mapTo - 0.3} to={s.evidenceTo + 0.15} kb={{ s: [ 1.04, 1.15 ], x: [ -20, 20 ], y: [ 10, -20 ] }} />
      <Shot k="ai1" present={present} t={t} from={s.evidenceTo} to={s.twistTo + 0.15} kb={{ s: [ 1.22, 1.32 ], x: [ 60, 80 ], y: [ 0, 20 ] }} brightness={0.62} />
      <Shot k="ai2" present={present} t={t} {...c2b} />
      <Injection t={t} o={vis( t, s.twistTo + 0.1, s.closeFrom, 0.25 )} m={m2b} spread={1} />
      <Shot k="ai5" present={present} t={t} from={s.closeFrom - 0.1} to={total + 1} moveTo={total} kb={{ s: [ 1.2, 1.04 ], x: [ 0, 0 ], y: [ -40, 0 ] }} fadeIn={0.2} fadeOut={0} />
      <AbsoluteFill style={{ background: 'rgba(4,8,14,0.34)', opacity: vis( t, b.end.start, total + 1, 0.4 ) }} />

      {/* Hook titles: on screen from the first frames. */}
      <Headline text="We’re triggering earthquakes." y={320} o={vis( t, 0.03, b.deep.start + 0.1, 0.1 )} size={100} {...C} />
      <Headline text="And we know how." y={560} o={vis( t, b.how.start, b.deep.start + 0.1, 0.12 )} size={84} color={AMBER} {...C} />
      <Headline text={<>Deep beneath<br />the oil fields</>} y={320} o={vis( t, b.deep.start + 0.15, s.heroTo, 0.2 )} size={88} {...C} />
      {/* Injection */}
      <Headline text="Wastewater injection" y={320} o={vis( t, b.pump.start + 0.15, s.cutTo, 0.2 )} size={88} color={ICE} {...C} />
      <Note text="Disposal well · not drilling · not to scale" x={72} y={440} o={vis( t, within( b, 'pump', 0.3 ), s.cutTo, 0.25 )} color={COLORS.textSupport} size={26} />
      <Note text="Fluid fills pores in deep rock · not a cave" x={72} y={850} o={vis( t, within( b, 'pump', 0.55 ), s.cutTo, 0.25 )} color={AMBER} size={28} />
      {/* Mechanism */}
      <Headline text="More pressure" y={310} o={vis( t, b.pressure.start + 0.15, slip - 0.05, 0.2 )} size={100} color={AMBER} {...C} />
      <Note text="Pore pressure rises · less grip on the fault" x={RIGHT} y={440} align="right" o={vis( t, within( b, 'pressure', 0.25 ), slip - 0.05, 0.25 )} color={AMBER} size={26} />
      <Note text="Pre-existing fault · already stressed" x={72} y={1060} maxWidth={470} o={vis( t, within( b, 'pressure', 0.55 ), s.mapFrom, 0.25 )} color={ICE} size={26} />
      <Headline text="Slip" y={300} o={vis( t, slip - 0.02, s.mapFrom, 0.1 )} size={170} color={COLORS.redHot} {...C} />
      <Note text="Schematic · no plate moves" x={RIGHT} y={500} align="right" o={vis( t, slip + 0.1, s.mapFrom, 0.2 )} color={COLORS.textSupport} size={24} />
      {/* Pawnee, on the map */}
      <Headline text="Pawnee, Oklahoma" y={300} o={vis( t, within( b, 'pawnee', 0.55 ), s.mapTo - 0.05, 0.2 )} size={80} {...C} />
      <Headline text="M5.8" y={385} o={vis( t, within( b, 'pawnee', 0.36 ), s.mapTo - 0.05, 0.12 )} size={140} color={COLORS.redHot} {...C} />
      <Note text="Sep 3, 2016 · 14 km NW of Pawnee" x={72} y={540} o={vis( t, within( b, 'pawnee', 0.55 ), s.mapTo - 0.05, 0.2 )} color={ICE} size={28} />
      <Note text="Oklahoma’s largest recorded quake · USGS" x={72} y={605} o={vis( t, within( b, 'pawnee', 0.72 ), s.mapTo - 0.05, 0.2 )} color={COLORS.textSupport} size={26} />
      {/* The link, with its caveat */}
      <Headline text="Linked to wastewater" y={320} o={vis( t, b.linked.start + 0.1, s.evidenceTo, 0.2 )} size={88} color={AMBER} {...C} />
      <Note text="Appears induced · disposal within 10 km · McGarr & Barbour 2017" x={72} y={530} maxWidth={760} o={vis( t, within( b, 'linked', 0.2 ), s.evidenceTo, 0.2 )} color={ICE} size={26} />
      <Note text="Illustration · not Pawnee · not footage" x={72} y={1100} o={vis( t, b.linked.start + 0.1, s.evidenceTo, 0.2 )} color={COLORS.textSupport} size={24} />
      {/* The twist */}
      <Headline text="Most people get this wrong" y={340} o={vis( t, b.wrong.start + 0.05, b.drill.start, 0.15 )} size={92} {...C} />
      <Headline text={<>Not usually <span style={{ color: COLORS.redHot }}>the drilling</span></>} y={340} o={vis( t, b.drill.start + 0.02, s.twistTo, 0.12 )} size={84} {...C} />
      <Note text="Fracking: only 1–2% of Oklahoma quakes · USGS" x={72} y={470} o={vis( t, within( b, 'drill', 0.35 ), s.twistTo, 0.2 )} color={ICE} size={26} />
      <Headline text="Wastewater disposal" y={320} o={vis( t, b.after.start + 0.1, s.closeFrom, 0.15 )} size={92} color={ICE} {...C} />
      <Note text="Deep underground · after production" x={72} y={440} o={vis( t, within( b, 'after', 0.3 ), s.closeFrom, 0.2 )} color={AMBER} size={26} />
      {/* Closing frame */}
      <Headline text="Humans can" y={700} o={vis( t, b.end.start + 0.05, total + 1, 0.15 )} size={116} {...C} />
      <Headline text="trigger earthquakes" y={825} o={vis( t, within( b, 'end', 0.45 ), total + 1, 0.15 )} size={100} color={AMBER} {...C} />
      <Note text="Not every well · most aren’t linked to felt quakes · USGS" x={72} y={1090} maxWidth={760} o={vis( t, within( b, 'end', 0.6 ), total + 1, 0.25 )} color={COLORS.textSupport} size={24} />

      <div style={{ position: 'absolute', left: 72, top: 256, fontFamily: FONT.display, fontWeight: 800, fontSize: 28, letterSpacing: 3, color: ICE, opacity: 0.9 * vis( t, 0.2, b.wrong.start, 0.4 ) }}>CAN THIS CAUSE AN EARTHQUAKE? · EP 02</div>
      {onMap ? null : (
        <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Txt x={SAFE.right - 10} y={282} size={20} weight={700} spacing={3} anchor="end" color={COLORS.text} opacity={0.5}>AI VISUALIZATION</Txt>
        </svg>
      )}

      <AbsoluteFill style={{ transform: `translateY(${-CAPTION_LIFT}px)` }}>
        <Captions t={t} captions={audio?.captions ?? placeholderCaptions( META.script )} />
      </AbsoluteFill>
      {audio ? <Layers audio={audio} cues={cues( b )} total={total} /> : null}
      {simulateUi ? <TikTokUi /> : null}
    </AbsoluteFill>
  );
};
