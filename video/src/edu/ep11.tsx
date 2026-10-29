/**
 * Episode 11 (Myth vs Fact), "Can a Tsunami Hit San Francisco?". Claims and sources: ep11claims.ts. Seven approved AI stills
 * (GPT Image 2.5 Sunburst, one per narration line) carry the story with slow camera moves; Remotion draws the MYTH OR FACT / FACT
 * cards, the Pacific travel map (Natural Earth land, great-circle geometry), the vertical-versus-horizontal fault diagram and the
 * safety cards. The images are illustrations, labelled where they could pass for documentation. The CGS hazard map is NOT drawn:
 * CGS data are "all rights reserved" and reusable only with written permission, so the map beat is a credit card pointing to the
 * official viewer. The sign overlay is a clearly generic pictogram, not Cal OES artwork.
 */
import { Img, staticFile } from 'remotion';
import { COLORS } from '../design/tokens.js';
import { Card, RegionMap } from '../historic/kit.js';
import { Backdrop, HOT, Pill, Txt, at, clamp, f1, lerp, prog, span, vis, within } from './kit.js';
import { CTA_LINE, plan } from './episodes.js';
import type { Beats, EpisodeMeta } from './episodes.js';
import { SeriesTag, makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';
import { CompactCta } from './ep06.js';

export const SF_TSUNAMI: EpisodeMeta = {
  id: 'sftsunami', number: 11, compositionId: 'MythSfTsunami', title: 'Can a Tsunami Hit San Francisco?', baseSeconds: 58, tailSeconds: 2.5,
  script: plan( [
    { id: 'hook', text: 'San Francisco has tsunami warning signs. But can a tsunami really hit the city?' },
    { id: 'q', text: 'Myth or fact: a tsunami can hit San Francisco.', gap: 0.5 },
    { id: 'fact', text: 'Fact. But it’s rare, and the risk isn’t the same everywhere.' },
    { id: 'hist', text: 'In nineteen sixty-four, a tsunami from Alaska damaged boats and docks in San Francisco Bay.' },
    { id: 'far', text: 'One source is far away: giant undersea earthquakes, like in Alaska.' },
    { id: 'push', text: 'They can lift the seafloor and shove the water above it. Waves then cross the ocean for hours.' },
    { id: 'sa', text: 'The San Andreas Fault is different. It slides sideways, so it mostly shakes the ground.' },
    { id: 'map', text: 'The state’s official hazard map marks low-lying shoreline, from Ocean Beach to the bay waterfront.' },
    { id: 'mapnot', text: 'It’s not a forecast. It shows where water could flood in rare, extreme scenarios.' },
    { id: 'look', text: 'A tsunami isn’t one giant wave. Expect fast flooding, strong currents, and waves for hours.' },
    { id: 'shake', text: 'If you’re near the coast and shaking is strong or long, don’t wait for an alert. Go uphill or inland.' },
    { id: 'warn', text: 'After an official warning, follow evacuation signs, and stay out until officials say it’s safe.' },
    { id: 'close', text: 'So yes, a tsunami can hit San Francisco. Rarely, and not everywhere.' },
    CTA_LINE
  ], 0.5 )
};

/** The approved stills, keyed by role. `file` is the original narration-based filename in assets/myth-sf-tsunami/ (never renamed); it is staged as `<key>.png` under public/myth-sf-tsunami/. */
export const SF_IMAGES: Record<string, { file: string }> = {
  sign: { file: 'San Francisco has tsunami warning signs. But can a tsunami really hit the city.png' },
  marina1964: { file: 'In nineteen sixty-four, a tsunami from Alaska damaged boats and docks in San Francisco Bay.png' },
  megathrust: { file: 'One source is far away giant undersea earthquakes like in Alaska.png' },
  goldengate: { file: 'The states official hazard map marks low lying shoreline from Ocean Beach to the bay waterfront.png' },
  surge: { file: 'A tsunami isnt one giant wave Expect fast flooding strong currents and waves for hours.png' },
  uphill: { file: 'If youre near the coast and shaking is strong or long go uphill or inland.png' },
  sunset: { file: 'So yes a tsunami can hit San Francisco Rarely and not everywhere.png' }
};

const GREEN = '#3ddc97';
const AMBER = '#e0a43c';
const WATER = '#7FDBFF';

// ---------- stills with camera moves ----------

type Kb = { s: [ number, number ]; x: [ number, number ]; y: [ number, number ] };
type ShotProps = { id: keyof typeof SF_IMAGES; t: number; from: number; to: number; kb: Kb; filter?: string; jitter?: number; dim?: number; children?: React.ReactNode };

const Shot: React.FC<ShotProps> = ( { id, t, from, to, kb, filter, jitter = 0, dim = 0, children } ) => {
  const o = vis( t, from === 0 ? -1 : from, to, 0.5 );
  if ( o <= 0.01 ) {
    return null;
  }
  const u = clamp( ( t - from ) / ( to - from ) );
  const jx = jitter * Math.sin( t * 2.3 ), jy = jitter * Math.cos( t * 1.9 );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o, overflow: 'hidden', background: '#05070d' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${f1( lerp( kb.x[0], kb.x[1], u ) + jx )}px, ${f1( lerp( kb.y[0], kb.y[1], u ) + jy )}px) scale(${lerp( kb.s[0], kb.s[1], u ).toFixed( 4 )})` }}>
        <Img src={staticFile( `myth-sf-tsunami/${ id }.png` )} style={{ width: 1080, height: 1920, objectFit: 'cover', filter }} />
        {children}
      </div>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(5,7,13,0.62) 0%, rgba(5,7,13,0) 28%, rgba(5,7,13,0) 55%, rgba(5,7,13,0.74) 100%)' }} />
      {dim > 0 ? <div style={{ position: 'absolute', inset: 0, background: `rgba(5,7,13,${dim})` }} /> : null}
    </div>
  );
};

/** Tiny disclosure under the series tag, shown while an illustration could be mistaken for documentation. */
const AiTag: React.FC<{ text: string; opacity: number; right?: boolean }> = ( { text, opacity, right } ) => (
  <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
    <Txt x={right ? 1008 : 72} y={262} size={22} weight={600} anchor={right ? 'end' : 'start'} spacing={2} color={COLORS.textSupport} opacity={0.75 * opacity}>{text}</Txt>
  </svg>
);

/** Generic safety pictogram (wave and uphill arrow) on the blank sign face of the first still. Not Cal OES artwork. Coordinates are in the still's own 720x1280 space. */
const GenericSignFace: React.FC<{ opacity: number }> = ( { opacity } ) => (
  <svg width={1080} height={1920} viewBox="0 0 720 1280" style={{ position: 'absolute', left: 0, top: 0, opacity }}>
    <g transform="rotate(3.5 161 339)">
    <rect x={66} y={195} width={190} height={288} rx={10} fill="#f4f7fb" stroke="#0a5aa8" strokeWidth={5} />
    <g fill="none" stroke="#0a5aa8" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M88 420 q18 -30 36 0 t36 0 t36 0" />
      <path d="M88 452 q18 -30 36 0 t36 0 t36 0" />
      <path d="M104 372 L206 262" />
      <path d="M156 258 L208 260 L206 312" />
    </g>
    </g>
  </svg>
);

// ---------- Pacific travel map ----------

const SOURCE: [ number, number ] = [ -151, 57 ];
const SF: [ number, number ] = [ -122.42, 37.77 ];
/** Approximate Alaska-Aleutian subduction arc, [lon, lat], drawn as a labelled approximation. */
const ARC: [ number, number ][] = [ [ -178, 51.3 ], [ -172, 52.2 ], [ -166, 53.6 ], [ -160, 55 ], [ -154, 56 ], [ -149.5, 58.5 ], [ -146.5, 60.2 ] ];
const PMAP = { x: 60, y: 300, w: 960, h: 900 };
const PBOX = { w: -180, e: -105, s: 20, n: 70 };
const rad = ( d: number ) => ( d * Math.PI ) / 180;
const deg = ( r: number ) => ( r * 180 ) / Math.PI;

/** Angular distance (degrees) between two lon/lat points. */
const angDist = ( a: [ number, number ], b: [ number, number ] ) => deg( Math.acos( Math.min( 1, Math.sin( rad( a[1] ) ) * Math.sin( rad( b[1] ) ) + Math.cos( rad( a[1] ) ) * Math.cos( rad( b[1] ) ) * Math.cos( rad( b[0] - a[0] ) ) ) ) );

/** Point on the great circle from a to b at fraction f. */
function greatCircle( a: [ number, number ], b: [ number, number ], f: number ): [ number, number ] {
  const d = rad( angDist( a, b ) );
  const A = Math.sin( ( 1 - f ) * d ) / Math.sin( d ), B = Math.sin( f * d ) / Math.sin( d );
  const x = A * Math.cos( rad( a[1] ) ) * Math.cos( rad( a[0] ) ) + B * Math.cos( rad( b[1] ) ) * Math.cos( rad( b[0] ) );
  const y = A * Math.cos( rad( a[1] ) ) * Math.sin( rad( a[0] ) ) + B * Math.cos( rad( b[1] ) ) * Math.sin( rad( b[0] ) );
  const z = A * Math.sin( rad( a[1] ) ) + B * Math.sin( rad( b[1] ) );
  return [ deg( Math.atan2( y, x ) ), deg( Math.atan2( z, Math.hypot( x, y ) ) ) ];
}

/** Circle of angular radius r (degrees) around c as lon/lat points; points outside the map box are dropped (null breaks the path). */
function circle( c: [ number, number ], r: number ): ( [ number, number ] | null )[] {
  const out: ( [ number, number ] | null )[] = [];
  for ( let brg = 0; brg <= 360; brg += 3 ) {
    const d = rad( r ), th = rad( brg ), la1 = rad( c[1] ), lo1 = rad( c[0] );
    const la2 = Math.asin( Math.sin( la1 ) * Math.cos( d ) + Math.cos( la1 ) * Math.sin( d ) * Math.cos( th ) );
    let lo = deg( lo1 + Math.atan2( Math.sin( th ) * Math.sin( d ) * Math.cos( la1 ), Math.cos( d ) - Math.sin( la1 ) * Math.sin( la2 ) ) );
    lo = ( ( ( lo + 540 ) % 360 ) - 180 );
    const la = deg( la2 );
    out.push( lo >= PBOX.w && lo <= PBOX.e && la >= PBOX.s && la <= PBOX.n ? [ lo, la ] : null );
  }
  return out;
}

const PacificTravel: React.FC<{ t: number; b: Beats }> = ( { t, b } ) => {
  const t0 = within( b, 'push', 0.45 );
  const o = vis( t, t0, b.sa.start + 0.9, 0.5 );
  if ( o <= 0.01 ) {
    return null;
  }
  const travel = prog( t, t0 + 0.4, Math.max( 2.2, b.sa.start + 0.5 - t0 - 0.4 ) );
  const total = angDist( SOURCE, SF );
  const rMax = total * travel;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <Backdrop accent="#0f2a4a" />
      <RegionMap id="pacific" rect={PMAP} box={PBOX} center={[ -142, 46.5 ]} zoom={0.74} grid={10}>
        {proj => {
          const pts = ( list: ( [ number, number ] | null )[] ) => list.reduce<string>( ( d, p, i ) => ( p ? `${ d }${ i === 0 || !list[i - 1] ? 'M' : 'L' }${ proj( p[0], p[1] ).map( f1 ).join( ',' ) }` : d ), '' );
          const arc = `M${ ARC.map( p => proj( p[0], p[1] ).map( f1 ).join( ',' ) ).join( 'L' ) }`;
          const route = Array.from( { length: 41 }, ( _, i ) => greatCircle( SOURCE, SF, ( i / 40 ) * travel ) );
          const [ sx, sy ] = proj( SOURCE[0], SOURCE[1] );
          const [ fx, fy ] = proj( SF[0], SF[1] );
          const [ wx, wy ] = proj( ...greatCircle( SOURCE, SF, travel ) );
          return (
            <>
              <path d={arc} fill="none" stroke={HOT} strokeWidth={9} strokeLinecap="round" strokeDasharray="2 16" opacity={0.95} />
              {[ 1, 0.66, 0.33 ].map( k => ( rMax * k > 0.5 ? <path key={k} d={pts( circle( SOURCE, rMax * k ) )} fill="none" stroke={WATER} strokeWidth={5 * k + 2} opacity={0.85 * k * ( 1 - 0.35 * travel )} /> : null ) )}
              <path d={`M${ route.map( p => proj( p[0], p[1] ).map( f1 ).join( ',' ) ).join( 'L' ) }`} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="10 12" opacity={0.9} />
              <circle cx={sx} cy={sy} r={12} fill={HOT} stroke="#fff" strokeWidth={4} />
              <circle cx={fx} cy={fy} r={13} fill="#fff" stroke={GREEN} strokeWidth={5} />
              <circle cx={wx} cy={wy} r={9} fill={WATER} opacity={travel > 0.01 ? 1 : 0} />
              <Pill x={sx - 24} y={sy - 80} text="ALASKA–ALEUTIAN ARC" color={HOT} size={26} opacity={prog( t, t0, 0.5 )} />
              <Pill x={fx - 70} y={fy + 70} text="SAN FRANCISCO" color={GREEN} size={26} opacity={prog( t, t0 + 0.2, 0.5 )} />
            </>
          );
        }}
      </RegionMap>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Pill x={540} y={1130} text="HOURS TO CROSS THE OCEAN" color={WATER} size={30} opacity={prog( t, t0 + 1, 0.5 )} />
        <Txt x={540} y={1262} size={24} weight={600} color={COLORS.textSupport}>Schematic: arc position is approximate; route and wavefronts are illustrative</Txt>
      </svg>
    </div>
  );
};

// ---------- vertical versus horizontal motion ----------

const Bump = ( cx: number, w: number, h: number, x: number ) => h * Math.exp( -Math.pow( ( x - cx ) / w, 2 ) );

const FaultDiagram: React.FC<{ t: number; b: Beats }> = ( { t, b } ) => {
  const o = vis( t, b.sa.start + 0.5, b.map.start + 0.2, 0.4 );
  if ( o <= 0.01 ) {
    return null;
  }
  const a = prog( t, b.sa.start + 0.2, 1.0 );
  const h = prog( t, b.sa.start + 2.2, 1.0 );
  const xs = Array.from( { length: 45 }, ( _, i ) => 80 + i * 20 );
  const floor = ( x: number ) => 540 - Bump( 640, 130, 70 * a, x );
  const surface = ( x: number ) => 410 - Bump( 640, 170, 26 * a, x );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <Backdrop accent="#10304f" />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect x={60} y={300} width={960} height={470} rx={16} fill="rgba(7,11,20,0.85)" stroke={WATER} strokeWidth={3} />
        <Txt x={90} y={352} size={30} weight={800} spacing={3} anchor="start" color={WATER}>SUBDUCTION ZONE · VERTICAL</Txt>
        <path d={`M80,${surface( 80 )} ${xs.map( x => `L${x},${f1( surface( x ) )}` ).join( ' ' )} L960,740 L80,740 Z`} fill="#0f3a66" opacity={0.8} />
        <path d={`M80,${floor( 80 )} ${xs.map( x => `L${x},${f1( floor( x ) )}` ).join( ' ' )} L960,740 L80,740 Z`} fill="#3a3226" />
        <path d={`M80,${floor( 80 )} ${xs.map( x => `L${x},${f1( floor( x ) )}` ).join( ' ' )}`} fill="none" stroke="#d9c49a" strokeWidth={5} />
        <path d="M80,610 L960,700" stroke={HOT} strokeWidth={6} strokeDasharray="14 12" />
        <Txt x={100} y={595} size={22} weight={700} spacing={2} anchor="start" color={HOT}>PLATE INTERFACE</Txt>
        <g opacity={a} stroke={GREEN} strokeWidth={9} strokeLinecap="round" fill="none"><path d="M640,500 L640,436" /><path d="M614,462 L640,432 L666,462" /></g>
        <Txt x={540} y={725} size={30} weight={800} color={COLORS.text} opacity={a}>SEAFLOOR LIFTS → WATER PUSHED UP</Txt>
        <rect x={60} y={820} width={960} height={450} rx={16} fill="rgba(7,11,20,0.85)" stroke={AMBER} strokeWidth={3} opacity={h} />
        <g opacity={h}>
          <Txt x={90} y={872} size={30} weight={800} spacing={3} anchor="start" color={AMBER}>SAN ANDREAS · HORIZONTAL</Txt>
          <Txt x={990} y={872} size={20} weight={600} anchor="end" color={COLORS.textSupport}>TOP-DOWN VIEW · RED = FAULT</Txt>
          <rect x={130 + 24 * h} y={905} width={820} height={115} rx={10} fill="#3a3226" stroke="#d9c49a" strokeWidth={4} />
          <rect x={130 - 24 * h} y={1050} width={820} height={115} rx={10} fill="#3a3226" stroke="#d9c49a" strokeWidth={4} />
          <line x1={90} x2={990} y1={1035} y2={1035} stroke={HOT} strokeWidth={5} strokeDasharray="12 10" />
          <g stroke={AMBER} strokeWidth={9} strokeLinecap="round" fill="none"><path d="M360,962 L640,962" /><path d="M606,936 L640,962 L606,988" /><path d="M720,1108 L440,1108" /><path d="M474,1082 L440,1108 L474,1134" /></g>
          <Txt x={540} y={1232} size={30} weight={800} color={COLORS.text}>SLIDES SIDEWAYS → MOSTLY SHAKES THE GROUND</Txt>
        </g>
        <Txt x={990} y={352} size={22} weight={600} anchor="end" color={COLORS.textSupport}>SCHEMATIC · NOT TO SCALE</Txt>
      </svg>
    </div>
  );
};

// ---------- cards ----------

const pop = ( t: number, t0: number, from = 2.2, dur = 0.22 ) => {
  const k = clamp( ( t - t0 ) / dur );
  return { scale: lerp( from, 1, 1 - Math.pow( 1 - k, 3 ) ), opacity: clamp( ( t - t0 ) / 0.07 ) };
};

/** MYTH OR FACT? slams in over the hook still; FACT replaces it with a green flash. */
const MythFact: React.FC<{ t: number; b: Beats }> = ( { t, b } ) => {
  const q = vis( t, b.q.start - 0.05, b.fact.start + 0.1, 0.12 );
  const f = vis( t, b.fact.start, b.hist.start + 0.2, 0.25 );
  const flash = t >= b.fact.start && t < b.fact.start + 0.4 ? 0.3 * ( 1 - ( t - b.fact.start ) / 0.4 ) : 0;
  const word = ( text: string, y: number, t0: number ) => {
    const w = pop( t, t0, 1.7, 0.18 );
    return <g key={text} transform={`translate(540 ${ y }) scale(${ f1( w.scale ) }) translate(-540 ${ -y })`} opacity={w.opacity}><Txt x={540} y={y} size={72} display weight={800} color={COLORS.text}>{text}</Txt></g>;
  };
  const fp = pop( t, b.fact.start, 2.2, 0.2 );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <rect width={1080} height={1920} fill={GREEN} opacity={flash} />
      <g opacity={q}>
        <rect x={72} y={430} width={936} height={420} rx={20} fill="rgba(7,11,20,0.7)" stroke={AMBER} strokeWidth={8} />
        <Txt x={540} y={545} size={72} display weight={800} spacing={10} color={AMBER}>MYTH OR FACT?</Txt>
        {word( 'A TSUNAMI CAN HIT', 660, b.q.start + 0.5 )}
        {word( 'SAN FRANCISCO', 750, b.q.start + 0.85 )}
      </g>
      <g opacity={f} transform={`translate(540 640) scale(${ f1( fp.scale ) }) translate(-540 -640)`}>
        <rect x={72} y={430} width={936} height={420} rx={20} fill="rgba(7,11,20,0.9)" stroke={GREEN} strokeWidth={8} />
        <Txt x={540} y={600} size={150} display weight={800} spacing={8} color={GREEN}>FACT</Txt>
        <Txt x={540} y={700} size={50} display weight={800} color={COLORS.text}>BUT IT’S RARE</Txt>
        <Txt x={540} y={775} size={36} weight={600} color={COLORS.textSupport}>and not the same everywhere</Txt>
      </g>
    </svg>
  );
};

const SafetyCards: React.FC<{ t: number; b: Beats }> = ( { t, b } ) => {
  const lookPill = ( text: string, y: number, frac: number ) => <Pill key={text} x={540} y={y} text={text} color={WATER} size={44} opacity={prog( t, within( b, 'look', frac ), 0.35 ) * vis( t, b.look.start, b.shake.start + 0.2, 0.3 )} />;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Card x={90} y={1000} w={900} label="OFFICIAL TSUNAMI HAZARD MAP" value="CGS + CAL OES" valueSize={70} note="Check your address in Cal OES MyHazards" color={WATER} opacity={span( t, b, 'map', 'mapnot', 0.35 )} />
      <Card x={90} y={1000} w={900} label="A HAZARD MAP IS NOT A FORECAST" value="RARE · EXTREME" valueSize={70} note="Where water could flood. Not when, or how likely." color={AMBER} opacity={span( t, b, 'mapnot', 'look', 0.35 )} />
      {lookPill( 'FAST FLOODING', 1010, 0.2 )}{lookPill( 'STRONG CURRENTS', 1100, 0.45 )}{lookPill( 'WAVES FOR HOURS', 1190, 0.7 )}
      <Card x={90} y={1000} w={900} label="NEAR THE COAST" value="STRONG OR LONG SHAKING" valueSize={50} note="Go uphill or inland. Don’t wait for an alert." color={GREEN} opacity={span( t, b, 'shake', 'warn', 0.35 )} />
      <g opacity={vis( t, b.warn.start - 0.1, b.close.start + 0.2, 0.35 )}>
        <rect width={1080} height={1920} fill="rgba(5,7,13,0.55)" />
        <Card x={90} y={640} w={900} label="TSUNAMI WARNING" value="HIGH GROUND OR INLAND" valueSize={54} note="Follow the evacuation signs · Source: NOAA / NWS" color={HOT} opacity={prog( t, b.warn.start, 0.4 )} />
        <Card x={90} y={940} w={900} label="TSUNAMI ADVISORY" value="STAY OUT OF THE WATER" valueSize={54} note="Strong currents, even with small waves · NOAA / NWS" color={AMBER} opacity={prog( t, within( b, 'warn', 0.5 ), 0.4 )} />
      </g>
      <g opacity={vis( t, b.close.start, 9999, 0.5 )}>
        <Txt x={540} y={390} size={84} display weight={800} color={COLORS.text}>RARELY.</Txt>
        <Txt x={540} y={490} size={84} display weight={800} color={GREEN}>NOT EVERYWHERE.</Txt>
      </g>
    </svg>
  );
};

// ---------- episode ----------

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const flash = t < 0.5 ? 0.3 * ( 1 - t / 0.5 ) : 0;
  const hist = b.hist.start, far = b.far.start, sa = b.sa.start, map = b.map.start, look = b.look.start, shake = b.shake.start, close = b.close.start;
  const pushMid = within( b, 'push', 0.45 );
  return (
    <>
      <Backdrop accent="#10304f" />
      <Shot id="sign" t={t} from={0} to={hist + 0.4} kb={{ s: [ 1.04, 1.2 ], x: [ 0, -16 ], y: [ 0, -34 ] }} dim={t > b.q.start ? 0.35 : 0}>
        <GenericSignFace opacity={prog( t, 0.7, 0.8 )} />
      </Shot>
      <Shot id="marina1964" t={t} from={hist - 0.1} to={far + 0.4} kb={{ s: [ 1.04, 1.14 ], x: [ 0, -22 ], y: [ 0, -12 ] }} filter="saturate(0.6) contrast(1.05)" />
      <Shot id="megathrust" t={t} from={far - 0.1} to={pushMid + 0.4} kb={{ s: [ 1.05, 1.16 ], x: [ 0, -10 ], y: [ 0, -40 ] }} />
      <PacificTravel t={t} b={b} />
      <FaultDiagram t={t} b={b} />
      <Shot id="goldengate" t={t} from={map - 0.1} to={look + 0.4} kb={{ s: [ 1.18, 1.04 ], x: [ -14, 10 ], y: [ 30, -10 ] }} />
      <Shot id="surge" t={t} from={look - 0.1} to={shake + 0.4} kb={{ s: [ 1.24, 1.06 ], x: [ 16, -16 ], y: [ 46, -36 ] }} jitter={5} filter="saturate(1.1) contrast(1.05)" />
      <Shot id="uphill" t={t} from={shake - 0.1} to={close + 0.4} kb={{ s: [ 1.05, 1.18 ], x: [ 0, 8 ], y: [ 0, -30 ] }} />
      <Shot id="sunset" t={t} from={close - 0.1} to={9999} kb={{ s: [ 1.12, 1.03 ], x: [ -8, 8 ], y: [ 24, -6 ] }} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}><rect width={1080} height={1920} fill={HOT} opacity={flash} /></svg>
      <MythFact t={t} b={b} />
      <SafetyCards t={t} b={b} />
      <AiTag right text="AI IMAGE · GENERIC SIGN GRAPHIC" opacity={vis( t, 0.3, b.q.start - 0.1, 0.3 )} />
      <AiTag text="AI-GENERATED ILLUSTRATION · NOT ARCHIVAL PHOTOGRAPHY" opacity={vis( t, hist, far, 0.3 )} />
      <AiTag text="AI-GENERATED ILLUSTRATION · NOT FOOTAGE OF A REAL TSUNAMI" opacity={vis( t, look, shake, 0.3 )} />
      <SeriesTag number={11} opacity={vis( t, b.fact.start + 1, b.cta.start - 1, 0.6 )} />
    </>
  );
};

export const MythSfTsunami = makeEduShort( {
  id: 'sftsunami',
  meta: SF_TSUNAMI,
  Visuals,
  Cta: CompactCta,
  cues: b => [
    { sfx: 'riser', at: b.hook.start, dur: 1.8, volume: 0.28 },
    { sfx: 'boom', at: b.fact.start, dur: 3, volume: 0.45 },
    { sfx: 'whoosh', at: at( b, 'far', 0 ), dur: 1.4, volume: 0.3 },
    { sfx: 'whoosh', at: at( b, 'sa', 0 ), dur: 1.4, volume: 0.3 },
    { sfx: 'whoosh', at: at( b, 'look', 0 ), dur: 1.4, volume: 0.25 },
    { sfx: 'tick', at: at( b, 'shake', 0.2 ), dur: 0.3, volume: 0.5 },
    { sfx: 'tick', at: at( b, 'warn', 0.2 ), dur: 0.3, volume: 0.5 }
  ]
} );
