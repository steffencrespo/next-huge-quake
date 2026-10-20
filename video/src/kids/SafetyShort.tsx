/**
 * "What Should You Do During an Earthquake?" (Earthquake Science for Kids 02): Drop, Cover, Hold On.
 * A friendly kid in a classroom shows each step; the room wobbles gently and nothing is damaged. Shaking stops when the
 * "hold on" line ends. Guidance follows USGS, Ready.gov and the Earthquake Country Alliance: drop to hands and knees,
 * cover head and neck (under a sturdy table when one is close), hold on until the shaking stops, stay inside.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { FONT } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { beatsFor, episodeSeconds, placeholderCaptions } from '../edu/episodes.js';
import type { Beats } from '../edu/episodes.js';
import { at, clamp, f1, prog, span, vis } from '../edu/kit.js';
import { KIDS_EPISODE_SAFETY, KIDS_PALETTE as K } from './config.js';
import { wordStart } from './audio.js';
import { Closing, KidsCaptions, Layers, kidsShortSchema } from './KidsShort.js';
import type { KidsShortProps } from './KidsShort.js';
import { Bubble, Mascot, SkyBackdrop, popEase } from './parts.js';

const FPS = 30;
const META = KIDS_EPISODE_SAFETY;
export const calculateSafetyMetadata: CalculateMetadataFunction<KidsShortProps> = ( { props } ) => ( { durationInFrames: episodeSeconds( META, props.audio ) * FPS } );

type SceneProps = { t: number; o: number; b: Beats };

const lerp = ( a: number, b: number, x: number ) => a + ( b - a ) * clamp( x );
const SKIN = '#ffcfa8';
const FLOOR = 1230;

// ---------- the kid: poses are keypoints relative to the floor, blended between standing, hands-and-knees and covering ----------

type Pose = { head: [ number, number ]; shoulder: [ number, number ]; hip: [ number, number ]; knee: [ number, number ]; foot: [ number, number ]; elbow: [ number, number ]; hand: [ number, number ] };
const STAND: Pose = { head: [ 0, -345 ], shoulder: [ 0, -290 ], hip: [ 0, -170 ], knee: [ 5, -85 ], foot: [ 30, -8 ], elbow: [ -10, -220 ], hand: [ -5, -160 ] };
const KNEES: Pose = { head: [ 170, -215 ], shoulder: [ 105, -190 ], hip: [ -75, -150 ], knee: [ -75, -30 ], foot: [ -170, -22 ], elbow: [ 108, -100 ], hand: [ 112, -15 ] };
const COVER: Pose = { head: [ 140, -120 ], shoulder: [ 85, -170 ], hip: [ -75, -150 ], knee: [ -75, -30 ], foot: [ -170, -22 ], elbow: [ 70, -235 ], hand: [ 135, -165 ] };
const blend = ( a: Pose, b: Pose, x: number ): Pose => Object.fromEntries( ( Object.keys( a ) as ( keyof Pose )[] ).map( k => [ k, [ lerp( a[k][0], b[k][0], x ), lerp( a[k][1], b[k][1], x ) ] ] ) ) as Pose;

const Limb: React.FC<{ pts: [ number, number ][]; color: string; w: number }> = ( { pts, color, w } ) => {
  const d = pts.map( ( p, i ) => `${i ? 'L' : 'M'} ${f1( p[0] )} ${f1( p[1] )}` ).join( ' ' );
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={K.ink} strokeWidth={w + 12} />
      <path d={d} stroke={color} strokeWidth={w} />
    </g>
  );
};

const Kid: React.FC<{ x: number; pose: Pose; hold: number; t: number; mood: 'wow' | 'grit' | 'happy' | 'smile'; scale?: number }> = ( { x, pose, hold, t, mood, scale = 1 } ) => {
  const p = pose;
  const reach: [ number, number ] = [ lerp( p.hand[0], 230, hold ), lerp( p.hand[1], -110, hold ) ];
  return (
    <g transform={`translate(${f1( x )} ${FLOOR}) scale(${scale})`}>
      <ellipse cx={0} cy={4} rx={190} ry={14} fill="#000" opacity={0.12} />
      {/* far arm (the one that grips the table leg) */}
      <Limb pts={[ p.shoulder, [ lerp( p.elbow[0], 165, hold ), lerp( p.elbow[1] + 30, -125, hold ) ], reach ]} color={SKIN} w={26} />
      <Limb pts={[ p.hip, p.knee, p.foot ]} color={K.blue} w={44} />
      <Limb pts={[ p.hip, p.shoulder ]} color={K.orange} w={78} />
      {/* near arm: hangs, props the body, or covers the neck */}
      <Limb pts={[ p.shoulder, p.elbow, p.hand ]} color={SKIN} w={26} />
      <circle cx={p.head[0]} cy={p.head[1]} r={62} fill={SKIN} stroke={K.ink} strokeWidth={8} />
      <path d={`M ${f1( p.head[0] - 62 )} ${f1( p.head[1] - 6 )} Q ${f1( p.head[0] )} ${f1( p.head[1] - 100 )} ${f1( p.head[0] + 62 )} ${f1( p.head[1] - 10 )} Q ${f1( p.head[0] )} ${f1( p.head[1] - 40 )} ${f1( p.head[0] - 62 )} ${f1( p.head[1] - 6 )} Z`} fill="#6b3f1d" stroke={K.ink} strokeWidth={6} strokeLinejoin="round" />
      <g transform={`translate(${f1( p.head[0] + 12 )} ${f1( p.head[1] + 4 )})`}><Face2 mood={mood} t={t} /></g>
    </g>
  );
};

/** Small face for the kid, drawn at the head centre. */
const Face2: React.FC<{ mood: 'wow' | 'grit' | 'happy' | 'smile'; t: number }> = ( { mood, t } ) => {
  const blink = t % 3.1 < 0.12 ? 0.1 : 1;
  return (
    <g>
      {[ -18, 20 ].map( dx => (
        <g key={dx} transform={`translate(${dx} -4) scale(1 ${blink})`}>
          <ellipse rx={9} ry={mood === 'wow' ? 12 : 10} fill="#fff" stroke={K.ink} strokeWidth={3} />
          <circle cx={3} cy={1} r={4.5} fill={K.ink} />
        </g>
      ) )}
      {mood === 'wow' ? <ellipse cx={2} cy={26} rx={7} ry={9} fill="#c2415d" stroke={K.ink} strokeWidth={3} />
        : mood === 'grit' ? <path d="M -14 26 l 7 -4 l 7 8 l 7 -8 l 7 8 l 7 -4" fill="none" stroke={K.ink} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
          : mood === 'happy' ? <path d="M -16 22 Q 2 46 20 22 Z" fill="#c2415d" stroke={K.ink} strokeWidth={4} strokeLinejoin="round" />
            : <path d="M -14 24 Q 2 36 18 24" fill="none" stroke={K.ink} strokeWidth={4} strokeLinecap="round" />}
    </g>
  );
};

// ---------- the classroom ----------

const TABLE = { cx: 740, half: 240, top: FLOOR - 310 };

const Room: React.FC<{ t: number; o: number; jx: number; jy: number; mood: 'wow' | 'grit' | 'happy' | 'smile'; kidX: number; pose: Pose; hold: number; cover: number; lamp: number; tableGlow: number }> = ( { t, o, jx, jy, mood, kidX, pose, hold, lamp, tableGlow, o: op } ) => (
  <g opacity={op} transform={`translate(${f1( jx )} ${f1( jy )})`}>
    <clipPath id="room"><rect x={60} y={440} width={960} height={FLOOR - 440 + 90} rx={50} /></clipPath>
    <g clipPath="url(#room)">
      <rect x={60} y={440} width={960} height={900} fill="#ffe9b8" />
      <rect x={60} y={FLOOR} width={960} height={200} fill="#d9a066" />
      <rect x={60} y={FLOOR - 8} width={960} height={14} fill="#b87740" />
      {/* window, picture, swinging lamp */}
      <rect x={110} y={540} width={230} height={250} rx={20} fill="#bfeaff" stroke={K.ink} strokeWidth={8} />
      <line x1={225} x2={225} y1={540} y2={790} stroke={K.ink} strokeWidth={6} /><line x1={110} x2={340} y1={665} y2={665} stroke={K.ink} strokeWidth={6} />
      <rect x={470} y={560} width={150} height={110} rx={10} fill={K.pink} stroke={K.ink} strokeWidth={7} transform={`rotate(${f1( lamp * 4 )} 545 560)`} />
      <g transform={`rotate(${f1( lamp * 9 )} 880 440)`}>
        <line x1={880} x2={880} y1={440} y2={580} stroke={K.ink} strokeWidth={6} />
        <path d="M 830 620 L 850 580 H 910 L 930 620 Z" fill={K.sun} stroke={K.ink} strokeWidth={7} strokeLinejoin="round" />
      </g>
    </g>
    <rect x={60} y={440} width={960} height={FLOOR - 440 + 90} rx={50} fill="none" stroke={K.ink} strokeWidth={9} />
    {/* sturdy table */}
    <g>
      {[ -1, 1 ].map( s => <rect key={s} x={TABLE.cx + s * ( TABLE.half - 30 ) - 18} y={TABLE.top} width={36} height={FLOOR - TABLE.top} rx={8} fill="#c98a52" stroke={K.ink} strokeWidth={7} /> )}
      <rect x={TABLE.cx - TABLE.half} y={TABLE.top - 30} width={TABLE.half * 2} height={44} rx={14} fill="#e0a468" stroke={K.ink} strokeWidth={8} />
      {tableGlow > 0.01 ? <rect x={TABLE.cx - TABLE.half - 10} y={TABLE.top - 40} width={TABLE.half * 2 + 20} height={64} rx={20} fill="none" stroke={K.sun} strokeWidth={10} opacity={tableGlow * ( 0.5 + 0.5 * Math.sin( t * 8 ) )} /> : null}
    </g>
    <Kid x={kidX} pose={pose} hold={hold} t={t} mood={mood} />
  </g>
);

// ---------- scenes ----------

const Hook: React.FC<SceneProps> = ( { t, o, b } ) => {
  const enter = popEase( t / 0.7 );
  return (
    <g opacity={o}>
      <Bubble x={540} y={380} size={86} scale={enter}>IF THE GROUND</Bubble>
      <Bubble x={540} y={480} size={86} scale={enter}>STARTED SHAKING</Bubble>
      <Bubble x={540} y={620} size={140} color={K.pink} scale={enter}>RIGHT NOW...</Bubble>
      <Mascot x={540} y={1000} r={230 * Math.min( 1, enter )} t={t} mood={t > at( b, 'hook', 2.4 ) ? 'wow' : 'happy'} tilt={Math.sin( t * 2.4 ) * 4} />
      <Bubble x={540} y={1330} size={96} color={K.purple} scale={prog( t, at( b, 'hook', 3.2 ), 0.4 )}>WHAT TO DO?</Bubble>
    </g>
  );
};

const THREE = [ { word: 'DROP', color: K.orange, re: /drop/i }, { word: 'COVER', color: K.teal, re: /cover/i }, { word: 'HOLD ON', color: K.purple, re: /hold/i } ];

const Three: React.FC<SceneProps & { audio: KidsShortProps['audio'] }> = ( { t, o, b, audio } ) => (
  <g opacity={o}>
    <Mascot x={540} y={560} r={130} t={t} mood="happy" bounce={0.6} />
    {THREE.map( ( w, i ) => {
      const t0 = wordStart( b, audio, 'three', w.re, 2 + i * 0.9 ) - 0.1;
      const k = popEase( ( t - t0 ) / 0.45 );
      return (
        <g key={w.word} transform={`translate(540 ${900 + i * 230}) scale(${Math.max( 0.001, k ).toFixed( 3 )})`}>
          <rect x={-380} y={-90} width={760} height={180} rx={60} fill={w.color} stroke={K.ink} strokeWidth={9} />
          <text x={-290} y={30} fontFamily={FONT.ui} fontWeight={900} fontSize={90} fill="#fff" stroke={K.ink} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">{i + 1}</text>
          <text x={40} y={34} textAnchor="middle" fontFamily={FONT.ui} fontWeight={900} fontSize={w.word === 'HOLD ON' ? 112 : 124} fill="#fff" stroke={K.ink} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">{w.word}!</text>
        </g>
      );
    } )}
  </g>
);

const Label: React.FC<{ text: string; color: string; t: number; t0: number; t1: number }> = ( { text, color, t, t0, t1 } ) => {
  const k = popEase( ( t - t0 ) / 0.4 ) * clamp( ( t1 - t ) / 0.3 );
  return k > 0.01 ? (
    <g transform={`translate(540 1380) scale(${Math.max( 0.001, k ).toFixed( 3 )})`}>
      <rect x={-330} y={-70} width={660} height={140} rx={50} fill={color} stroke={K.ink} strokeWidth={9} />
      <text x={0} y={34} textAnchor="middle" fontFamily={FONT.ui} fontWeight={900} fontSize={96} fill="#fff" stroke={K.ink} strokeWidth={12} paintOrder="stroke" strokeLinejoin="round">{text}</text>
    </g>
  ) : null;
};

const Inside: React.FC<{ t: number; t0: number; o: number }> = ( { t, t0, o } ) => {
  const k = popEase( ( t - t0 ) / 0.5 );
  return (
    <g opacity={o}>
      {/* a door out of the room, crossed out */}
      <g transform={`translate(200 ${FLOOR - 230}) scale(${( 0.72 * Math.max( 0.001, k ) ).toFixed( 3 )})`}>
        <rect x={-90} y={-130} width={180} height={280} rx={16} fill="#8fd0ff" stroke={K.ink} strokeWidth={8} opacity={0.0} />
        <circle cx={0} cy={0} r={150} fill="#fff" opacity={0.92} stroke={K.ink} strokeWidth={9} />
        <rect x={-55} y={-95} width={110} height={190} rx={12} fill="#b87740" stroke={K.ink} strokeWidth={8} />
        <circle cx={30} cy={5} r={8} fill={K.sun} />
        <circle r={150} fill="none" stroke="#e5383b" strokeWidth={22} />
        <line x1={-106} y1={-106} x2={106} y2={106} stroke="#e5383b" strokeWidth={22} strokeLinecap="round" />
      </g>
      <Bubble x={540} y={1410} size={88} color="#e5383b" scale={Math.max( 0.001, k )}>STAY INSIDE!</Bubble>
    </g>
  );
};

const Recap: React.FC<SceneProps> = ( { t, o, b } ) => (
  <g opacity={o}>
    <Mascot x={540} y={520} r={150} t={t} mood="happy" />
    {THREE.map( ( w, i ) => {
      const k = popEase( ( t - ( at( b, 'recap', 0.1 + i * 0.7 ) ) ) / 0.4 );
      return (
        <g key={w.word} transform={`translate(540 ${860 + i * 200}) scale(${Math.max( 0.001, k ).toFixed( 3 )})`}>
          <rect x={-380} y={-80} width={760} height={160} rx={55} fill={w.color} stroke={K.ink} strokeWidth={9} />
          <text x={0} y={32} textAnchor="middle" fontFamily={FONT.ui} fontWeight={900} fontSize={104} fill="#fff" stroke={K.ink} strokeWidth={13} paintOrder="stroke" strokeLinejoin="round">{w.word}!</text>
          <circle cx={310} cy={0} r={42} fill="#fff" stroke={K.ink} strokeWidth={7} />
          <path d="M 288 2 L 305 20 L 336 -18" fill="none" stroke={K.green} strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    } )}
  </g>
);

// ---------- shell ----------

export const KidsDropCoverHold: React.FC<KidsShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const b = beatsFor( META, audio );
  const ctaStart = b.cta.start - 0.2;

  // shaking runs from the "rumble" line until the "hold on" line ends, then settles
  const shakeOn = clamp( ( t - ( at( b, 'scene', 0.2 ) ) ) / 0.5 ) * clamp( ( b.hold.end - 0.3 - t ) / 0.6 );
  const jx = Math.sin( t * 33 ) * 9 * shakeOn;
  const jy = Math.sin( t * 41 + 1 ) * 5 * shakeOn;
  const lamp = Math.sin( t * 17 ) * shakeOn;

  const dropP = prog( t, at( b, 'drop', 0.5 ), 0.7 );
  const crawl = prog( t, at( b, 'cover', 0.2 ), 1.8 );
  const coverP = prog( t, at( b, 'cover', 2.3 ), 0.6 );
  const holdP = prog( t, at( b, 'hold', 0.3 ), 0.6 );
  const kidX = lerp( 250, TABLE.cx - 20, crawl );
  const wobble = t > at( b, 'cover', 0.2 ) && crawl < 1 ? Math.sin( t * 9 ) * 0.04 : 0;
  const pose = blend( blend( STAND, KNEES, dropP + wobble ), COVER, coverP );
  const mood = t < at( b, 'drop', 0 ) ? 'wow' : t < b.hold.end - 0.3 ? 'grit' : 'happy';

  const roomO = Math.max( span( t, b, 'scene', 'three' ), span( t, b, 'drop', 'recap' ) );
  const tag = vis( t, b.scene.start, ctaStart, 0.5 );
  return (
    <AbsoluteFill style={{ background: K.skyTop }}>
      <SkyBackdrop t={t} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Hook t={t} b={b} o={span( t, b, 'hook', 'scene' )} />
        <Room t={t} o={roomO} jx={jx} jy={jy} mood={mood} kidX={kidX} pose={pose} hold={holdP} cover={coverP} lamp={lamp} tableGlow={prog( t, at( b, 'cover', 3 ), 0.4 ) * clamp( ( b.hold.start - t ) / 0.4 )} />
        <Bubble x={540} y={400} size={64} color={K.purple} opacity={span( t, b, 'scene', 'three' ) * prog( t, at( b, 'scene', 0.3 ), 0.4 )}>RUMBLE, RUMBLE!</Bubble>
        <Three t={t} b={b} audio={audio} o={span( t, b, 'three', 'drop' )} />
        <Label text="DROP!" color={K.orange} t={t} t0={at( b, 'drop', 0.1 )} t1={b.cover.start} />
        <Label text="COVER!" color={K.teal} t={t} t0={at( b, 'cover', 0.1 )} t1={b.hold.start} />
        <Label text="HOLD ON!" color={K.purple} t={t} t0={at( b, 'hold', 0.1 )} t1={b.inside.start} />
        <Bubble x={540} y={400} size={56} color={K.teal} opacity={prog( t, at( b, 'cover', 1 ), 0.4 ) * clamp( ( b.hold.start - t ) / 0.3 )}>HEAD AND NECK PROTECTED</Bubble>
        <Bubble x={540} y={400} size={64} color={K.green} opacity={prog( t, b.hold.end - 0.1, 0.4 ) * clamp( ( b.recap.start - t ) / 0.3 + ( t < b.inside.start ? 1 : 0 ) )}>SHAKING STOPPED</Bubble>
        <Inside t={t} t0={at( b, 'inside', 0.2 )} o={span( t, b, 'inside', 'recap' )} />
        <Recap t={t} b={b} o={span( t, b, 'recap', 'cta' )} />
      </svg>
      {tag > 0.01 ? (
        <div style={{ position: 'absolute', left: 72, top: 200, opacity: tag }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 900, fontSize: 30, letterSpacing: 2, color: K.ink, background: K.sun, border: `5px solid ${K.ink}`, padding: '8px 24px', borderRadius: 30, display: 'inline-block' }}>EARTHQUAKE SCIENCE FOR KIDS · 02</div>
        </div>
      ) : null}
      <Closing t={t} start={ctaStart} />
      {audio ? <Layers audio={audio} total={durationInFrames / FPS} /> : null}
      <KidsCaptions t={t} captions={audio?.captions ?? placeholderCaptions( META.script )} />
    </AbsoluteFill>
  );
};
export { kidsShortSchema };
