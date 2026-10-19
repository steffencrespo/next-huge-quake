/**
 * "Why Does the Earth Shake?" (Earthquake Science for Kids 01): bright, silent-first visuals for ages 7 to 11.
 * Scenes follow the narration beats (planned timing now, real timing once narration exists), reusing the educational
 * kit helpers and the placeholder-caption timing. Sliding and sticking along a fault is shown with two friendly blocks;
 * nothing here depicts damage.
 */
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { z } from 'zod';
import { FONT } from '../design/tokens.js';
import { BRAND } from '../design/brand.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { beatsFor, episodeSeconds, placeholderCaptions } from '../edu/episodes.js';
import type { Beats } from '../edu/episodes.js';
import { at, clamp, f1, prog, span, vis } from '../edu/kit.js';
import { KIDS_EPISODE, KIDS_PALETTE as K } from './config.js';
import { kidsAudioSchema, kidsMusicGain, wordStart } from './audio.js';
import type { KidsAudio } from './audio.js';
import { Arrow, Bubble, Face, Mascot, SkyBackdrop, Star, popEase } from './parts.js';

const FPS = 30;
const META = KIDS_EPISODE;

export const kidsShortSchema = z.object( { audio: kidsAudioSchema.optional() } );
export type KidsShortProps = z.infer<typeof kidsShortSchema>;
export const calculateKidsMetadata: CalculateMetadataFunction<KidsShortProps> = ( { props } ) => ( { durationInFrames: episodeSeconds( META, props.audio ) * FPS } );

type SceneProps = { t: number; o: number; b: Beats };

/** Narration clips with the quiet music bed underneath. No sound effects: the pacing and the voice carry the video. */
const Layers: React.FC<{ audio: KidsAudio; total: number }> = ( { audio, total } ) => (
  <>
    <Audio src={staticFile( audio.musicFile )} volume={f => kidsMusicGain( f / FPS, audio.narrationStart, audio.narrationEnd, total )} />
    {audio.clips.map( clip => (
      <Sequence key={clip.id} from={Math.round( clip.start * FPS )} layout="none">
        <Audio src={staticFile( clip.file )} volume={clip.gain ?? 1} />
      </Sequence>
    ) )}
  </>
);

// ---------- 1. hook ----------

const Hook: React.FC<SceneProps> = ( { t, o, b } ) => {
  const enter = popEase( t / 0.7 );
  return (
    <g opacity={o}>
      <Bubble x={540} y={420} size={104} scale={enter}>WHY DOES THE</Bubble>
      <Bubble x={540} y={540} size={132} color={K.pink} scale={enter}>EARTH SHAKE?</Bubble>
      <Mascot x={540} y={960} r={250 * Math.min( 1, enter )} t={t} mood={t > at( b, 'hook', 1.4 ) ? 'wow' : 'happy'} tilt={Math.sin( t * 2.4 ) * 4} />
      {[ [ 220, 800, 0 ], [ 860, 760, 1 ], [ 800, 1180, 2 ], [ 250, 1150, 3 ] ].map( ( [ x, y, i ] ) => (
        <Bubble key={i} x={x} y={y + Math.sin( t * 2 + i ) * 14} size={110} color={[ K.orange, K.purple, K.teal, K.blue ][i]} rotate={[ -14, 12, -8, 16 ][i]}>?</Bubble>
      ) )}
    </g>
  );
};

// ---------- 2. the plates puzzle ----------

const LATTICE = [
  [ [ -340, -340 ], [ -100, -340 ], [ 110, -340 ], [ 340, -340 ] ],
  [ [ -340, -95 ], [ -130, -60 ], [ 90, -120 ], [ 340, -80 ] ],
  [ [ -340, 110 ], [ -60, 140 ], [ 140, 90 ], [ 340, 130 ] ],
  [ [ -340, 340 ], [ -90, 340 ], [ 120, 340 ], [ 340, 340 ] ]
];
const PIECE_COLORS = [ K.orange, K.pink, K.teal, K.blue, K.purple, K.green, K.sun, K.orange, K.pink ];
const R = 330;

const Puzzle: React.FC<SceneProps> = ( { t, o, b } ) => {
  const cx = 540;
  const cy = 800;
  const split = prog( t, at( b, 'plates', 0.3 ), 0.9 );
  const pop = popEase( ( t - at( b, 'puzzle', 0 ) ) / 0.8 );
  const cells = Array.from( { length: 9 }, ( _, i ) => {
    const r = Math.floor( i / 3 );
    const c = i % 3;
    const pts = [ LATTICE[r][c], LATTICE[r][c + 1], LATTICE[r + 1][c + 1], LATTICE[r + 1][c] ];
    const mx = pts.reduce( ( s, p ) => s + p[0], 0 ) / 4;
    const my = pts.reduce( ( s, p ) => s + p[1], 0 ) / 4;
    const len = Math.hypot( mx, my ) || 1;
    const push = split * 14 + Math.sin( t * 0.9 + i * 1.7 ) * 5 * split;
    return { i, pts, dx: ( mx / len ) * push, dy: ( my / len ) * push };
  } );
  const nail = prog( t, at( b, 'slow', 0.6 ), 3 );
  const labelIn = prog( t, at( b, 'plates', 1.2 ), 0.5 );
  return (
    <g opacity={o}>
      <g transform={`translate(${cx} ${cy}) scale(${Math.max( 0.001, pop ).toFixed( 3 )})`}>
        <clipPath id="globe"><circle r={R} /></clipPath>
        <circle r={R} fill="#ffd28a" />
        <g clipPath="url(#globe)">
          {cells.map( ( c ) => (
            <polygon key={c.i} points={c.pts.map( p => `${p[0] + c.dx},${p[1] + c.dy}` ).join( ' ' )} fill={PIECE_COLORS[c.i]} stroke="#fff" strokeWidth={9} strokeLinejoin="round" />
          ) )}
        </g>
        <circle r={R} fill="none" stroke={K.ink} strokeWidth={12} />
      </g>
      <Mascot x={880} y={440} r={85} t={t} mood="happy" tilt={-8} bounce={0.6} look={-1} />
      <g opacity={labelIn}>
        <rect x={190} y={1170} width={700} height={96} rx={48} fill={K.white} stroke={K.ink} strokeWidth={7} />
        <text x={540} y={1236} textAnchor="middle" fontFamily={FONT.ui} fontWeight={900} fontSize={50} fill={K.ink}>TECTONIC PLATES</text>
      </g>
      {/* "slow as fingernails": a finger whose nail grows a tiny bit */}
      <g opacity={prog( t, at( b, 'slow', 0.3 ), 0.5 ) * clamp( ( at( b, 'stuck', 0 ) - t ) / 0.3 )}>
        <g transform="translate(150 900)">
          <rect x={-46} y={-30} width={92} height={190} rx={46} fill="#ffcfa8" stroke={K.ink} strokeWidth={6} />
          <rect x={-33} y={-26 - nail * 16} width={66} height={64 + nail * 16} rx={26} fill="#ffe9dc" stroke={K.ink} strokeWidth={4} />
          <rect x={-33} y={-26 - nail * 16} width={66} height={nail * 16 + 6} rx={6} fill="#fff" opacity={0.0} />
        </g>
        <Bubble x={150} y={1090} size={38}>SLOOOOW</Bubble>
      </g>
      {[ [ 410, 650, -1 ], [ 700, 760, 1 ], [ 540, 980, -1 ] ].map( ( [ x, y, d ], i ) => (
        <Arrow key={i} x={x + Math.sin( t * 1.2 + i ) * 8} y={y} dir={d as 1 | -1} color="#fff" size={70} opacity={prog( t, at( b, 'slow', 0 ), 0.6 ) * clamp( ( at( b, 'stuck', 0 ) - t ) / 0.4 )} />
      ) )}
    </g>
  );
};

// ---------- 3. blocks: stuck, stress, snap, energy ----------

const FAULT_Y = 800;
const BX0 = 140;
const BX1 = 940;
const zig = ( off: number, dir: 1 | -1 ): string[] => {
  const pts: string[] = [];
  for ( let x = BX0; x <= BX1; x += 40 ) {
    const bump = ( ( x - BX0 ) / 40 ) % 2 === 0 ? 0 : 18;
    pts.push( `${x + off},${FAULT_Y + dir * bump}` );
  }
  return pts;
};

const Blocks: React.FC<SceneProps & { tSlip: number }> = ( { t, o, b, tSlip } ) => {
  const enter = popEase( ( t - at( b, 'stuck', 0 ) ) / 0.7 );
  const build = clamp( ( t - at( b, 'stress', 0 ) ) / ( tSlip - at( b, 'stress', 0 ) ) );
  const m = ( 8 + 46 * build ) * ( t < tSlip ? 1 : 1 );
  const slip = popEase( ( t - tSlip ) / 0.35 );
  const edge = m * Math.min( 1.05, slip );
  const strain = m - edge;
  const stress = t < tSlip ? build : clamp( 1 - ( t - tSlip ) / 0.5 );
  const bump = t > tSlip ? Math.exp( -( t - tSlip ) * 7 ) * Math.sin( ( t - tSlip ) * 50 ) * 3 : 0;
  const mood = t < at( b, 'stress', 0 ) ? 'smile' : t < tSlip ? 'grit' : t < at( b, 'waves', 0 ) ? 'wow' : 'happy';
  const topPts = [ `${BX0 + m},560`, `${BX1 + m},560`, ...zig( edge, 1 ).reverse() ].join( ' ' );
  const botPts = [ ...zig( -edge, -1 ), `${BX1 - m},1040`, `${BX0 - m},1040` ].join( ' ' );
  const shake = t > tSlip ? 0 : Math.sin( t * 40 ) * build * 1.6;
  const push = prog( t, at( b, 'stress', 0 ), 0.4 ) * clamp( ( tSlip - t ) / 0.15 );
  const burst = prog( t, tSlip, 0.25 ) * clamp( 1 - ( t - tSlip - 0.6 ) / 0.5 );
  const energyT = t - at( b, 'energy', 0 );
  return (
    <g opacity={o} transform={`translate(0 ${f1( ( 1 - Math.min( 1, enter ) ) * 300 )})`}>
      <g transform={`translate(${f1( shake )} 0)`}>
        <polygon points={topPts} fill={K.orange} stroke={K.ink} strokeWidth={9} strokeLinejoin="round" />
        <polygon points={botPts} fill={K.teal} stroke={K.ink} strokeWidth={9} strokeLinejoin="round" />
      </g>
      <Face x={300 + m * 0.7 + bump} y={680} s={170} mood={mood} t={t} />
      <Face x={780 - m * 0.7 - bump} y={920} s={170} mood={mood === 'grit' ? 'grit' : mood} t={t + 1} />
      <Arrow x={760 + m} y={640} dir={1} color={K.sun} size={110 + 30 * push} opacity={push} />
      <Arrow x={320 - m} y={980} dir={-1} color={K.sun} size={110 + 30 * push} opacity={push} />
      <rect x={170} y={1040 + 36} width={740} height={26} rx={13} fill="#fff" stroke={K.ink} strokeWidth={5} opacity={prog( t, at( b, 'stress', 0 ) - 0.3, 0.5 )} />
      <rect x={174} y={1040 + 40} width={Math.max( 0, 732 * stress )} height={18} rx={9} fill={stress > 0.75 ? K.orange : K.sun} opacity={prog( t, at( b, 'stress', 0 ) - 0.3, 0.5 )} />
      <Bubble x={540} y={1160} size={46} opacity={prog( t, at( b, 'stress', 0 ) - 0.3, 0.5 ) * clamp( ( tSlip - t ) / 0.2 )}>STRESS BUILDING UP</Bubble>
      <Bubble x={540} y={FAULT_Y + 8} size={64} color={K.pink} opacity={prog( t, at( b, 'stuck', 0 ) + 2.2, 0.3 ) * clamp( ( at( b, 'stress', 0 ) - t ) / 0.3 )} rotate={-4}>STUCK!</Bubble>
      <Bubble x={540} y={520} size={40} opacity={prog( t, at( b, 'stuck', 0 ) + 1, 0.5 ) * clamp( ( tSlip - t ) / 0.3 )}>A FAULT, SEEN FROM ABOVE</Bubble>
      {burst > 0.01 ? <Star x={540} y={FAULT_Y} r={150 * burst + 20} fill={K.sun} rotate={t * 40} /> : null}
      {burst > 0.01 ? <Bubble x={540} y={FAULT_Y + 28} size={92} color={K.pink} scale={burst}>SNAP!</Bubble> : null}
      {energyT > 0 ? Array.from( { length: 3 }, ( _, k ) => {
        const age = energyT - k * 0.5;
        return age > 0 ? <circle key={k} cx={540} cy={FAULT_Y} r={age * 260} fill="none" stroke={[ K.sun, K.pink, K.white ][k]} strokeWidth={14} opacity={clamp( 1 - age / 1.6 )} /> : null;
      } ) : null}
      <Bubble x={540} y={1260} size={50} color={K.purple} opacity={prog( t, at( b, 'energy', 0.2 ), 0.4 ) * clamp( ( at( b, 'waves', 0 ) - t ) / 0.3 + 0.2 )}>ENERGY RELEASED!</Bubble>
    </g>
  );
};

// ---------- 4. waves reach a friendly town ----------

const HOUSES = [ { x: 230, y: 1130, c: K.pink }, { x: 850, y: 1110, c: K.sun }, { x: 560, y: 1190, c: K.blue } ];
const EPI = { x: 540, y: 760 };
const SPEED = 190;
const GAP = 0.9;

const House: React.FC<{ x: number; y: number; c: string; wiggle: number; t: number }> = ( { x, y, c, wiggle, t } ) => (
  <g transform={`translate(${f1( x + Math.sin( t * 24 ) * 7 * wiggle )} ${f1( y )}) rotate(${f1( Math.sin( t * 19 + x ) * 4 * wiggle )} 0 0)`}>
    <rect x={-52} y={-70} width={104} height={80} rx={8} fill={c} stroke={K.ink} strokeWidth={6} />
    <polygon points="-68,-68 0,-130 68,-68" fill="#ff7b5c" stroke={K.ink} strokeWidth={6} strokeLinejoin="round" />
    <rect x={-14} y={-34} width={28} height={44} rx={6} fill="#fff" stroke={K.ink} strokeWidth={4} />
    <circle cx={-34} cy={-48} r={9} fill="#fff" stroke={K.ink} strokeWidth={3} />
    <circle cx={34} cy={-48} r={9} fill="#fff" stroke={K.ink} strokeWidth={3} />
    <path d="M -10 -4 Q 0 6 10 -4" fill="none" stroke={K.ink} strokeWidth={4} strokeLinecap="round" />
  </g>
);

const Waves: React.FC<SceneProps> = ( { t, o, b } ) => {
  const t0 = at( b, 'waves', 0.4 );
  const intro = popEase( ( t - at( b, 'energy', 0 ) ) / 0.6 );
  const colors = [ K.pink, K.sun, K.blue ];
  const rings = Array.from( { length: 7 }, ( _, k ) => ( { k, r: ( t - t0 - k * GAP ) * SPEED } ) ).filter( g => g.r > 0 && g.r < 640 );
  const wiggles = HOUSES.map( h => rings.reduce( ( s, g ) => s + clamp( 1 - Math.abs( g.r - Math.hypot( h.x - EPI.x, h.y - EPI.y ) ) / 70 ) * clamp( 1 - g.r / 700 ), 0 ) );
  const shakeLine = prog( t, at( b, 'shake', 0.2 ), 0.4 );
  return (
    <g opacity={o}>
      <g transform={`translate(0 ${f1( ( 1 - Math.min( 1, intro ) ) * 120 )})`}>
        <rect x={60} y={470} width={960} height={860} rx={60} fill="#9be77f" stroke={K.ink} strokeWidth={9} />
        <clipPath id="ground"><rect x={60} y={470} width={960} height={860} rx={60} /></clipPath>
        <g clipPath="url(#ground)">
          {rings.map( g => <circle key={g.k} cx={EPI.x} cy={EPI.y} r={g.r} fill="none" stroke={colors[g.k % 3]} strokeWidth={26 - g.r / 40} opacity={clamp( 1 - g.r / 680 ) * 0.95} /> )}
        </g>
        <Star x={EPI.x} y={EPI.y} r={46} fill={K.sun} rotate={t * 30} />
        {HOUSES.map( ( h, i ) => <House key={i} x={h.x} y={h.y} c={h.c} wiggle={clamp( wiggles[i] * 1.2 )} t={t} /> )}
      </g>
      <Bubble x={540} y={410} size={56} color={K.purple} opacity={prog( t, at( b, 'waves', 0 ), 0.4 )}>SEISMIC WAVES</Bubble>
      <Bubble x={540} y={1400} size={50} opacity={prog( t, at( b, 'waves', 1.6 ), 0.5 ) * ( 1 - shakeLine )}>like ripples in a pond</Bubble>
      <Bubble x={540} y={1400} size={68} color={K.pink} rotate={Math.sin( t * 20 ) * 3} opacity={shakeLine}>WIGGLE, WIGGLE!</Bubble>
    </g>
  );
};

// ---------- 5. scientists learn from the waves ----------

const SEISMO: string = ( () => {
  const pts: string[] = [];
  for ( let i = 0; i <= 160; i++ ) {
    const x = 160 + i * 5;
    const env = i < 50 ? 0.06 : i < 70 ? 1 : Math.exp( -( i - 70 ) / 28 );
    pts.push( `${x},${f1( Math.sin( i * 1.1 ) * 70 * env * ( 0.7 + 0.3 * Math.sin( i * 0.37 ) ) )}` );
  }
  return pts.join( ' ' );
} )();

const Learn: React.FC<SceneProps> = ( { t, o, b } ) => {
  const draw = prog( t, at( b, 'learn', 0.2 ), b.learn.end - b.learn.start - 0.4 );
  const ask = popEase( ( t - at( b, 'end', 0 ) ) / 0.6 );
  return (
    <g opacity={o}>
      <rect x={110} y={440} width={860} height={300} rx={30} fill="#fff" stroke={K.ink} strokeWidth={8} />
      <clipPath id="paper"><rect x={118} y={448} width={844} height={284} rx={24} /></clipPath>
      <g clipPath="url(#paper)">
        {Array.from( { length: 9 }, ( _, i ) => <line key={i} x1={160 + i * 100} x2={160 + i * 100} y1={448} y2={732} stroke="#cfe7ff" strokeWidth={4} /> )}
        <clipPath id="reveal"><rect x={110} y={440} width={Math.max( 1, 860 * draw )} height={300} /></clipPath>
        <g clipPath="url(#reveal)"><g transform="translate(0 590)"><polyline points={SEISMO} fill="none" stroke={K.purple} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" /></g></g>
      </g>
      <Bubble x={540} y={800} size={44} opacity={prog( t, at( b, 'learn', 0.4 ), 0.5 )}>a seismogram: waves drawn on paper</Bubble>
      <Mascot x={470} y={1020} r={170} t={t} mood="happy" tilt={-4} look={1} />
      <g transform={`translate(${f1( 650 )} ${f1( 960 + Math.sin( t * 2 ) * 8 )}) rotate(25)`}>
        <rect x={-14} y={40} width={28} height={130} rx={14} fill={K.soil} stroke={K.ink} strokeWidth={7} />
        <circle r={78} fill="#e8f8ff" fillOpacity={0.7} stroke={K.ink} strokeWidth={13} />
        <path d="M -40 -20 Q -20 -52 14 -50" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" />
      </g>
      <g opacity={Math.min( 1, ask )} transform={`translate(0 ${f1( ( 1 - Math.min( 1, ask ) ) * 40 )})`}>
        <Bubble x={540} y={1260} size={72} color={K.pink} rotate={-2}>WHAT WILL YOU</Bubble>
        <Bubble x={540} y={1350} size={90} color={K.purple} rotate={-2}>DISCOVER?</Bubble>
      </g>
    </g>
  );
};

// ---------- 6. closing card ----------

const Closing: React.FC<{ t: number; start: number }> = ( { t, start } ) => {
  const local = t - start;
  if ( local < 0 ) {
    return null;
  }
  const pop = popEase( local / 0.6 );
  return (
    <AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect width={1080} height={1920} fill={K.sun} opacity={clamp( local / 0.4 )} />
        {Array.from( { length: 14 }, ( _, i ) => <polygon key={i} points="540,760 0,0 80,0" fill="#fff" opacity={0.18} transform={`rotate(${f1( i * ( 360 / 14 ) + local * 6 )} 540 760)`} /> )}
        <Mascot x={540} y={620} r={190 * Math.min( 1, pop )} t={t} mood="happy" tilt={Math.sin( t * 3 ) * 6} />
        <g opacity={clamp( ( local - 0.5 ) / 0.4 )}>
          <rect x={90} y={940} width={900} height={190} rx={40} fill={K.ink} />
          <text x={540} y={1050} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={118} fill="#fff" letterSpacing={3}>{BRAND.name}</text>
          <rect x={140} y={1170} width={800} height={92} rx={46} fill={K.pink} stroke={K.ink} strokeWidth={7} />
          <text x={540} y={1234} textAnchor="middle" fontFamily={FONT.ui} fontWeight={900} fontSize={40} fill="#fff">EARTHQUAKE SCIENCE FOR KIDS</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---------- captions and shell ----------

const KidsCaptions: React.FC<{ t: number; captions: { text: string; start: number; end: number }[] }> = ( { t, captions } ) => {
  const c = captions.find( x => t >= x.start && t < x.end );
  if ( !c ) {
    return null;
  }
  return (
    <div style={{ position: 'absolute', left: 72, width: 936, top: 1460, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: FONT.ui, fontWeight: 900, fontSize: 54, lineHeight: 1.15, textAlign: 'center', color: K.ink, background: '#fff', padding: '14px 30px', borderRadius: 36, border: `7px solid ${K.ink}` }}>{c.text}</div>
    </div>
  );
};

export const KidsWhyEarthShakes: React.FC<KidsShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const b = beatsFor( META, audio );
  const ctaStart = b.cta.start - 0.2;
  const tagO = vis( t, b.puzzle.start, ctaStart, 0.5 );
  return (
    <AbsoluteFill style={{ background: K.skyTop }}>
      <SkyBackdrop t={t} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Hook t={t} b={b} o={span( t, b, 'hook', 'puzzle' )} />
        <Puzzle t={t} b={b} o={span( t, b, 'puzzle', 'stuck' )} />
        <Blocks t={t} b={b} tSlip={wordStart( b, audio, 'snap', /snap/i, 0.5 )} o={span( t, b, 'stuck', 'waves' )} />
        <Waves t={t} b={b} o={span( t, b, 'waves', 'learn' )} />
        <Learn t={t} b={b} o={span( t, b, 'learn', 'cta' )} />
      </svg>
      {tagO > 0.01 ? (
        <div style={{ position: 'absolute', left: 72, top: 200, opacity: tagO }}>
          <div style={{ fontFamily: FONT.ui, fontWeight: 900, fontSize: 30, letterSpacing: 2, color: K.ink, background: K.sun, border: `5px solid ${K.ink}`, padding: '8px 24px', borderRadius: 30, display: 'inline-block' }}>EARTHQUAKE SCIENCE FOR KIDS · 01</div>
        </div>
      ) : null}
      <Closing t={t} start={ctaStart} />
      {audio ? <Layers audio={audio} total={durationInFrames / FPS} /> : null}
      <KidsCaptions t={t} captions={audio?.captions ?? placeholderCaptions( META.script )} />
    </AbsoluteFill>
  );
};
