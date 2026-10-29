/**
 * "NEW YORK WIPED OUT BY A TSUNAMI?!": a ~51 s Myth or Fact Short. Three approved AI stills open on the hypothetical Hollywood disaster
 * (small "AI VISUALIZATION · HYPOTHETICAL" watermark), then the Natural Earth MapLibre globe covers the documented 1929 Grand Banks
 * tsunami (NOAA NCEI: M7.2, underwater landslide, 28 dead, recorded on tide gauges as far as Charleston, S.C., the Azores and Portugal),
 * the NOAA/USGS hazard rating, and the La Palma mega-tsunami hypothesis with the USGS correction. The calm Manhattan still closes it.
 * Lines and the slide swath are schematic; no wave heights are drawn. Reuses LiveMap, localStyle, the edu kit, EduShort Layers and Captions.
 */
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { LiveMap } from '../../src/map/LiveMap.js';
import type { MapCamera } from '../../src/map/LiveMap.js';
import { localStyle } from '../../src/spike/styles.js';
import { FPS, Layers, eduShortSchema } from '../../src/edu/EduShort.js';
import type { EduShortProps, SfxCue } from '../../src/edu/EduShort.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { beatsFor, placeholderCaptions } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { Txt, clamp, f1, lerp, prog, vis } from '../../src/edu/kit.js';
import { NYC_TSUNAMI, imagePath } from './script.js';
import type { ImageKey } from './script.js';

export { eduShortSchema };
type LL = [ number, number ];
const ease = ( x: number ) => x * x * ( 3 - 2 * x );
const WATER = '#7FDBFF';
const AMBER = '#F2A900';
const GREEN = '#3ddc97';

// ---------- places (lon, lat) ----------
/** Epicenter per NOAA NCEI significant earthquake database (44.69 N, 56.00 W), about 250 km south of Newfoundland. */
const GRAND_BANKS: LL = [ -56.0, 44.69 ];
/** The tsunami's deaths were on the south coast of the Burin Peninsula (NOAA NCEI). */
const BURIN: LL = [ -55.45, 46.95 ];
const CHARLESTON: LL = [ -79.93, 32.78 ];
const AZORES: LL = [ -25.67, 37.74 ];
const PORTUGAL: LL = [ -9.14, 38.72 ];
const NYC: LL = [ -74.0, 40.71 ];
const LA_PALMA: LL = [ -17.86, 28.66 ];
/** Schematic slide swath down the Laurentian slope south of the epicenter; not survey data. */
const SLIDE: LL[] = [ [ -57.2, 45.0 ], [ -55.2, 44.95 ], [ -55.0, 44.2 ], [ -55.4, 43.2 ], [ -56.8, 43.1 ], [ -57.3, 44.1 ] ];

const rad = ( d: number ) => ( d * Math.PI ) / 180;
const deg = ( r: number ) => ( r * 180 ) / Math.PI;
/** Great-circle points from a to b (n + 1 samples). */
function gc( a: LL, b: LL, n = 28 ): LL[] {
  const d = Math.acos( Math.min( 1, Math.sin( rad( a[1] ) ) * Math.sin( rad( b[1] ) ) + Math.cos( rad( a[1] ) ) * Math.cos( rad( b[1] ) ) * Math.cos( rad( b[0] - a[0] ) ) ) );
  return Array.from( { length: n + 1 }, ( _, i ) => {
    const f = i / n, A = Math.sin( ( 1 - f ) * d ) / Math.sin( d ), B = Math.sin( f * d ) / Math.sin( d );
    const x = A * Math.cos( rad( a[1] ) ) * Math.cos( rad( a[0] ) ) + B * Math.cos( rad( b[1] ) ) * Math.cos( rad( b[0] ) );
    const y = A * Math.cos( rad( a[1] ) ) * Math.sin( rad( a[0] ) ) + B * Math.cos( rad( b[1] ) ) * Math.sin( rad( b[0] ) );
    const z = A * Math.sin( rad( a[1] ) ) + B * Math.sin( rad( b[1] ) );
    return [ deg( Math.atan2( y, x ) ), deg( Math.atan2( z, Math.hypot( x, y ) ) ) ] as LL;
  } );
}
/** Coastal route to Charleston: offshore of Nova Scotia and Cape Cod rather than across land (schematic). */
const TO_CHS = [ ...gc( GRAND_BANKS, [ -66, 40.6 ], 12 ), ...gc( [ -66, 40.6 ], [ -73.5, 35.6 ], 10 ).slice( 1 ), ...gc( [ -73.5, 35.6 ], CHARLESTON, 8 ).slice( 1 ) ];
const ROUTES = { chs: TO_CHS, azo: gc( GRAND_BANKS, AZORES, 20 ), por: gc( GRAND_BANKS, PORTUGAL, 24 ), lp: gc( LA_PALMA, NYC, 32 ) };
const POINTS = { gb: GRAND_BANKS, burin: BURIN, chs: CHARLESTON, azo: AZORES, por: PORTUGAL, nyc: NYC, lp: LA_PALMA };
/** Everything the overlay draws, projected by the map each frame. */
const TRACK: LL[] = [ ...Object.values( POINTS ), ...SLIDE, ...ROUTES.chs, ...ROUTES.azo, ...ROUTES.por, ...ROUTES.lp ];
const idx = ( () => {
  let o = 0;
  const take = ( n: number ) => { const s = o; o += n; return s; };
  return { points: take( Object.keys( POINTS ).length ), slide: take( SLIDE.length ), chs: take( ROUTES.chs.length ), azo: take( ROUTES.azo.length ), por: take( ROUTES.por.length ), lp: take( ROUTES.lp.length ) };
} )();

// ---------- timing ----------
/** The globe takes over during the "Atlantic" line and hands back to the calm Manhattan still on "Yes". */
const mapIn = ( b: Beats ) => b.atl.start - 0.1;
const mapOut = ( b: Beats ) => b.yes.start - 0.2;

type Stop = { t: number; c: LL; z: number; p?: number; br?: number };
/** Map focus sits between the cards (y 310-650) and the captions (y 1330+). */
const PAD = { top: 640, bottom: 560, left: 0, right: 0 };
const stops = ( b: Beats, total: number ): Stop[] => [
  { t: 0, c: [ -50, 36 ], z: 2.3 },
  { t: mapIn( b ), c: [ -50, 36 ], z: 2.35 },
  { t: b.gb0.start - 0.2, c: [ -46, 38 ], z: 2.3 },
  { t: b.gb0.start + 1.6, c: [ -56.0, 44.9 ], z: 5.0, p: 30, br: -8 },
  { t: b.gb1.end, c: [ -56.1, 44.6 ], z: 5.6, p: 38, br: -4 },
  { t: b.gb2.start + 0.9, c: [ -55.8, 45.6 ], z: 5.8, p: 34, br: 2 },
  { t: b.gb3.start + 0.2, c: [ -55.8, 45.6 ], z: 5.85, p: 34, br: 2 },
  { t: b.gb3.start + 1.4, c: [ -45, 38.5 ], z: 2.55 },
  { t: b.ny.start, c: [ -46, 38.5 ], z: 2.6 },
  { t: b.ny.start + 1.0, c: [ -73.6, 40.0 ], z: 5.4, p: 36, br: 10 },
  { t: b.low.end, c: [ -73.8, 40.2 ], z: 5.7, p: 40, br: 14 },
  { t: b.lp0.start + 1.6, c: [ -46, 34 ], z: 2.5, p: 10 },
  { t: mapOut( b ), c: [ -45, 34.5 ], z: 2.6, p: 10 },
  { t: total, c: [ -45, 34.5 ], z: 2.65, p: 10 }
];

const camera = ( frame: number, b: Beats, total: number ): MapCamera => {
  const t = frame / FPS;
  const s = stops( b, total );
  let i = s.findIndex( x => x.t > t );
  if ( i < 0 ) i = s.length - 1;
  if ( i === 0 ) i = 1;
  const a = s[i - 1], z = s[i];
  const k = ease( clamp( ( t - a.t ) / Math.max( 0.01, z.t - a.t ) ) );
  const m = ( p: number, q: number ) => p + ( q - p ) * k;
  return { center: [ m( a.c[0], z.c[0] ), m( a.c[1], z.c[1] ) ], zoom: m( a.z, z.z ), bearing: m( a.br ?? 0, z.br ?? 0 ), pitch: m( a.p ?? 0, z.p ?? 0 ), padding: PAD };
};

// ---------- drawing helpers ----------
type P = { x: number; y: number };
/** Text with a dark halo so it reads on the stills and on the dark globe. */
const Halo: React.FC<{ x: number; y: number; size: number; children: React.ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end'; opacity?: number; display?: boolean; weight?: number; spacing?: number }> = ( { x, y, size, children, color = COLORS.text, anchor = 'middle', opacity = 1, display = false, weight = 800, spacing = 0 } ) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={display ? FONT.display : FONT.ui} fontWeight={weight} fontSize={size} letterSpacing={spacing} fill={color} stroke="#070B14" strokeWidth={size * 0.16} strokeLinejoin="round" paintOrder="stroke" opacity={opacity} style={display ? { textTransform: 'uppercase' } : undefined}>{children}</text>
);
const path = ( pts: P[] ) => ( pts.length ? `M${pts.map( p => `${f1( p.x )},${f1( p.y )}` ).join( 'L' )}` : '' );
/** Draws a route progressively (0..1) as a dashed line, with a glowing head. */
const Route: React.FC<{ pts: P[]; draw: number; color: string; width?: number; dash?: string; opacity?: number }> = ( { pts, draw, color, width = 6, dash = '14 12', opacity = 1 } ) => {
  if ( draw <= 0.001 || pts.length < 2 ) return null;
  const n = Math.max( 2, Math.ceil( pts.length * draw ) );
  const part = pts.slice( 0, n );
  const head = part[part.length - 1];
  return (
    <g opacity={opacity}>
      <path d={path( part )} fill="none" stroke={color} strokeWidth={width * 3} strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
      <path d={path( part )} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
      {draw < 1 ? <circle cx={head.x} cy={head.y} r={width * 1.6} fill={color} /> : null}
    </g>
  );
};
const Dot: React.FC<{ p: P; color: string; r?: number; o?: number }> = ( { p, color, r = 11, o = 1 } ) => (
  <g opacity={o}><circle cx={p.x} cy={p.y} r={r * 2} fill={color} opacity={0.25} /><circle cx={p.x} cy={p.y} r={r} fill={color} stroke="#fff" strokeWidth={3} /></g>
);
const Pulse: React.FC<{ p: P; frame: number; start: number; color: string; max?: number }> = ( { p, frame, start, color, max = 220 } ) => {
  const local = frame - start;
  if ( local < 0 ) return null;
  return (
    <g>
      {[ 0, 1, 2 ].map( i => {
        const ph = ( ( local - i * 16 ) % 48 ) / 48;
        if ( local - i * 16 < 0 ) return null;
        return <circle key={i} cx={p.x} cy={p.y} r={12 + ph * max} fill="none" stroke={color} strokeWidth={10 * ( 1 - ph ) + 2} opacity={( 1 - ph ) ** 1.3} />;
      } )}
    </g>
  );
};
/** A dark card with a kicker, a big value and a note; centered on x = 540. */
const Card: React.FC<{ y: number; o: number; color: string; kicker: string; big: string; note?: string; bigSize?: number; h?: number; pop?: number }> = ( { y, o, color, kicker, big, note, bigSize = 120, h = 300, pop = 1 } ) => {
  if ( o <= 0.01 ) return null;
  return (
    <g opacity={o} transform={`translate(540 ${y + h / 2}) scale(${pop.toFixed( 4 )}) translate(-540 ${-( y + h / 2 )})`}>
      <rect x={60} y={y} width={960} height={h} rx={26} fill="rgba(7,11,20,0.9)" stroke={color} strokeWidth={7} />
      <Txt x={540} y={y + 62} size={40} display weight={800} spacing={5} color={color}>{kicker}</Txt>
      <Txt x={540} y={y + 62 + bigSize * 0.95} size={bigSize} display weight={800} color={COLORS.text}>{big}</Txt>
      {note ? <Txt x={540} y={y + h - 34} size={32} weight={700} color={COLORS.textSupport}>{note}</Txt> : null}
    </g>
  );
};
const popIn = ( t: number, t0: number ) => lerp( 1.35, 1, ease( clamp( ( t - t0 ) / 0.22 ) ) );

// ---------- map overlay ----------
const overlay = ( b: Beats, total: number ) => ( _m: P, frame: number, tracked?: P[] ) => {
  if ( !tracked ) return null;
  const t = frame / FPS;
  const pt = ( k: keyof typeof POINTS ) => tracked[idx.points + Object.keys( POINTS ).indexOf( k )];
  const seg = ( o: number, n: number ) => tracked.slice( o, o + n );
  const shown = vis( t, mapIn( b ), mapOut( b ) + 0.6, 0.5 );
  if ( shown <= 0.01 ) return null;
  const hist = vis( t, b.gb0.start - 0.2, b.ny.start, 0.4 );
  const gbOn = prog( t, b.gb0.start + 1.2, 0.4 ) * ( 1 - prog( t, b.ny.start + 0.3, 0.5 ) );
  const slide = prog( t, b.gb1.start + 0.2, 1.2 );
  const slideO = vis( t, b.gb1.start, b.gb3.start + 0.4, 0.4 );
  const burin = vis( t, b.gb2.start, b.gb3.start + 1.2, 0.35 );
  const reach = vis( t, b.gb3.start + 1.0, b.ny.start + 0.6, 0.4 );
  const draw = ( d: number ) => prog( t, b.gb3.start + 1.2 + d, 1.6 );
  const nyO = vis( t, b.ny.start + 0.3, total, 0.4 );
  const hyp = vis( t, b.lp0.start + 0.6, mapOut( b ) + 0.6, 0.4 );
  const lpDraw = prog( t, b.lp0.start + 1.5, 2.2 );
  const debunk = prog( t, b.lp1.start + 0.4, 0.5 );
  const lpMid = seg( idx.lp, ROUTES.lp.length )[Math.floor( ROUTES.lp.length / 2 )];
  const atl = vis( t, mapIn( b ) + 0.3, b.gb0.start + 0.6, 0.4 );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: shown }}>
      <defs><linearGradient id="nyShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070B14" stopOpacity="0.85" /><stop offset="1" stopColor="#070B14" stopOpacity="0" /></linearGradient></defs>
      <rect width={1080} height={560} fill="url(#nyShade)" />
      <Halo x={540} y={470} size={92} display color={WATER} opacity={atl} spacing={10}>THE ATLANTIC</Halo>
      {/* 1929: epicenter, schematic slide swath, deaths on the Burin Peninsula, tide-gauge reach */}
      <g opacity={slideO * slide}>
        <path d={`${path( seg( idx.slide, SLIDE.length ) )}Z`} fill={AMBER} fillOpacity={0.28 + 0.12 * Math.sin( t * 5 )} stroke={AMBER} strokeWidth={4} strokeDasharray="10 8" />
        <Halo x={pt( 'gb' ).x - 150} y={pt( 'gb' ).y + 10} size={34} anchor="end" color={AMBER} spacing={2}>UNDERWATER</Halo>
        <Halo x={pt( 'gb' ).x - 150} y={pt( 'gb' ).y + 50} size={34} anchor="end" color={AMBER} spacing={2}>LANDSLIDE</Halo>
        <Halo x={pt( 'gb' ).x - 150} y={pt( 'gb' ).y + 84} size={22} anchor="end" color={COLORS.textSupport} weight={700} spacing={2}>AREA SCHEMATIC</Halo>
      </g>
      <g opacity={gbOn}>
        <Pulse p={pt( 'gb' )} frame={frame} start={Math.round( ( b.gb0.start + 1.2 ) * FPS )} color={COLORS.redHot} />
        <Dot p={pt( 'gb' )} color={COLORS.redHot} r={13} />
      </g>
      <g opacity={burin}>
        <Dot p={pt( 'burin' )} color="#fff" r={10} />
        <Halo x={pt( 'burin' ).x + 30} y={pt( 'burin' ).y - 26} size={38} anchor="start" spacing={2}>BURIN PENINSULA</Halo>
      </g>
      <g opacity={reach}>
        <Route pts={seg( idx.chs, ROUTES.chs.length )} draw={draw( 0 )} color={WATER} />
        <Route pts={seg( idx.azo, ROUTES.azo.length )} draw={draw( 0.3 )} color={WATER} width={4} />
        <Route pts={seg( idx.por, ROUTES.por.length )} draw={draw( 0.5 )} color={WATER} width={4} />
        <Dot p={pt( 'gb' )} color={COLORS.redHot} r={9} />
        <g opacity={prog( t, b.gb3.start + 2.6, 0.4 )}>
          <Dot p={pt( 'chs' )} color={WATER} r={10} />
          <Halo x={pt( 'chs' ).x + 20} y={pt( 'chs' ).y + 52} size={34} anchor="start" color={WATER}>CHARLESTON, S.C.</Halo>
        </g>
        <g opacity={prog( t, b.gb3.start + 2.9, 0.4 )}>
          <Dot p={pt( 'azo' )} color={WATER} r={7} /><Halo x={pt( 'azo' ).x} y={pt( 'azo' ).y + 50} size={28} color={WATER}>AZORES</Halo>
          <Dot p={pt( 'por' )} color={WATER} r={7} /><Halo x={pt( 'por' ).x - 10} y={pt( 'por' ).y + 50} size={28} anchor="end" color={WATER}>PORTUGAL</Halo>
        </g>
      </g>
      {/* New York, then the La Palma hypothesis and its correction */}
      <g opacity={nyO}>
        <Pulse p={pt( 'nyc' )} frame={frame} start={Math.round( ( b.ny.start + 0.6 ) * FPS )} color={GREEN} max={140} />
        <Dot p={pt( 'nyc' )} color={GREEN} r={11} />
        <Halo x={pt( 'nyc' ).x - 26} y={pt( 'nyc' ).y - 30} size={44} anchor="end" display color={COLORS.text} spacing={3}>NEW YORK</Halo>
      </g>
      <g opacity={hyp}>
        <Route pts={seg( idx.lp, ROUTES.lp.length )} draw={lpDraw} color={debunk > 0.5 ? '#8a93a6' : AMBER} width={7} dash="4 14" opacity={1 - 0.45 * debunk} />
        <Dot p={pt( 'lp' )} color={AMBER} r={11} />
        <Halo x={pt( 'lp' ).x} y={pt( 'lp' ).y + 56} size={34} color={AMBER} spacing={2}>LA PALMA</Halo>
        <Halo x={pt( 'lp' ).x} y={pt( 'lp' ).y + 90} size={24} color={COLORS.textSupport} weight={700} spacing={2}>CANARY ISLANDS</Halo>
        {lpMid ? (
          <g opacity={prog( t, b.lp0.start + 2.6, 0.4 )}>
            <Halo x={lpMid.x} y={lpMid.y - 40} size={32} color={debunk > 0.5 ? COLORS.textSupport : AMBER} spacing={3}>HYPOTHETICAL</Halo>
            <g opacity={debunk}><line x1={lpMid.x - 130} y1={lpMid.y - 52} x2={lpMid.x + 130} y2={lpMid.y - 52} stroke={COLORS.redHot} strokeWidth={6} /></g>
          </g>
        ) : null}
      </g>
      {/* cards (top band, clear of the captions at y 1330-1480) */}
      <Card y={310} o={vis( t, b.gb0.start + 1.0, b.gb1.start + 0.1, 0.3 )} pop={popIn( t, b.gb0.start + 1.0 )} color={COLORS.redHot} kicker="NOV 18, 1929 · GRAND BANKS" big="M7.2" bigSize={140} note="About 250 km south of Newfoundland" h={330} />
      <Card y={310} o={vis( t, b.gb2.start + 0.2, b.gb3.start + 1.0, 0.3 )} pop={popIn( t, b.gb2.start + 0.2 )} color={COLORS.redHot} kicker="TSUNAMI DEATHS" big="28" bigSize={150} note="South coast of the Burin Peninsula" h={340} />
      <Card y={310} o={vis( t, b.gb3.start + 2.4, b.ny.start + 0.2, 0.3 )} color={WATER} kicker="RECORDED ON TIDE GAUGES" big="TO SOUTH CAROLINA" bigSize={82} note="Also the Azores and Portugal" h={290} />
      <Card y={310} o={vis( t, b.low.start + 0.1, b.lp0.start + 0.6, 0.3 )} pop={popIn( t, b.low.start + 0.1 )} color={GREEN} kicker="U.S. ATLANTIC COAST · TSUNAMI HAZARD" big="LOW" bigSize={150} note="Not zero · NOAA / USGS national assessment" h={340} />
      <Card y={310} o={vis( t, b.lp0.start + 0.6, b.lp1.start + 0.3, 0.3 )} color={AMBER} kicker="2001 HYPOTHESIS" big="MEGA-TSUNAMI?" bigSize={100} note="Volcano flank collapse on La Palma" h={300} />
      <Card y={310} o={vis( t, b.lp1.start + 0.3, mapOut( b ) + 0.4, 0.3 )} pop={popIn( t, b.lp1.start + 0.3 )} color={COLORS.redHot} kicker="USGS VOLCANO SCIENTISTS" big="DOESN’T HOLD UP" bigSize={92} note="Flank collapses tend to happen piecemeal" h={300} />
      <Txt x={540} y={272} size={28} display weight={800} spacing={6} color={hist > 0.5 ? COLORS.redText : AMBER} opacity={Math.max( hist, hyp ) * 0.95}>{hist > 0.5 ? 'HISTORICAL EVENT · 1929' : 'HYPOTHETICAL SCENARIO'}</Txt>
      <Txt x={540} y={1530} size={22} weight={700} spacing={1} color={COLORS.textSupport} opacity={0.85}>NATURAL EARTH MAP · ROUTES AND AREAS SCHEMATIC · NO WAVE HEIGHTS SHOWN</Txt>
      <Txt x={540} y={1562} size={22} weight={700} spacing={1} color={COLORS.textSupport} opacity={0.85}>SOURCES: NOAA NCEI · USGS · NOAA / USGS TSUNAMI HAZARD ASSESSMENT</Txt>
    </svg>
  );
};

// ---------- stills ----------
type Kb = { s: [ number, number ]; x: [ number, number ]; y: [ number, number ] };
const Shot: React.FC<{ id: ImageKey; t: number; from: number; to: number; kb: Kb; shake?: number; filter?: string }> = ( { id, t, from, to, kb, shake = 0, filter } ) => {
  const o = vis( t, from <= 0 ? -1 : from, to, 0.45 );
  if ( o <= 0.01 ) return null;
  const u = ease( clamp( ( t - from ) / ( to - from ) ) );
  const jx = shake * Math.sin( t * 37 ) * Math.max( 0, 1 - ( t - from ) / 1.2 ) + 3 * shake / 10 * Math.sin( t * 2.1 );
  const jy = shake * Math.cos( t * 29 ) * Math.max( 0, 1 - ( t - from ) / 1.2 ) * 0.6;
  return (
    <AbsoluteFill style={{ opacity: o, overflow: 'hidden', background: '#05070d' }}>
      <Img src={staticFile( imagePath( id ) )} style={{ width: 1080, height: 1920, objectFit: 'cover', filter, transform: `translate(${f1( lerp( kb.x[0], kb.x[1], u ) + jx )}px, ${f1( lerp( kb.y[0], kb.y[1], u ) + jy )}px) scale(${lerp( kb.s[0], kb.s[1], u ).toFixed( 4 )})` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,7,13,0.6) 0%, rgba(5,7,13,0) 30%, rgba(5,7,13,0) 62%, rgba(5,7,13,0.7) 100%)' }} />
    </AbsoluteFill>
  );
};

/** Hook title, MYTH OR FACT card on the stills, and the closing verdict on the calm city. */
const StillText: React.FC<{ t: number; b: Beats; total: number }> = ( { t, b, total } ) => {
  const hook = vis( t, -1, b.q.start - 0.05, 0.25 );
  const q = vis( t, b.q.start - 0.05, mapIn( b ) + 0.3, 0.2 );
  const word = ( text: string, y: number, t0: number, size: number, color: string ) => (
    <g opacity={clamp( ( t - t0 ) / 0.08 )} transform={`translate(540 ${y}) scale(${popIn( t, t0 ).toFixed( 4 )}) translate(-540 ${-y})`}>
      <Halo x={540} y={y} size={size} display color={color}>{text}</Halo>
    </g>
  );
  const yes = vis( t, b.yes.start + 0.1, b.no.start - 0.05, 0.25 );
  const no = vis( t, b.no.start, b.end.start, 0.25 );
  const end = vis( t, b.end.start, total + 1, 0.3 );
  const flash = ( t0: number, color: string ) => ( t >= t0 && t < t0 + 0.35 ? <rect width={1080} height={1920} fill={color} opacity={0.28 * ( 1 - ( t - t0 ) / 0.35 )} /> : null );
  // editorial convention (docs/DECISION_LOG.md): no prominent AI label; a small translucent watermark while a still is on screen
  const ai = Math.max( vis( t, -1, mapIn( b ) + 0.3, 0.3 ), vis( t, mapOut( b ), total + 1, 0.3 ) );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      {flash( 0, '#ffffff' )}
      {flash( b.yes.start + 0.95, GREEN )}
      {flash( b.no.start + 2.0, COLORS.redHot )}
      <g opacity={hook}>
        {word( 'NEW YORK', 400, 0.1, 150, COLORS.text )}
        {word( 'WIPED OUT', 545, 0.45, 150, COLORS.redHot )}
        {word( 'BY A TSUNAMI?!', 680, 0.8, 120, COLORS.text )}
      </g>
      <g opacity={q}>
        <rect x={72} y={420} width={936} height={300} rx={22} fill="rgba(7,11,20,0.78)" stroke={AMBER} strokeWidth={8} />
        {word( 'MYTH OR FACT?', 600, b.q.start + 0.05, 120, AMBER )}
      </g>
      <g opacity={yes}>
        <Halo x={540} y={420} size={64} display spacing={3}>CAN A TSUNAMI REACH NYC?</Halo>
        {word( 'YES', 600, b.yes.start + 0.95, 190, GREEN )}
      </g>
      <g opacity={no}>
        <Halo x={540} y={420} size={64} display spacing={3}>WIPE OUT MANHATTAN?</Halo>
        {word( 'NOT CREDIBLE', 580, b.no.start + 2.0, 140, COLORS.redHot )}
      </g>
      <g opacity={end}>
        {word( 'MYTH OR FACT?', 400, b.end.start, 84, AMBER )}
        {word( 'THE THREAT IS REAL.', 530, b.end.start + 0.9, 104, COLORS.text )}
        {word( 'THE HOLLYWOOD', 680, b.end.start + 2.0, 104, COLORS.redHot )}
        {word( 'DISASTER IS NOT.', 800, b.end.start + 2.0, 104, COLORS.redHot )}
      </g>
      <Txt x={72} y={236} size={20} weight={700} spacing={3} anchor="start" color={COLORS.text} opacity={0.5 * ai}>{t < mapIn( b ) ? 'AI VISUALIZATION · HYPOTHETICAL' : 'AI VISUALIZATION'}</Txt>
    </svg>
  );
};

const cues = ( b: Beats ): SfxCue[] => [
  { sfx: 'boom', at: 0, dur: 3, volume: 0.55 },
  { sfx: 'rumble', at: 0.1, dur: 3.2, volume: 0.3 },
  { sfx: 'whoosh', at: b.h1.start - 0.3, dur: 1.2, volume: 0.35 },
  { sfx: 'riser', at: b.h1.end - 1.6, dur: 1.7, volume: 0.25 },
  { sfx: 'boom', at: b.q.start, dur: 2, volume: 0.4 },
  { sfx: 'whoosh', at: mapIn( b ) - 0.2, dur: 1.4, volume: 0.4 },
  { sfx: 'boom', at: b.gb0.start + 1.2, dur: 2.5, volume: 0.45 },
  { sfx: 'rumble', at: b.gb1.start, dur: 2.4, volume: 0.28 },
  { sfx: 'tick', at: b.gb2.start + 0.2, dur: 0.3, volume: 0.5 },
  { sfx: 'whoosh', at: b.gb3.start + 1.0, dur: 1.4, volume: 0.3 },
  { sfx: 'whoosh', at: b.ny.start, dur: 1.4, volume: 0.35 },
  { sfx: 'tick', at: b.low.start + 0.1, dur: 0.3, volume: 0.5 },
  { sfx: 'riser', at: b.lp0.start + 0.5, dur: Math.max( 1, b.lp1.start - b.lp0.start ), volume: 0.25 },
  { sfx: 'tick', at: b.lp1.start + 0.3, dur: 0.3, volume: 0.5 },
  { sfx: 'whoosh', at: mapOut( b ) - 0.2, dur: 1.2, volume: 0.35 },
  { sfx: 'boom', at: b.yes.start + 0.95, dur: 1.5, volume: 0.35 },
  { sfx: 'tick', at: b.no.start + 2.0, dur: 0.3, volume: 0.5 },
  { sfx: 'boom', at: b.end.start + 2.0, dur: 2, volume: 0.35 }
];

export const NycTsunami: React.FC<EduShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( NYC_TSUNAMI, audio );
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap cameraAt={f => camera( f, b, total )} epicenter={GRAND_BANKS} tiles="local" style={() => localStyle()} trackPoints={TRACK} diagnostics={{ event: 'nyc-tsunami', tiles: 'local' }} background={COLORS.background} overlay={overlay( b, total )} />
      <Shot id="wave" t={t} from={0} to={b.h1.start + 0.2} kb={{ s: [ 1.18, 1.04 ], x: [ 0, 0 ], y: [ 40, -10 ] }} shake={12} />
      <Shot id="liberty" t={t} from={b.h1.start - 0.1} to={b.q.start + 0.2} kb={{ s: [ 1.04, 1.16 ], x: [ 0, -12 ], y: [ 0, -30 ] }} shake={4} />
      <Shot id="flooded" t={t} from={b.q.start - 0.1} to={mapIn( b ) + 0.5} kb={{ s: [ 1.06, 1.2 ], x: [ 10, -10 ], y: [ 0, 20 ] }} filter="saturate(0.9)" />
      <Shot id="calm" t={t} from={mapOut( b )} to={total + 5} kb={{ s: [ 1.16, 1.03 ], x: [ -8, 8 ], y: [ 30, -6 ] }} />
      <StillText t={t} b={b} total={total} />
      <Captions t={t} captions={audio?.captions ?? placeholderCaptions( NYC_TSUNAMI.script )} />
      {audio ? <Layers audio={audio} cues={cues( b )} total={total} /> : null}
    </AbsoluteFill>
  );
};
