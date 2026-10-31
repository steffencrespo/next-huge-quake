/**
 * TikTok edition of the Taipei 101 Short: same narration, music, SFX, stills, timing and scientific labels as `Taipei101Cinematic`
 * (the approved YouTube cut), with every text overlay moved inside a conservative TikTok safe area and a faster hook move.
 * Safe area on 1080×1920 (no official TikTok spec exists; this is the cautious end of current guides): top 240 px (feed tabs),
 * bottom 480 px (account, caption, sound line, nav bar), right 140 px (engagement column), left 60 px. So all text stays in
 * x 60–940, y 240–1440. `simulateUi` draws a mock TikTok interface for diagnostic frames only; exported renders never set it.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';
import { COLORS, FONT } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { FPS, Layers } from '../../src/edu/EduShort.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { beatsFor, placeholderCaptions } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { Txt, clamp, vis, within } from '../../src/edu/kit.js';
import { Epicenter } from '../../src/historic/kit.js';
import { ASSETS } from './assets.js';
import { AMBER, FaultTrace, Headline, ICE, Load, META, Note, PILES, QUAKES, Shot, camAt, cues, pin, quake, quakeAt, scenes, taipei101Schema } from './Cinematic.js';
import type { Cam } from './Cinematic.js';

export const taipei101TikTokSchema = taipei101Schema.extend( { simulateUi: z.boolean().optional() } );
export type Taipei101TikTokProps = z.infer<typeof taipei101TikTokSchema>;

export const SAFE = { left: 60, right: 940, top: 240, bottom: 1440 };
/** Centred headlines use the safe width, so their centre sits at x 500 rather than 540. */
const C = { x: SAFE.left, w: SAFE.right - SAFE.left };
/** Right-hand column over the dark sky of AI-5, ending at the engagement column. */
const R = { x: 380, w: SAFE.right - 380 };
/** The shared caption band (y 1330–1480) moves up so its box stays above the bottom interface. */
const CAPTION_LIFT = 130;

/** AI-3 for TikTok: the same tilt, but deeper and tighter so the quake markers end above the lifted caption band. */
const cam3 = ( b: Beats, amp: ( t: number ) => number ): Cam => ( { from: scenes( b ).scaleTo, to: scenes( b ).cutTo + 0.15, moveTo: within( b, 'mags', 0.08 ), kb: { s: [ 1.15, 1.75 ], x: [ 0, 0 ], y: [ 140, -713 ] }, amp, easeMove: 'soft' } );
/** Quake markers in the AI-3 bedrock, either side of the pile group, nearer the centre than on YouTube so they stay inside the tighter crop. */
const QUAKES_TT = [ { ...QUAKES[0], x: 390, y: 1447 }, { ...QUAKES[1], x: 690, y: 1432 } ] as const;
const cam4 = ( b: Beats ): Cam => ( { from: scenes( b ).cutTo, to: scenes( b ).faultTo + 0.15, kb: { s: [ 1.05, 1.22 ], x: [ 0, -60 ], y: [ 0, 0 ] } } );

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
      <text x={40} y={1615} fill="#fff" fontSize={32} fontFamily="sans-serif">Could the weight of a single skyscraper actually…</text>
      <text x={40} y={1660} fill="#fff" fontSize={32} fontFamily="sans-serif">#earthquake #science #taipei101 … more</text>
      <text x={40} y={1720} fill="#fff" fontSize={30} fontFamily="sans-serif">♫ original sound</text>
      <rect x={0} y={1800} width={1080} height={120} fill="rgba(0,0,0,0.92)" />
      {[ 'Home', 'Friends', '+', 'Inbox', 'Profile' ].map( ( l, i ) => <text key={l} x={108 + i * 216} y={1875} fill="#fff" fontSize={30} fontFamily="sans-serif" textAnchor="middle">{l}</text> )}
    </svg>
  );
};

export const Taipei101TikTok: React.FC<Taipei101TikTokProps> = ( { audio, present, simulateUi } ) => {
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
  return (
    <AbsoluteFill style={{ background: '#04080e' }}>
      {/* Hook: starts tight on the spire and moves from the first frame (ease-out), settling at the base for "beneath". */}
      {/* After the move settles, a slow 5% push-in keeps the frame alive until the cut (no static hold under "In Taiwan…"). */}
      <AbsoluteFill style={{ transform: `scale(${( 1 + 0.05 * clamp( ( t - b.taiwan.start ) / ( s.heroTo - b.taiwan.start ) ) ).toFixed( 4 )})`, transformOrigin: '50% 85%' }}>
        <Shot k="ai1" present={present} t={t} from={0} to={s.heroTo + 0.15} moveTo={b.taiwan.start} kb={{ s: [ 1.45, 1.1 ], x: [ 0, 0 ], y: [ 420, -40 ] }} amp={amp} fadeIn={0} easeMove="out" />
      </AbsoluteFill>
      {hasScale
        ? <Shot k="ai2" present={present} t={t} from={s.heroTo} to={s.scaleTo + 0.15} kb={{ s: [ 1.04, 1.16 ], x: [ 0, 0 ], y: [ 10, -30 ] }} />
        : <Shot k="ai1" present={present} t={t} from={s.heroTo} to={s.scaleTo + 0.15} kb={{ s: [ 1.3, 1.24 ], x: [ 0, 0 ], y: [ -270, 250 ] }} brightness={0.8} easeMove />}
      <Shot k="ai3" present={present} t={t} {...c3} />
      <Load t={t} o={vis( t, b.two.start + 0.3, b.two.end, 0.3 )} x={lx} y={ly} s={m3.s} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        {QUAKES_TT.map( ( q, i ) => {
          const [ x, y ] = pin( m3, q.x, q.y );
          return <Epicenter key={q.label} x={x} y={y} t={t} r={14} opacity={vis( t, quakeAt( b, i ), s.cutTo, 0.15 )} />;
        } )}
      </svg>
      <Note text={QUAKES_TT[0].label} x={72} y={950} o={vis( t, quakeAt( b, 0 ) + 0.1, s.cutTo, 0.25 )} color={COLORS.redHot} />
      <Note text={QUAKES_TT[1].label} x={1080 - SAFE.right + 10} y={880} align="right" o={vis( t, quakeAt( b, 1 ) + 0.1, s.cutTo, 0.25 )} color={AMBER} />
      <Note text="≈10 km deep · not to scale" x={72} y={810} o={vis( t, within( b, 'mags', 0.75 ), s.cutTo, 0.3 )} color={COLORS.textSupport} size={24} />
      <Shot k="ai4" present={present} t={t} {...c4} />
      <FaultTrace t={t} o={vis( t, b.fault.start + 0.3, s.faultTo, 0.4 )} from={b.fault.start + 0.3} m={m4} />
      <Shot k="ai5" present={present} t={t} from={s.faultTo} to={total + 1} moveTo={total} kb={{ s: [ 1.22, 1.04 ], x: [ 0, 0 ], y: [ -50, 0 ] }} fadeIn={0.2} fadeOut={0} />
      <AbsoluteFill style={{ background: 'rgba(4,8,14,0.3)', opacity: vis( t, b.end.start, total + 1, 0.4 ) }} />

      {/* Hook titles: both lines are up within half a second. */}
      <Headline text="Can a building" y={330} o={vis( t, 0.05, s.heroTo - 0.1, 0.12 )} size={88} {...C} />
      <Headline text="trigger an earthquake?" y={430} o={vis( t, 0.45, s.heroTo - 0.1, 0.12 )} size={88} color={AMBER} {...C} />
      <Note text="Taipei 101 · Taiwan" x={72} y={600} o={vis( t, b.taiwan.start + 0.2, s.heroTo - 0.1, 0.3 )} color={ICE} />
      <Headline text="508 m" y={330} o={vis( t, s.heroTo + 0.1, s.scaleTo, 0.25 )} size={130} {...C} />
      <Headline text="≈700,000 tonnes" y={480} o={vis( t, b.rose.start + 0.2, s.scaleTo, 0.25 )} size={80} color={AMBER} {...C} />
      <Note text="Local quakes ↑ after completion · Lin, GRL 2005" x={72} y={620} o={vis( t, within( b, 'rose', 0.5 ), s.scaleTo, 0.3 )} color={ICE} size={24} />
      <Headline text="Two felt earthquakes" y={300} o={vis( t, b.two.start + 0.15, s.cutTo, 0.25 )} size={80} {...C} />
      <Headline text="Hidden fault" y={300} o={vis( t, b.fault.start + 0.15, s.faultTo, 0.25 )} size={110} color={AMBER} {...C} />
      <Note text="Blind normal fault · inferred from quake data" x={1080 - SAFE.right + 10} y={440} align="right" o={vis( t, within( b, 'fault', 0.4 ), s.faultTo, 0.3 )} color={ICE} size={26} />
      <Note text="Tower load: +4.7 bar at the foundation (est.)" x={1080 - SAFE.right + 10} y={510} align="right" o={vis( t, b.weight.start + 0.3, s.faultTo, 0.3 )} color={AMBER} size={26} />
      <Headline text="Hypothesis" y={1020} o={vis( t, within( b, 'weight', 0.45 ), s.faultTo, 0.25 )} size={84} color={COLORS.text} {...C} />
      <Headline text="But…" y={380} o={vis( t, b.catch.start + 0.05, b.proof.start, 0.15 )} size={150} {...R} />
      <Headline text="Not proven" y={340} o={vis( t, within( b, 'proof', 0.4 ), b.q.start, 0.2 )} size={112} color={COLORS.redHot} {...R} />
      <Note text="Quakes ≈10 km deep · the load fades with depth" x={1080 - SAFE.right + 10} y={620} align="right" maxWidth={520} o={vis( t, within( b, 'proof', 0.55 ), b.q.start, 0.25 )} color={COLORS.textSupport} size={26} />
      <Headline text={<>Can a skyscraper <span style={{ color: AMBER }}>trigger an earthquake?</span></>} y={340} o={vis( t, b.q.start + 0.05, b.end.start, 0.2 )} size={76} {...R} />
      <Headline text="Possible." y={380} o={vis( t, b.end.start + 0.05, total + 1, 0.2 )} size={112} color={AMBER} {...R} />
      <Headline text="Not proven." y={510} o={vis( t, within( b, 'end', 0.5 ), total + 1, 0.2 )} size={112} {...R} />

      <div style={{ position: 'absolute', left: 72, top: 256, fontFamily: FONT.display, fontWeight: 800, fontSize: 28, letterSpacing: 3, color: ICE, opacity: 0.9 * vis( t, 0.2, b.catch.start, 0.4 ) }}>CAN THIS CAUSE AN EARTHQUAKE?</div>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Txt x={SAFE.right - 10} y={282} size={20} weight={700} spacing={3} anchor="end" color={COLORS.text} opacity={0.5}>AI VISUALIZATION</Txt>
      </svg>

      <AbsoluteFill style={{ transform: `translateY(${-CAPTION_LIFT}px)` }}>
        <Captions t={t} captions={audio?.captions ?? placeholderCaptions( META.script )} />
      </AbsoluteFill>
      {audio ? <Layers audio={audio} cues={cues( b )} total={total} /> : null}
      {simulateUi ? <TikTokUi /> : null}
    </AbsoluteFill>
  );
};
