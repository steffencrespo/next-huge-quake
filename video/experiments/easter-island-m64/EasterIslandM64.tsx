/**
 * "M6.4 EARTHQUAKE Near EASTER ISLAND! What Happened?": a 30-40 s breaking-news Short for USGS us7000ttxz. It opens on the approved AI-generated
 * illustration of Easter Island (easter-island-m64-opening.png, small watermark on screen), crossfades into the Natural Earth globe at Easter Island
 * and pulls out to the real offshore epicenter (~1,500 km southeast), shows the event cards, the PAGER and tsunami status as reported, the Chile
 * Rise traced by USGS M5+ seismicity, and the 2021 M6.7 at nearly the same spot. Reuses LiveMap, localStyle, the edu kit, EduShort Layers and
 * Captions. Nothing here is published or wired into the publisher.
 */
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT, PAGER_COLORS } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { LiveMap } from '../../src/map/LiveMap.js';
import type { MapCamera } from '../../src/map/LiveMap.js';
import { localStyle } from '../../src/spike/styles.js';
import { FPS, Layers, eduShortSchema } from '../../src/edu/EduShort.js';
import type { EduShortProps, SfxCue } from '../../src/edu/EduShort.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { beatsFor, placeholderCaptions } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { Txt, clamp, vis } from '../../src/edu/kit.js';
import { EASTER_ISLAND_M64, EVENT, HANGA_ROA, IMAGE_FILE, PRIOR_2021, SEISMICITY } from './script.js';

export { eduShortSchema };
const ease = ( x: number ) => x * x * ( 3 - 2 * x );
const IMG_FADE = 0.7;
const EPI: [ number, number ] = [ EVENT.lon, EVENT.lat ];
const PAD = { top: 300, bottom: 520, left: 0, right: 0 };
/** Labels anchored on the map (lon, lat), placed from the plotted USGS seismicity and the Chile Rise / East Pacific Rise geography. */
const LABELS = {
  chileRise: [ -86.5, -40.2 ] as [ number, number ],
  epr: [ -108.4, -25.4 ] as [ number, number ],
  nazca: [ -97, -30.5 ] as [ number, number ],
  antarctic: [ -101, -42.5 ] as [ number, number ],
  pacific: [ -119, -31 ] as [ number, number ]
};
/** Tracked points: Hanga Roa, the 2021 M6.7, the five labels, then the seismicity dots. */
const FIXED: [ number, number ][] = [ HANGA_ROA, [ PRIOR_2021.lon, PRIOR_2021.lat ], LABELS.chileRise, LABELS.epr, LABELS.nazca, LABELS.antarctic, LABELS.pacific ];
const TRACK: [ number, number ][] = [ ...FIXED, ...SEISMICITY.map( ( [ lon, lat ] ) => [ lon, lat ] as [ number, number ] ) ];
const MID: [ number, number ] = [ ( HANGA_ROA[0] + EPI[0] ) / 2, ( HANGA_ROA[1] + EPI[1] ) / 2 ];

const imgHold = ( b: Beats ) => b.s0.start - 0.35;
/** The epicenter marker drops on "southeast". */
const epiAt = ( b: Beats ) => b.s0.start + 1.9;

type Stop = { t: number; lon: number; lat: number; zoom: number; pitch?: number };
const stops = ( b: Beats, total: number ): Stop[] => [
  { t: 0, lon: HANGA_ROA[0], lat: HANGA_ROA[1], zoom: 7.4 },
  { t: imgHold( b ), lon: HANGA_ROA[0], lat: HANGA_ROA[1], zoom: 7.0 },
  { t: b.s0.start + 0.5, lon: HANGA_ROA[0], lat: HANGA_ROA[1], zoom: 6.6 },
  { t: b.s0.start + 2.4, lon: MID[0], lat: MID[1], zoom: 5.15 },
  { t: b.s1.start, lon: MID[0], lat: MID[1], zoom: 5.1 },
  { t: b.s1.start + 1.4, lon: -103.6, lat: -32.9, zoom: 5.2, pitch: 20 },
  { t: b.i1.end, lon: -103.4, lat: -33.1, zoom: 5.35, pitch: 26 },
  { t: b.w0.start + 1.8, lon: -102, lat: -35.5, zoom: 3.95, pitch: 0 },
  { t: b.w1.end, lon: -101.5, lat: -35.5, zoom: 4.1 },
  { t: b.e0.start + 1.2, lon: ( EPI[0] + PRIOR_2021.lon ) / 2, lat: ( EPI[1] + PRIOR_2021.lat ) / 2, zoom: 8.2 },
  { t: b.e0.end, lon: ( EPI[0] + PRIOR_2021.lon ) / 2, lat: ( EPI[1] + PRIOR_2021.lat ) / 2, zoom: 8.35 },
  { t: b.e1.start + 1.8, lon: -100, lat: -32.5, zoom: 3.9 },
  { t: total, lon: -100, lat: -32.5, zoom: 3.8 }
];

export const camera = ( frame: number, b: Beats, total: number ): MapCamera => {
  const t = frame / FPS;
  const s = stops( b, total );
  let i = s.findIndex( x => x.t > t );
  if ( i < 0 ) i = s.length - 1;
  if ( i === 0 ) i = 1;
  const a = s[i - 1], z = s[i];
  const k = ease( clamp( ( t - a.t ) / Math.max( 0.01, z.t - a.t ) ) );
  const m = ( p: number, q: number ) => p + ( q - p ) * k;
  return { center: [ m( a.lon, z.lon ), m( a.lat, z.lat ) ], zoom: m( a.zoom, z.zoom ), bearing: 0, pitch: m( a.pitch ?? 0, z.pitch ?? 0 ), padding: PAD };
};

/** Text with a dark halo so it reads on both the image and the dark globe. */
const Halo: React.FC<{ x: number; y: number; size: number; children: React.ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end'; opacity?: number; display?: boolean; weight?: number; spacing?: number }> = ( { x, y, size, children, color = COLORS.text, anchor = 'middle', opacity = 1, display = false, weight = 800, spacing = 0 } ) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={display ? FONT.display : FONT.ui} fontWeight={weight} fontSize={size} letterSpacing={spacing} fill={color} stroke="#070B14" strokeWidth={size * 0.16} strokeLinejoin="round" paintOrder="stroke" opacity={opacity} style={display ? { textTransform: 'uppercase' } : undefined}>{children}</text>
);

const Panel: React.FC<{ y?: number; h?: number; o: number; stroke?: string; children: React.ReactNode }> = ( { y = 1520, h = 280, o, stroke = COLORS.redHot, children } ) => (
  <g opacity={o}>
    <rect x={60} y={y} width={960} height={h} rx={26} fill="rgba(7,11,20,0.92)" stroke={stroke} strokeWidth={6} />
    {children}
  </g>
);

/** Scene 3: magnitude, depth and date cards, popping in one after the other. */
const Cards: React.FC<{ t: number; t0: number; o: number }> = ( { t, t0, o } ) => {
  const cards = [
    { k: 'MAGNITUDE', v: 'M6.4', s: 'MWW · USGS REVIEWED', c: COLORS.redHot },
    { k: 'DEPTH', v: '10 KM', s: 'SHALLOW · USGS-ASSIGNED', c: COLORS.text },
    { k: 'OCT 29, 2026', v: '07:49', s: 'UTC', c: COLORS.text }
  ];
  return (
    <g opacity={o}>
      {cards.map( ( c, i ) => {
        const k = ease( clamp( ( t - t0 - i * 0.35 ) / 0.3 ) );
        const x = 60 + i * 330;
        return (
          <g key={c.k} opacity={k} transform={`translate(0 ${30 * ( 1 - k )})`}>
            <rect x={x} y={1530} width={300} height={260} rx={22} fill="rgba(7,11,20,0.92)" stroke={i === 0 ? COLORS.redHot : '#3A4558'} strokeWidth={i === 0 ? 6 : 3} />
            <Txt x={x + 150} y={1590} size={28} weight={800} spacing={2} color={COLORS.textSupport}>{c.k}</Txt>
            <Txt x={x + 150} y={1700} size={i === 2 ? 92 : 104} display weight={800} color={c.c}>{c.v}</Txt>
            <Txt x={x + 150} y={1756} size={21} weight={700} spacing={1} color={COLORS.textSupport}>{c.s}</Txt>
          </g>
        );
      } )}
    </g>
  );
};

/** Scene 5b: a map-view strike-slip schematic (two blocks sliding past each other); not to scale. */
const StrikeSlip: React.FC<{ t: number; t0: number; o: number }> = ( { t, t0, o } ) => {
  const s = 26 * ease( clamp( ( t - t0 - 0.3 ) / 1.2 ) );
  return (
    <Panel o={o}>
      <clipPath id="ssClip"><rect x={90} y={1550} width={460} height={220} rx={12} /></clipPath>
      <g clipPath="url(#ssClip)">
        <rect x={70 - s} y={1550} width={500} height={108} fill="#2B5C8A" />
        <rect x={70 + s} y={1662} width={500} height={108} fill="#8A5A2B" />
        <line x1={60} y1={1660} x2={580} y2={1660} stroke={COLORS.redHot} strokeWidth={6} />
        <path d={`M${400 - s} 1604 h-150`} stroke={COLORS.text} strokeWidth={8} markerEnd="url(#arrowHead)" />
        <path d={`M${240 + s} 1716 h150`} stroke={COLORS.text} strokeWidth={8} markerEnd="url(#arrowHead)" />
      </g>
      <Txt x={790} y={1620} size={46} display weight={800} color={COLORS.text}>SIDEWAYS SLIP</Txt>
      <Txt x={790} y={1672} size={30} weight={800} color={COLORS.redText}>STRIKE-SLIP FAULTING</Txt>
      <Txt x={790} y={1724} size={22} weight={700} color={COLORS.textSupport}>USGS MOMENT TENSOR</Txt>
      <Txt x={790} y={1758} size={20} weight={700} color={COLORS.textSupport}>MAP-VIEW SCHEMATIC · NOT TO SCALE</Txt>
    </Panel>
  );
};

const overlay = ( b: Beats, total: number ) => ( m: { x: number; y: number }, frame: number, tracked?: { x: number; y: number }[] ) => {
  const t = frame / FPS;
  const pts = tracked ?? [];
  const [ island, p2021, lChile, lEpr, lNazca, lAnt, lPac ] = pts;
  const dots = pts.slice( FIXED.length );
  const globe = clamp( ( t - imgHold( b ) ) / IMG_FADE );
  const fadeOut = 1 - clamp( ( t - ( total - 0.9 ) ) / 0.8 );
  const born = epiAt( b );
  const k = clamp( ( t - born ) / 0.45 );
  const ring = ( ( t - born ) % 1.6 ) / 1.6;
  // scene visibilities
  const islandO = Math.max( vis( t, imgHold( b ), b.w0.start + 0.4, 0.4 ), vis( t, b.e1.start + 1.2, total + 1, 0.5 ) );
  const line = vis( t, b.s0.start + 0.9, b.w0.start + 0.4, 0.4 ) * ( t > b.s1.start + 1.0 ? 0.45 : 1 );
  const draw = ease( clamp( ( t - ( b.s0.start + 0.9 ) ) / 1.5 ) );
  const header = vis( t, b.s0.start + 0.6, b.s1.start, 0.4 );
  const cards = vis( t, b.s1.start + 0.2, b.i0.start, 0.35 );
  const pager = vis( t, b.i0.start, b.i1.start, 0.3 );
  const tsunami = vis( t, b.i1.start, b.w0.start, 0.3 );
  const tecto = vis( t, b.w0.start + 0.6, b.e0.start - 0.2, 0.6 );
  const slip = vis( t, b.w1.start - 0.1, b.e0.start - 0.2, 0.35 );
  const plates = vis( t, b.w0.start - 0.1, b.w1.start - 0.1, 0.35 );
  const prior = vis( t, b.e0.start + 0.6, b.e1.start + 0.6, 0.4 );
  const close = vis( t, b.e1.start + 0.2, total + 1, 0.4 );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070B14" stopOpacity="0.9" /><stop offset="0.8" stopColor="#070B14" stopOpacity="0.7" /><stop offset="1" stopColor="#070B14" stopOpacity="0" /></linearGradient>
        <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={COLORS.text} /></marker>
      </defs>
      <rect width={1080} height={560} fill="url(#shade)" opacity={globe * fadeOut * 0.85} />
      {/* USGS M5+ seismicity since 1976: it traces the East Pacific Rise and the Chile Rise */}
      <g opacity={globe * Math.max( tecto, 0.55 * close ) * fadeOut}>
        {dots.map( ( d, i ) => {
          const mag = SEISMICITY[i][2];
          const on = clamp( ( t - ( b.w0.start + 0.4 + ( i % 17 ) * 0.05 ) ) / 0.4 );
          return d ? <circle key={i} cx={d.x} cy={d.y} r={mag >= 6 ? 6 : 3.6} fill={mag >= 6 ? '#FFB800' : '#F2A900'} fillOpacity={0.75 * ( t > b.e1.start ? 1 : on )} /> : null;
        } )}
      </g>
      <g opacity={globe * tecto * fadeOut}>
        {lChile ? <Halo x={lChile.x} y={lChile.y} size={40} display color="#FFB800" spacing={2}>CHILE RISE</Halo> : null}
        {lEpr ? <Halo x={lEpr.x} y={lEpr.y} size={30} display color="#FFB800" spacing={1} anchor="start">EAST PACIFIC RISE</Halo> : null}
        <g opacity={plates}>
          {lNazca ? <Halo x={lNazca.x} y={lNazca.y} size={36} weight={800} spacing={3}>NAZCA PLATE</Halo> : null}
          {lAnt ? <Halo x={lAnt.x} y={lAnt.y} size={36} weight={800} spacing={3}>ANTARCTIC PLATE</Halo> : null}
          {lPac ? <Halo x={lPac.x} y={lPac.y} size={30} weight={800} spacing={3} color={COLORS.textSupport}>PACIFIC PLATE</Halo> : null}
        </g>
        <Txt x={540} y={300} size={32} weight={800} spacing={3} color={COLORS.textSupport}>DOTS: USGS M5+ EARTHQUAKES SINCE 1976</Txt>
      </g>
      {/* Easter Island (Hanga Roa) */}
      {island ? (
        <g opacity={globe * islandO * fadeOut}>
          <circle cx={island.x} cy={island.y} r={9} fill="#FFFFFF" stroke="#070B14" strokeWidth={3} />
          <Halo x={island.x} y={island.y - 26} size={38} weight={800} spacing={2}>EASTER ISLAND</Halo>
        </g>
      ) : null}
      {/* distance line, drawn from the island to the epicenter */}
      {island ? ( () => {
        const x = island.x + ( m.x - island.x ) * draw, y = island.y + ( m.y - island.y ) * draw;
        return (
          <g opacity={globe * line * fadeOut}>
            <line x1={island.x} y1={island.y} x2={x} y2={y} stroke="#FFFFFF" strokeWidth={5} strokeDasharray="16 12" />
            <g opacity={clamp( ( draw - 0.6 ) / 0.3 )}>
              <Halo x={( island.x + m.x ) / 2 + 30} y={( island.y + m.y ) / 2 - 30} size={52} display weight={800} anchor="start">~1,500 KM</Halo>
            </g>
          </g>
        );
      } )() : null}
      {/* 20 km scale bar at the close-up (MapLibre 512 px tiles) */}
      {( () => { const w = 20000 / ( ( 78271.5 * Math.cos( EPI[1] * Math.PI / 180 ) ) / 2 ** camera( frame, b, total ).zoom ); return (
        <g opacity={globe * prior * fadeOut}>
          <path d={`M80 1290 v14 h${w} v-14`} fill="none" stroke={COLORS.textSupport} strokeWidth={4} />
          <Halo x={80 + w / 2} y={1285} size={28} color={COLORS.textSupport} weight={700}>20 KM</Halo>
        </g>
      ); } )()}
      {/* 2021 M6.7, 26 km away */}
      {p2021 ? (
        <g opacity={globe * prior * fadeOut}>
          <circle cx={p2021.x} cy={p2021.y} r={16} fill="none" stroke="#FFFFFF" strokeWidth={5} />
          <circle cx={p2021.x} cy={p2021.y} r={5} fill="#FFFFFF" />
          <Halo x={p2021.x} y={p2021.y - 34} size={44} display>M6.7 · FEB 2021</Halo>
        </g>
      ) : null}
      {/* the epicenter, projected by the map at the USGS coordinates */}
      <g opacity={globe * fadeOut}>
        {k > 0 ? (
          <g>
            <circle cx={m.x} cy={m.y} r={18 + 70 * ease( ring )} fill="none" stroke={COLORS.redHot} strokeWidth={5} opacity={0.85 * ( 1 - ring )} />
            <circle cx={m.x} cy={m.y} r={34 * ease( k )} fill={COLORS.redHot} opacity={0.22} />
            <circle cx={m.x} cy={m.y} r={15 * ( 0.6 + 0.4 * ease( k ) )} fill={COLORS.redHot} stroke="#FFD9D6" strokeWidth={3} />
            <g opacity={ease( k ) * ( 1 - tecto )}>
              <Halo x={m.x} y={m.y + ( prior > 0.5 ? 74 : -40 )} size={58} display color="#FF5A5F">M6.4</Halo>
              {prior > 0.05 ? <Halo x={m.x} y={m.y + 112} size={30} weight={800} opacity={prior}>OCT 29, 2026</Halo> : null}
            </g>
          </g>
        ) : null}
      </g>
      {/* scene 2 header */}
      <g opacity={globe * header * fadeOut}>
        <Txt x={540} y={300} size={40} display weight={800} spacing={4} color={COLORS.redText}>EPICENTER: OPEN OCEAN</Txt>
        <Txt x={540} y={356} size={32} weight={800} spacing={2} color={COLORS.textSupport}>SOUTHEAST OF EASTER ISLAND</Txt>
      </g>
      {/* scene 3: event cards */}
      <g opacity={globe * fadeOut}>
        <Cards t={t} t0={b.s1.start + 0.2} o={cards} />
      </g>
      {/* scene 4: PAGER, then tsunami and damage as reported */}
      <g opacity={globe * fadeOut}>
        <Panel o={pager} stroke={PAGER_COLORS.green}>
          <Txt x={110} y={1600} size={30} weight={800} spacing={3} anchor="start" color={COLORS.textSupport}>USGS PAGER ALERT</Txt>
          <rect x={110} y={1626} width={300} height={110} rx={18} fill={PAGER_COLORS.green} />
          <Txt x={260} y={1708} size={78} display weight={800} color="#05210E">GREEN</Txt>
          <Txt x={450} y={1660} size={34} weight={800} anchor="start" color={COLORS.text}>LOW LIKELIHOOD OF</Txt>
          <Txt x={450} y={1702} size={34} weight={800} anchor="start" color={COLORS.text}>CASUALTIES AND DAMAGE</Txt>
          <Txt x={450} y={1752} size={26} weight={700} anchor="start" color={COLORS.textSupport}>EST. POPULATION EXPOSED: 0</Txt>
        </Panel>
        <Panel o={tsunami} stroke="#3A4558">
          <Txt x={110} y={1630} size={30} weight={800} spacing={3} anchor="start" color={COLORS.textSupport}>TSUNAMI</Txt>
          <Txt x={380} y={1634} size={54} display weight={800} anchor="start" color={COLORS.text}>NO WARNINGS REPORTED</Txt>
          <line x1={110} y1={1662} x2={970} y2={1662} stroke="#3A4558" strokeWidth={2} />
          <Txt x={110} y={1716} size={30} weight={800} spacing={3} anchor="start" color={COLORS.textSupport}>DAMAGE</Txt>
          <Txt x={380} y={1720} size={54} display weight={800} anchor="start" color={COLORS.text}>NONE REPORTED</Txt>
          <Txt x={540} y={1770} size={21} weight={700} spacing={1} color={COLORS.textSupport}>PTWC: NO MESSAGE FOR THIS EVENT · AS OF OCT 29, 13:00 UTC</Txt>
        </Panel>
      </g>
      {/* scene 5b: strike-slip schematic */}
      <g opacity={globe * fadeOut}><StrikeSlip t={t} t0={b.w1.start} o={slip} /></g>
      {/* scene 6: the earlier quake, then the closing summary */}
      <g opacity={globe * fadeOut}>
        <Panel o={prior * ( 1 - close )}>
          <Txt x={540} y={1610} size={34} weight={800} spacing={3} color={COLORS.textSupport}>SAME AREA, USGS CATALOG</Txt>
          <Txt x={540} y={1690} size={62} display weight={800} color={COLORS.text}>M6.7 · FEB 3, 2021</Txt>
          <Txt x={540} y={1750} size={30} weight={800} color={COLORS.redText}>26 KM FROM THIS EPICENTER</Txt>
        </Panel>
        <Panel o={close}>
          <Txt x={540} y={1612} size={56} display weight={800} color={COLORS.redHot}>M6.4 · SE OF EASTER ISLAND</Txt>
          <Txt x={540} y={1672} size={32} weight={800} color={COLORS.text}>OCT 29, 2026 · ~1,500 KM FROM THE ISLAND</Txt>
          <Txt x={540} y={1722} size={28} weight={800} color={PAGER_COLORS.green}>PAGER GREEN</Txt>
          <Txt x={540} y={1764} size={26} weight={700} color={COLORS.textSupport}>NO TSUNAMI WARNINGS OR DAMAGE REPORTED</Txt>
        </Panel>
      </g>
      <Txt x={540} y={1850} size={24} weight={700} spacing={1} color={COLORS.textSupport} opacity={0.9 * globe * fadeOut}>{`USGS ${EVENT.id.toUpperCase()} · EPICENTER AT USGS COORDINATES`}</Txt>
      <Txt x={540} y={1890} size={22} weight={700} spacing={3} color={COLORS.redText} opacity={0.8 * globe * fadeOut}>NEXT HUGE QUAKE</Txt>
    </svg>
  );
};

/** Opening: the approved AI illustration with a slow push-in toward the coast, the headline, and the small AI watermark. */
const Opening: React.FC<{ t: number; b: Beats }> = ( { t, b } ) => {
  const hold = imgHold( b );
  const imgO = 1 - clamp( ( t - hold ) / IMG_FADE );
  if ( imgO <= 0 ) return null;
  const k = clamp( t / ( hold + IMG_FADE ) );
  const pop = ( t0: number ) => 0.8 + 0.2 * ease( clamp( ( t - t0 ) / 0.22 ) );
  const fade = ( t0: number ) => clamp( ( t - t0 ) / 0.18 );
  const line2 = b.h0.start + 0.35;
  return (
    <AbsoluteFill style={{ opacity: imgO }}>
      <AbsoluteFill style={{ overflow: 'hidden', background: '#05070d' }}>
        <Img src={staticFile( IMAGE_FILE )} style={{ width: 1080, height: 1920, objectFit: 'cover', transformOrigin: '80% 47%', transform: `translate(${-18 * ease( k )}px, ${-8 * ease( k )}px) scale(${1.02 + 0.13 * ease( k )})` }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,7,13,0.6) 0%, rgba(5,7,13,0.1) 40%, rgba(5,7,13,0) 70%, rgba(5,7,13,0.45) 100%)' }} />
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <g opacity={fade( 0 )}>
          <rect x={390} y={262} width={300} height={56} rx={10} fill={COLORS.redHot} />
          <Txt x={540} y={302} size={34} weight={800} spacing={5} color="#FFFFFF">BREAKING</Txt>
        </g>
        <g opacity={fade( 0.05 )} transform={`translate(540 520) scale(${pop( 0.05 )}) translate(-540 -520)`}>
          <Halo x={540} y={520} size={230} display color="#FF5A5F">M6.4</Halo>
        </g>
        <g opacity={fade( line2 )} transform={`translate(540 640) scale(${pop( line2 )}) translate(-540 -640)`}>
          <Halo x={540} y={640} size={96} display>NEAR EASTER ISLAND!</Halo>
        </g>
        <g opacity={fade( b.h1.start )} transform={`translate(540 740) scale(${pop( b.h1.start )}) translate(-540 -740)`}>
          <rect x={150} y={694} width={780} height={70} rx={12} fill="rgba(7,11,20,0.82)" stroke={COLORS.redHot} strokeWidth={4} />
          <Txt x={540} y={742} size={40} display weight={800} spacing={2} color={COLORS.text}>EPICENTER ~1,500 KM OFFSHORE</Txt>
        </g>
        {/* editorial convention (docs/DECISION_LOG.md): no prominent AI label over cinematic images; a small translucent watermark in a safe corner, with the full disclosure in metadata, description and credits */}
        <Txt x={72} y={236} size={20} weight={700} spacing={3} anchor="start" color={COLORS.text} opacity={0.5}>AI VISUALIZATION</Txt>
      </svg>
    </AbsoluteFill>
  );
};

const cues = ( b: Beats ): SfxCue[] => [
  { sfx: 'boom', at: 0, dur: 1.5, volume: 0.45 },
  { sfx: 'rumble', at: 0.1, dur: 3.6, volume: 0.26 },
  { sfx: 'whoosh', at: imgHold( b ) - 0.3, dur: 1.2, volume: 0.5 },
  { sfx: 'boom', at: epiAt( b ), dur: 1.5, volume: 0.42 },
  ...[ 0, 1, 2 ].map( ( i ): SfxCue => ( { sfx: 'tick', at: b.s1.start + 0.2 + i * 0.35, dur: 0.4, volume: 0.45 } ) ),
  { sfx: 'tick', at: b.i0.start, dur: 0.4, volume: 0.45 },
  { sfx: 'tick', at: b.i1.start, dur: 0.4, volume: 0.45 },
  { sfx: 'whoosh', at: b.w0.start + 0.1, dur: 1.2, volume: 0.35 },
  { sfx: 'whoosh', at: b.e0.start + 0.1, dur: 1.2, volume: 0.35 },
  { sfx: 'whoosh', at: b.e1.start + 0.1, dur: 1.2, volume: 0.3 }
];

export const EasterIslandM64: React.FC<EduShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( EASTER_ISLAND_M64, audio );
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap cameraAt={f => camera( f, b, total )} epicenter={EPI} tiles="local" style={() => localStyle()} trackPoints={TRACK} diagnostics={{ event: EVENT.id, tiles: 'local' }} background={COLORS.background} overlay={overlay( b, total )} />
      <Opening t={t} b={b} />
      <Captions t={t} captions={audio?.captions ?? placeholderCaptions( EASTER_ISLAND_M64.script )} />
      {audio ? <Layers audio={audio} cues={cues( b )} total={total} /> : null}
    </AbsoluteFill>
  );
};
