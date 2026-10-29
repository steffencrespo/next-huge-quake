/**
 * "A MASSIVE EARTHQUAKE IN NYC?!": a ~59 s Myth or Fact Short, companion to nyc-tsunami. The approved AI disaster still opens on the hypothetical
 * (small "AI VISUALIZATION · HYPOTHETICAL" watermark), the Natural Earth MapLibre globe zooms to the approximate 1884 source area (NYC Emergency
 * Management: somewhere between Brooklyn and Sandy Hook, ~M5.2 estimated from damage reports), the approved 1884 reconstruction still carries the
 * documented damage, then the map covers the April 5, 2024 Tewksbury M4.8 (USGS us7000ma74) with the real Did You Feel It? response areas and the
 * 5–25 % / 100-year chance of potentially damaging shaking (USGS 2023 maps, cited by the NYC hazard plan). The brick-buildings still carries the
 * vulnerability; the calm Manhattan still closes it. The 1884 area and the NYC-area ring are schematic; no shaking-intensity map is drawn.
 * Reuses LiveMap, localStyle, the edu kit, EduShort Layers and Captions, and the nyc-tsunami drawing conventions.
 */
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { LiveMap } from '../../src/map/LiveMap.js';
import type { MapCamera } from '../../src/map/LiveMap.js';
import { localStyle } from '../../src/spike/styles.js';
import { FPS, Layers, eduShortSchema } from '../../src/edu/EduShort.js';
import type { EduShortProps, SfxCue } from '../../src/edu/EduShort.js';
import type { EduAudio } from '../../src/edu/narration.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { beatsFor, placeholderCaptions } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { Txt, clamp, f1, lerp, prog, vis } from '../../src/edu/kit.js';
import data from './data.json' with { type: 'json' };
import { NYC_EARTHQUAKE, imagePath } from './script.js';
import type { ImageKey } from './script.js';

export { eduShortSchema };
type LL = [ number, number ];
const ease = ( x: number ) => x * x * ( 3 - 2 * x );
const AMBER = '#F2A900';
const GREEN = '#3ddc97';
const DYFI = '#FFC857';

// ---------- places (lon, lat) ----------
/** USGS us7000ma74 epicenter (Tewksbury Township, N.J.). */
const TEWKSBURY: LL = [ data.event.lon, data.event.lat ];
const NYC: LL = [ -74.006, 40.7128 ];
const BROOKLYN: LL = [ -73.95, 40.65 ];
const SANDY_HOOK: LL = [ -74.0, 40.45 ];
const MAINE: LL = [ -69.6, 44.7 ];
const VIRGINIA: LL = [ -78.3, 38.0 ];
/** 1884: "somewhere between Brooklyn and Sandy Hook" (NYC Emergency Management); a schematic ellipse over that span, not a computed error region. */
const AREA_1884: LL[] = Array.from( { length: 36 }, ( _, i ) => {
  const a = ( i / 36 ) * Math.PI * 2;
  return [ -73.975 + 0.15 * Math.cos( a ), 40.555 + 0.14 * Math.sin( a ) ] as LL;
} );
/** Schematic "NYC area" ring for the hazard figure (~25 km around lower Manhattan). */
const NYC_RING: LL[] = Array.from( { length: 40 }, ( _, i ) => {
  const a = ( i / 40 ) * Math.PI * 2;
  return [ NYC[0] + 0.3 * Math.cos( a ), NYC[1] + 0.225 * Math.sin( a ) ] as LL;
} );
/** USGS DYFI 10 km response cells around the Northeast, merged into a 0.4° grid (dot = area with reports; size grows with responses). */
const CELLS: { p: LL; n: number; d: number }[] = ( () => {
  const bins = new Map<string, { lon: number; lat: number; n: number; w: number }>();
  for ( const [ lon, lat, n ] of data.cells as number[][] ) {
    if ( n < 2 || lon < -86 || lon > -64 || lat < 33 || lat > 48 ) continue;
    const k = `${Math.floor( lon / 0.4 )}:${Math.floor( lat / 0.4 )}`;
    const b = bins.get( k ) ?? { lon: 0, lat: 0, n: 0, w: 0 };
    b.lon += lon * n; b.lat += lat * n; b.n += n; b.w += n;
    bins.set( k, b );
  }
  // reveal order is a fixed shuffle, not distance from the epicenter: the dots are reports, not a wave front
  return [ ...bins.values() ].map( ( b, i ) => ( { p: [ b.lon / b.w, b.lat / b.w ] as LL, n: b.n, d: ( i * 0.6180339 ) % 1 } ) );
} )();

const POINTS = { tew: TEWKSBURY, nyc: NYC, bk: BROOKLYN, sh: SANDY_HOOK, me: MAINE, va: VIRGINIA };
/** Everything the overlay draws, projected by the map each frame. */
const TRACK: LL[] = [ ...Object.values( POINTS ), ...AREA_1884, ...NYC_RING, ...CELLS.map( c => c.p ) ];
const idx = ( () => {
  let o = 0;
  const take = ( n: number ) => { const s = o; o += n; return s; };
  return { points: take( Object.keys( POINTS ).length ), area: take( AREA_1884.length ), ring: take( NYC_RING.length ), cells: take( CELLS.length ) };
} )();

// ---------- timing ----------
/** Start of the first caption phrase that begins with `text` (exact word timing from the alignment); `fallback` without narration. */
const cap = ( audio: EduAudio | undefined, text: string, fallback: number ) => audio?.captions.find( c => c.text.startsWith( text ) )?.start ?? fallback;
type Cues = ReturnType<typeof cuesFor>;
const cuesFor = ( b: Beats, audio?: EduAudio ) => ( {
  mapA: b.e84a.start - 0.15,
  histIn: b.e84b.start - 0.2,
  mapB: b.nj0.start - 0.15,
  brickIn: b.sky.start - 0.2,
  calmIn: b.yes.start - 0.25,
  est: cap( audio, 'an earthquake estimated', b.e84a.start + 1.2 ),
  dyfi: b.nj1.start,
  count: b.nj2.start + 0.1,
  most: cap( audio, 'the most for any', b.nj2.end - 1.4 ),
  pct: b.haz1.start,
  brick: b.v0.start,
  infra: cap( audio, 'aging underground', within( b.v0, 0.35 ) ),
  soft: cap( audio, 'and soft ground', within( b.v0, 0.75 ) ),
  yesWord: cap( audio, 'Yes.', b.yes.end - 0.45 ),
  noWord: cap( audio, 'No.', b.no.end - 0.3 ),
  proof: cap( audio, 'New York isn', b.end.start + 1.0 )
} );
const within = ( l: { start: number; end: number }, f: number ) => l.start + ( l.end - l.start ) * f;

type Stop = { t: number; c: LL; z: number; p?: number; br?: number };
/** Map focus sits between the cards (y 310-720) and the captions (y 1330+). */
const PAD = { top: 680, bottom: 560, left: 0, right: 0 };
const stops = ( b: Beats, c: Cues, total: number ): Stop[] => [
  { t: 0, c: [ -74.0, 40.62 ], z: 5.0 },
  { t: c.mapA, c: [ -74.0, 40.62 ], z: 5.2 },
  { t: c.mapA + 2.6, c: [ -73.97, 40.57 ], z: 9.1, p: 34, br: -10 },
  { t: c.histIn + 0.6, c: [ -73.97, 40.57 ], z: 9.3, p: 38, br: -5 },
  { t: c.mapB, c: [ -74.25, 40.66 ], z: 7.4, p: 18 },
  { t: b.nj0.start + 1.8, c: [ -74.38, 40.7 ], z: 8.0, p: 28, br: 6 },
  { t: c.dyfi - 0.1, c: [ -74.38, 40.7 ], z: 8.1, p: 30, br: 8 },
  { t: c.dyfi + 1.1, c: [ -74.6, 41.0 ], z: 5.45 },
  { t: b.but.start + 0.1, c: [ -74.5, 41.05 ], z: 5.55 },
  { t: b.but.start + 2.0, c: [ -73.97, 40.72 ], z: 8.7, p: 38, br: 12 },
  { t: b.haz1.end, c: [ -73.97, 40.72 ], z: 9.0, p: 44, br: 24 },
  { t: c.brickIn + 0.6, c: [ -73.97, 40.72 ], z: 9.05, p: 45, br: 26 },
  { t: total, c: [ -73.97, 40.72 ], z: 9.05, p: 45, br: 26 }
];

const camera = ( frame: number, b: Beats, c: Cues, total: number ): MapCamera => {
  const t = frame / FPS;
  const s = stops( b, c, total );
  let i = s.findIndex( x => x.t > t );
  if ( i < 0 ) i = s.length - 1;
  if ( i === 0 ) i = 1;
  const a = s[i - 1], z = s[i];
  const k = ease( clamp( ( t - a.t ) / Math.max( 0.01, z.t - a.t ) ) );
  const m = ( p: number, q: number ) => p + ( q - p ) * k;
  return { center: [ m( a.c[0], z.c[0] ), m( a.c[1], z.c[1] ) ], zoom: m( a.z, z.z ), bearing: m( a.br ?? 0, z.br ?? 0 ), pitch: m( a.p ?? 0, z.p ?? 0 ), padding: PAD };
};

// ---------- drawing helpers (nyc-tsunami conventions) ----------
type P = { x: number; y: number };
/** Text with a dark halo so it reads on the stills and on the dark globe. */
const Halo: React.FC<{ x: number; y: number; size: number; children: React.ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end'; opacity?: number; display?: boolean; weight?: number; spacing?: number }> = ( { x, y, size, children, color = COLORS.text, anchor = 'middle', opacity = 1, display = false, weight = 800, spacing = 0 } ) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={display ? FONT.display : FONT.ui} fontWeight={weight} fontSize={size} letterSpacing={spacing} fill={color} stroke="#070B14" strokeWidth={size * 0.16} strokeLinejoin="round" paintOrder="stroke" opacity={opacity} style={display ? { textTransform: 'uppercase' } : undefined}>{children}</text>
);
const path = ( pts: P[] ) => ( pts.length ? `M${pts.map( p => `${f1( p.x )},${f1( p.y )}` ).join( 'L' )}` : '' );
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
/** A dark card with a kicker, a big value and up to two notes; centered on x = 540. */
const Card: React.FC<{ y: number; o: number; color: string; kicker: string; big: React.ReactNode; note?: string; note2?: string; bigSize?: number; h?: number; pop?: number }> = ( { y, o, color, kicker, big, note, note2, bigSize = 120, h = 300, pop = 1 } ) => {
  if ( o <= 0.01 ) return null;
  return (
    <g opacity={o} transform={`translate(540 ${y + h / 2}) scale(${pop.toFixed( 4 )}) translate(-540 ${-( y + h / 2 )})`}>
      <rect x={60} y={y} width={960} height={h} rx={26} fill="rgba(7,11,20,0.9)" stroke={color} strokeWidth={7} />
      <Txt x={540} y={y + 62} size={38} display weight={800} spacing={4} color={color}>{kicker}</Txt>
      <Txt x={540} y={y + 62 + bigSize * 0.95} size={bigSize} display weight={800} color={COLORS.text}>{big}</Txt>
      {note ? <Txt x={540} y={y + h - ( note2 ? 76 : 34 )} size={32} weight={700} color={COLORS.textSupport}>{note}</Txt> : null}
      {note2 ? <Txt x={540} y={y + h - 32} size={26} weight={700} color={COLORS.textSupport}>{note2}</Txt> : null}
    </g>
  );
};
/** A small labelled chip that pops in at t0. */
const Chip: React.FC<{ x: number; y: number; w: number; t: number; t0: number; t1: number; color: string; children: string }> = ( { x, y, w, t, t0, t1, color, children } ) => {
  const o = vis( t, t0, t1, 0.2 );
  if ( o <= 0.01 ) return null;
  const s = popIn( t, t0 );
  return (
    <g opacity={o} transform={`translate(${x} ${y}) scale(${s.toFixed( 4 )}) translate(${-x} ${-y})`}>
      <rect x={x - w / 2} y={y - 40} width={w} height={80} rx={40} fill="rgba(7,11,20,0.88)" stroke={color} strokeWidth={5} />
      <Txt x={x} y={y + 14} size={36} display weight={800} spacing={2} color={color}>{children}</Txt>
    </g>
  );
};
const popIn = ( t: number, t0: number ) => lerp( 1.35, 1, ease( clamp( ( t - t0 ) / 0.22 ) ) );

// ---------- map overlay ----------
const overlay = ( b: Beats, c: Cues, total: number ) => ( _m: P, frame: number, tracked?: P[] ) => {
  if ( !tracked ) return null;
  const t = frame / FPS;
  const pt = ( k: keyof typeof POINTS ) => tracked[idx.points + Object.keys( POINTS ).indexOf( k )];
  const seg = ( o: number, n: number ) => tracked.slice( o, o + n );
  const sceneA = vis( t, c.mapA, c.histIn + 0.5, 0.4 );
  const sceneB = vis( t, c.mapB, c.brickIn + 0.5, 0.4 );
  if ( sceneA + sceneB <= 0.01 ) return null;
  // 1884
  const area = vis( t, c.est - 0.2, c.histIn + 0.5, 0.4 );
  const places84 = vis( t, c.mapA + 1.6, c.histIn + 0.5, 0.4 );
  // 2024
  const quake = vis( t, b.nj0.start + 0.6, b.but.start + 0.4, 0.35 );
  const link = vis( t, b.nj0.start + 1.6, c.dyfi + 0.3, 0.35 );
  const dyfiO = vis( t, c.dyfi, b.but.start + 0.9, 0.3 );
  const nycO = vis( t, b.nj0.start + 1.2, total, 0.35 );
  const ring = vis( t, b.haz0.start, c.brickIn + 0.5, 0.4 );
  const count = Math.round( data.event.dyfiResponses * ease( clamp( ( t - c.count ) / 2.6 ) ) );
  const tag = t < c.mapB ? 'HISTORICAL EVENT · 1884' : t < b.but.start + 0.6 ? 'APRIL 5, 2024 · USGS DATA' : 'HAZARD ESTIMATE · NOT A PREDICTION';
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs><linearGradient id="eqShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070B14" stopOpacity="0.85" /><stop offset="1" stopColor="#070B14" stopOpacity="0" /></linearGradient></defs>
      <rect width={1080} height={600} fill="url(#eqShade)" opacity={Math.max( sceneA, sceneB )} />
      {/* 1884: approximate source area between Brooklyn and Sandy Hook */}
      <g opacity={sceneA}>
        <g opacity={area}>
          <path d={`${path( seg( idx.area, AREA_1884.length ) )}Z`} fill={AMBER} fillOpacity={0.2 + 0.1 * Math.sin( t * 4 )} stroke={AMBER} strokeWidth={5} strokeDasharray="14 10" />
          <Halo x={540} y={1180} size={40} display color={AMBER} spacing={4}>APPROXIMATE AREA</Halo>
          <Halo x={540} y={1226} size={28} color={COLORS.textSupport} weight={700} spacing={2}>EXACT LOCATION UNKNOWN</Halo>
        </g>
        <g opacity={places84}>
          <Dot p={pt( 'bk' )} color="#fff" r={8} />
          <Halo x={pt( 'bk' ).x + 24} y={pt( 'bk' ).y - 20} size={36} anchor="start">BROOKLYN</Halo>
          <Dot p={pt( 'sh' )} color="#fff" r={8} />
          <Halo x={pt( 'sh' ).x - 24} y={pt( 'sh' ).y + 12} size={36} anchor="end">SANDY HOOK, N.J.</Halo>
        </g>
      </g>
      {/* 2024: measured epicenter, New York City, DYFI response areas */}
      <g opacity={sceneB}>
        <g opacity={dyfiO}>
          {CELLS.map( ( cell, i ) => {
            const p = tracked[idx.cells + i];
            const o = clamp( ( t - c.dyfi - cell.d * 0.9 ) / 0.25 );
            if ( !p || o <= 0 ) return null;
            return <circle key={i} cx={p.x} cy={p.y} r={3 + Math.min( 9, Math.log10( cell.n ) * 3 )} fill={DYFI} opacity={0.55 * o} />;
          } )}
          <g opacity={prog( t, c.dyfi + 0.5, 0.4 )}>
            <Halo x={pt( 'me' ).x} y={pt( 'me' ).y} size={40} display spacing={3}>MAINE</Halo>
            <Halo x={pt( 'va' ).x} y={pt( 'va' ).y} size={40} display spacing={3}>VIRGINIA</Halo>
          </g>
        </g>
        <g opacity={link}>
          <line x1={pt( 'tew' ).x} y1={pt( 'tew' ).y} x2={pt( 'nyc' ).x} y2={pt( 'nyc' ).y} stroke="#fff" strokeWidth={4} strokeDasharray="12 10" opacity={0.8} />
          <Halo x={( pt( 'tew' ).x + pt( 'nyc' ).x ) / 2} y={( pt( 'tew' ).y + pt( 'nyc' ).y ) / 2 + 52} size={38} display spacing={2}>~65 KM</Halo>
        </g>
        <g opacity={ring}>
          <path d={`${path( seg( idx.ring, NYC_RING.length ) )}Z`} fill={AMBER} fillOpacity={0.12 + 0.06 * Math.sin( t * 3 )} stroke={AMBER} strokeWidth={5} strokeDasharray="14 10" />
          <Halo x={540} y={1226} size={26} color={COLORS.textSupport} weight={700} spacing={2}>NYC AREA (SCHEMATIC)</Halo>
        </g>
        <g opacity={quake}>
          <Pulse p={pt( 'tew' )} frame={frame} start={Math.round( ( b.nj0.start + 0.6 ) * FPS )} color={COLORS.redHot} max={150} />
          <Dot p={pt( 'tew' )} color={COLORS.redHot} r={13} />
          <g opacity={1 - dyfiO * 0.9}><Halo x={pt( 'tew' ).x} y={pt( 'tew' ).y + 62} size={36} display spacing={2} color={COLORS.redText}>TEWKSBURY, N.J.</Halo></g>
        </g>
        <g opacity={nycO}>
          <Dot p={pt( 'nyc' )} color={GREEN} r={11} />
          <g opacity={1 - dyfiO * 0.9}><Halo x={pt( 'nyc' ).x} y={pt( 'nyc' ).y - 34} size={42} display spacing={3}>NEW YORK CITY</Halo></g>
        </g>
      </g>
      {/* cards (top band, clear of the captions at y 1330-1480) */}
      <Card y={310} o={vis( t, c.mapA + 0.3, c.histIn + 0.5, 0.3 )} pop={popIn( t, c.mapA + 0.3 )} color={AMBER} kicker="AUG 10, 1884 · ESTIMATED MAGNITUDE" big="M5.2" bigSize={150} note="From historical damage reports · no seismograph record" h={340} />
      <Card y={310} o={vis( t, b.nj0.start + 0.6, c.dyfi + 0.1, 0.3 )} pop={popIn( t, b.nj0.start + 0.6 )} color={COLORS.redHot} kicker="APRIL 5, 2024 · NEW JERSEY" big="M4.8" bigSize={150} note="Measured by seismometers · USGS" h={340} />
      <Card y={310} o={vis( t, c.dyfi + 0.1, c.count, 0.25 )} color={DYFI} kicker="FELT BY MILLIONS" big="VIRGINIA TO MAINE" bigSize={84} note="USGS Did You Feel It? response areas" h={290} />
      <Card y={310} o={vis( t, c.count, b.but.start + 0.4, 0.25 )} color={DYFI} kicker="“DID YOU FEEL IT?” REPORTS" big={count.toLocaleString( 'en-US' )} bigSize={150} note={t >= c.most ? 'The most for any earthquake · USGS' : ' '} h={340} />
      <Card y={310} o={vis( t, b.haz0.start, c.pct, 0.3 )} pop={popIn( t, b.haz0.start )} color={AMBER} kicker="NEW YORK CITY HAZARD PLAN" big="USGS 2023 MAPS" bigSize={96} note="National Seismic Hazard Model" h={300} />
      <Card y={310} o={vis( t, c.pct, c.brickIn + 0.5, 0.3 )} pop={popIn( t, c.pct )} color={AMBER} kicker="NYC AREA · NEXT 100 YEARS" big="5–25%" bigSize={170} note="Chance of potentially damaging shaking" note2="Intensity VI or stronger · a hazard estimate, not a forecast" h={420} />
      <Txt x={540} y={272} size={28} display weight={800} spacing={6} color={t < c.mapB ? AMBER : t < b.but.start + 0.6 ? COLORS.redText : AMBER} opacity={0.95 * Math.max( sceneA, sceneB )}>{tag}</Txt>
      <g opacity={Math.max( sceneA, sceneB ) * 0.85}>
        <Txt x={540} y={1530} size={22} weight={700} spacing={1} color={COLORS.textSupport}>{t < c.mapB ? 'NATURAL EARTH MAP · 1884 AREA APPROXIMATE, NOT MEASURED' : 'NATURAL EARTH MAP · DOTS: DYFI RESPONSE AREAS, NOT A SHAKING MAP'}</Txt>
        <Txt x={540} y={1562} size={22} weight={700} spacing={1} color={COLORS.textSupport}>{t < c.mapB ? 'SOURCE: NYC EMERGENCY MANAGEMENT' : 'SOURCES: USGS · NYC HAZARD MITIGATION PLAN'}</Txt>
      </g>
    </svg>
  );
};

// ---------- stills ----------
type Kb = { s: [ number, number ]; x: [ number, number ]; y: [ number, number ] };
/** Ken Burns still; `jolts` are times of a decaying shake (seconds). */
const Shot: React.FC<{ id: ImageKey; t: number; from: number; to: number; kb: Kb; shake?: number; jolts?: number[]; filter?: string }> = ( { id, t, from, to, kb, shake = 0, jolts = [], filter } ) => {
  const o = vis( t, from <= 0 ? -1 : from, to, 0.45 );
  if ( o <= 0.01 ) return null;
  const u = ease( clamp( ( t - from ) / ( to - from ) ) );
  const amp = shake * jolts.reduce( ( s, j ) => s + ( t >= j ? Math.max( 0, 1 - ( t - j ) / 1.1 ) : 0 ), 0 );
  const jx = amp * Math.sin( t * 37 ) + 3 * shake / 10 * Math.sin( t * 2.1 );
  const jy = amp * Math.cos( t * 29 ) * 0.6;
  return (
    <AbsoluteFill style={{ opacity: o, overflow: 'hidden', background: '#05070d' }}>
      <Img src={staticFile( imagePath( id ) )} style={{ width: 1080, height: 1920, objectFit: 'cover', filter, transform: `translate(${f1( lerp( kb.x[0], kb.x[1], u ) + jx )}px, ${f1( lerp( kb.y[0], kb.y[1], u ) + jy )}px) scale(${lerp( kb.s[0], kb.s[1], u ).toFixed( 4 )})` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,7,13,0.6) 0%, rgba(5,7,13,0) 30%, rgba(5,7,13,0) 62%, rgba(5,7,13,0.7) 100%)' }} />
    </AbsoluteFill>
  );
};

/** Restrained drifting dust over the opening still: deterministic soft particles, fading with the still. */
const DUST = Array.from( { length: 46 }, ( _, i ) => ( { x: ( i * 233.7 ) % 1080, y: 700 + ( ( i * 397.3 ) % 1200 ), r: 3 + ( i * 7.3 ) % 9, v: 18 + ( i * 13.1 ) % 40, o: 0.12 + ( ( i * 0.37 ) % 0.25 ) } ) );
const Dust: React.FC<{ t: number; o: number }> = ( { t, o } ) => ( o <= 0.01 ? null : (
  <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: o }}>
    <defs>
      <filter id="dustBlur"><feGaussianBlur stdDeviation="2.5" /></filter>
      <linearGradient id="dustHaze" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stopColor="#b9a68c" stopOpacity="0" /><stop offset="1" stopColor="#b9a68c" stopOpacity="0.22" /></linearGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#dustHaze)" />
    <g filter="url(#dustBlur)">
      {DUST.map( ( d, i ) => <circle key={i} cx={( d.x + t * d.v * 0.6 ) % 1100} cy={d.y - t * d.v} r={d.r} fill="#d8c8b0" opacity={d.o} /> )}
    </g>
  </svg>
) );

/** Hook title on the disaster still, captions-free cards on the stills, and the closing verdict on the calm city. */
const StillText: React.FC<{ t: number; b: Beats; c: Cues; total: number }> = ( { t, b, c, total } ) => {
  const word = ( text: string, y: number, t0: number, size: number, color: string ) => (
    <g opacity={clamp( ( t - t0 ) / 0.08 )} transform={`translate(540 ${y}) scale(${popIn( t, t0 ).toFixed( 4 )}) translate(-540 ${-y})`}>
      <Halo x={540} y={y} size={size} display color={color}>{text}</Halo>
    </g>
  );
  const hook = vis( t, -1, b.q.start - 0.05, 0.25 );
  const fiction = vis( t, b.q.start - 0.05, c.mapA + 0.3, 0.2 );
  const hist = vis( t, c.histIn + 0.2, c.mapB + 0.3, 0.3 );
  const brick = vis( t, c.brickIn + 0.2, c.calmIn + 0.2, 0.3 );
  const yes = vis( t, b.yes.start + 0.05, b.no.start - 0.05, 0.25 );
  const no = vis( t, b.no.start, b.end.start, 0.25 );
  const end = vis( t, b.end.start, total + 1, 0.3 );
  // editorial convention (docs/DECISION_LOG.md): no prominent AI label; a small translucent watermark while a still is on screen
  const mark = t < c.mapA + 0.3 ? 'AI VISUALIZATION · HYPOTHETICAL' : t < c.mapB + 0.3 ? 'AI VISUALIZATION · HISTORICAL RECONSTRUCTION' : t < c.calmIn ? 'AI VISUALIZATION · ILLUSTRATIVE' : 'AI VISUALIZATION';
  const ai = Math.max( vis( t, -1, c.mapA + 0.3, 0.3 ), hist, brick, vis( t, c.calmIn, total + 1, 0.3 ) );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <g opacity={hook}>
        {word( 'EARTHQUAKE', 430, 0.15, 150, COLORS.redHot )}
        {word( 'IN NYC?!', 590, 0.55, 170, COLORS.text )}
      </g>
      <g opacity={fiction}>
        <rect x={72} y={380} width={936} height={380} rx={22} fill="rgba(7,11,20,0.78)" stroke={AMBER} strokeWidth={8} />
        {word( 'HOLLYWOOD', 520, b.q.start + 0.05, 110, AMBER )}
        {word( 'FICTION?', 640, b.q.start + 0.3, 110, AMBER )}
        {word( 'THINK AGAIN.', 880, b.again.start, 118, COLORS.redHot )}
      </g>
      {/* 1884 reconstruction: the documented damage */}
      <g opacity={hist}>
        <Card y={330} o={1} pop={popIn( t, b.e84b.start )} color={AMBER} kicker="DOCUMENTED IN 1884" big="CHIMNEYS DOWN" bigSize={100} note="Brick buildings damaged in N.Y. and N.J." note2="Felt from Virginia to Maine · NYC Emergency Management" h={340} />
      </g>
      {/* old buildings: the vulnerability, as citywide figures, not an assessment of the pictured block */}
      <g opacity={brick}>
        <Card y={330} o={vis( t, c.brickIn + 0.2, c.brick, 0.25 )} pop={popIn( t, b.sky.start )} color={AMBER} kicker="THE BIGGEST RISK" big="NOT SKYSCRAPERS" bigSize={92} note="High-rises are less vulnerable than low-rises" h={290} />
        <Card y={330} o={vis( t, c.brick, b.v1.start, 0.25 )} pop={popIn( t, c.brick )} color={COLORS.redHot} kicker="UNREINFORCED BRICK BUILDINGS IN NYC" big="100,000+" bigSize={150} note="Mostly built mid-1800s to 1930s" note2="Citywide figure · NYC Emergency Management" h={380} />
        <Card y={330} o={vis( t, b.v1.start, c.calmIn + 0.2, 0.25 )} pop={popIn( t, b.v1.start )} color={COLORS.redHot} kicker="A MODERATE EARTHQUAKE" big="COSTLY DISASTER" bigSize={100} note="Most NYC buildings predate its 1995 seismic code" h={300} />
        <Chip x={300} y={790} w={440} t={t} t0={c.brick + 0.15} t1={b.v1.start + 0.1} color={COLORS.redHot}>OLD BRICK</Chip>
        <Chip x={780} y={790} w={440} t={t} t0={c.infra} t1={b.v1.start + 0.1} color={AMBER}>INFRASTRUCTURE</Chip>
        <Chip x={540} y={900} w={440} t={t} t0={c.soft} t1={b.v1.start + 0.1} color={DYFI}>SOFT GROUND</Chip>
      </g>
      <g opacity={yes}>
        <Halo x={540} y={420} size={62} display spacing={3}>DAMAGING QUAKE IN NYC?</Halo>
        {word( 'YES', 610, c.yesWord, 200, GREEN )}
      </g>
      <g opacity={no}>
        <Halo x={540} y={420} size={62} display spacing={3}>CATASTROPHIC QUAKE LIKELY?</Halo>
        {word( 'NO', 610, c.noWord, 200, COLORS.redHot )}
      </g>
      <g opacity={end}>
        {word( 'MYTH OR FACT?', 400, b.end.start, 92, AMBER )}
        {word( 'NYC ISN’T', 560, c.proof, 130, COLORS.text )}
        {word( 'EARTHQUAKE-PROOF.', 700, c.proof + 0.45, 112, COLORS.redHot )}
      </g>
      <Txt x={72} y={236} size={20} weight={700} spacing={3} anchor="start" color={COLORS.text} opacity={0.5 * ai}>{mark}</Txt>
    </svg>
  );
};

const cues = ( b: Beats, c: Cues ): SfxCue[] => [
  { sfx: 'boom', at: 0, dur: 3, volume: 0.55 },
  { sfx: 'rumble', at: 0.1, dur: 3.4, volume: 0.32 },
  { sfx: 'rumble', at: b.h1.start, dur: 2.4, volume: 0.28 },
  { sfx: 'boom', at: b.q.start, dur: 2, volume: 0.3 },
  { sfx: 'tick', at: b.again.start, dur: 0.3, volume: 0.5 },
  { sfx: 'whoosh', at: c.mapA - 0.2, dur: 1.4, volume: 0.4 },
  { sfx: 'tick', at: c.mapA + 0.3, dur: 0.3, volume: 0.5 },
  { sfx: 'rumble', at: c.est, dur: 2.2, volume: 0.25 },
  { sfx: 'whoosh', at: c.histIn - 0.1, dur: 1.2, volume: 0.3 },
  { sfx: 'whoosh', at: c.mapB - 0.2, dur: 1.4, volume: 0.35 },
  { sfx: 'boom', at: b.nj0.start + 0.6, dur: 2.5, volume: 0.45 },
  { sfx: 'whoosh', at: c.dyfi - 0.1, dur: 1.3, volume: 0.3 },
  { sfx: 'riser', at: c.count, dur: 2.6, volume: 0.22 },
  { sfx: 'tick', at: c.count + 2.6, dur: 0.3, volume: 0.5 },
  { sfx: 'whoosh', at: b.but.start + 0.1, dur: 1.6, volume: 0.35 },
  { sfx: 'tick', at: b.haz0.start, dur: 0.3, volume: 0.45 },
  { sfx: 'boom', at: c.pct, dur: 1.8, volume: 0.35 },
  { sfx: 'whoosh', at: c.brickIn - 0.1, dur: 1.2, volume: 0.35 },
  { sfx: 'tick', at: c.brick, dur: 0.3, volume: 0.5 },
  { sfx: 'tick', at: c.infra, dur: 0.3, volume: 0.4 },
  { sfx: 'tick', at: c.soft, dur: 0.3, volume: 0.4 },
  { sfx: 'whoosh', at: c.calmIn - 0.1, dur: 1.2, volume: 0.35 },
  { sfx: 'boom', at: c.yesWord, dur: 1.5, volume: 0.35 },
  { sfx: 'tick', at: c.noWord, dur: 0.3, volume: 0.5 },
  { sfx: 'boom', at: c.proof + 0.45, dur: 2, volume: 0.35 }
];

export const NycEarthquake: React.FC<EduShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( NYC_EARTHQUAKE, audio );
  const c = cuesFor( b, audio );
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap cameraAt={f => camera( f, b, c, total )} epicenter={TEWKSBURY} tiles="local" style={() => localStyle()} trackPoints={TRACK} diagnostics={{ event: 'nyc-earthquake', tiles: 'local' }} background={COLORS.background} overlay={overlay( b, c, total )} />
      <Shot id="disaster" t={t} from={0} to={c.mapA + 0.4} kb={{ s: [ 1.2, 1.04 ], x: [ 0, 0 ], y: [ 50, -10 ] }} shake={14} jolts={[ 0, b.h1.start ]} />
      <Dust t={t} o={vis( t, -1, c.mapA + 0.4, 0.45 )} />
      <Shot id="historic" t={t} from={c.histIn} to={c.mapB + 0.4} kb={{ s: [ 1.04, 1.14 ], x: [ 0, -10 ], y: [ 0, -24 ] }} shake={5} jolts={[ c.histIn + 0.3 ]} />
      <Shot id="brick" t={t} from={c.brickIn} to={c.calmIn + 0.4} kb={{ s: [ 1.05, 1.17 ], x: [ 8, -8 ], y: [ 0, 18 ] }} />
      <Shot id="calm" t={t} from={c.calmIn} to={total + 5} kb={{ s: [ 1.16, 1.03 ], x: [ -8, 8 ], y: [ 30, -6 ] }} />
      <StillText t={t} b={b} c={c} total={total} />
      <Captions t={t} captions={audio?.captions ?? placeholderCaptions( NYC_EARTHQUAKE.script )} />
      {audio ? <Layers audio={audio} cues={cues( b, c )} total={total} /> : null}
    </AbsoluteFill>
  );
};
