/**
 * "Why Does Vanuatu Keep Shaking? Another M6.0 Strikes!": a 30-40 s Short. It opens on one approved AI-generated establishing illustration
 * (vanuatu-coast-ai.png, labelled on screen), crossfades into the Natural Earth globe and plots the five M6+ events of the sequence at their USGS
 * coordinates, then explains the plate setting and ends on the annual rate. Reuses LiveMap, localStyle, the edu kit, EduShort Layers and Captions.
 * Nothing here is published or wired into the publisher.
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
import { Txt, clamp, prog, vis } from '../../src/edu/kit.js';
import { EVENTS, IMAGE_FILE, LARGEST, LATEST, VANUATU_SEQUENCE, dateLabel, timeLabel } from './script.js';

export { eduShortSchema };
const ease = ( x: number ) => x * x * ( 3 - 2 * x );
const IMG_HOLD = 3.0, IMG_FADE = 0.8;
const N = EVENTS.length;
const CL: [ number, number ] = [ EVENTS.reduce( ( s, e ) => s + e.lon, 0 ) / N, EVENTS.reduce( ( s, e ) => s + e.lat, 0 ) / N ];
const PAD = { top: 300, bottom: 520, left: 0, right: 0 };
/** The close-up centers slightly north of the cluster so the markers sit below the sequence strip and the Torres/Banks islands stay clear of it. */
const CLOSE: [ number, number ] = [ CL[0], CL[1] + 0.2 ];

/** When each marker drops, tied to the words that name it. */
const appearAt = ( b: Beats ) => [ b.s0.start + 0.3, b.s1.start + 0.1, b.s2.start + 1.5, b.s2.start + 3.0, b.s3.start + 1.8 ];

type Stop = { t: number; lon: number; lat: number; zoom: number; pitch?: number };
const stops = ( b: Beats, total: number ): Stop[] => [
  { t: 0, lon: 172, lat: -18, zoom: 2.3 },
  { t: IMG_HOLD, lon: 168.5, lat: -15, zoom: 3.4 },
  { t: b.s0.start - 0.1, lon: 166.3, lat: -14.3, zoom: 5.2, pitch: 22 },
  { t: b.s0.start + 0.6, lon: CLOSE[0], lat: CLOSE[1], zoom: 7.0, pitch: 12 },
  { t: b.s1.start, lon: CLOSE[0], lat: CLOSE[1], zoom: 8.1, pitch: 0 },
  { t: b.s2.start + 0.6, lon: CLOSE[0], lat: CLOSE[1], zoom: 8.2 },
  { t: b.w0.start - 0.3, lon: CLOSE[0] + 0.05, lat: CLOSE[1], zoom: 8.3 },
  { t: b.w0.start + 1.6, lon: 166.6, lat: -15, zoom: 4.8 },
  { t: b.w1.end + 0.2, lon: 166.6, lat: -15, zoom: 4.9 },
  { t: b.e0.start + 0.8, lon: CLOSE[0], lat: CLOSE[1], zoom: 8.2 },
  { t: total, lon: CLOSE[0], lat: CLOSE[1], zoom: 8.3 }
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

const radius = ( mag: number ) => ( mag >= 6.9 ? 13 : mag >= 6.3 ? 10 : 8 );
/** Text with a dark halo so it reads on both the sunset image and the dark globe. */
const Halo: React.FC<{ x: number; y: number; size: number; children: React.ReactNode; color?: string; anchor?: 'start' | 'middle' | 'end'; opacity?: number; display?: boolean; weight?: number; spacing?: number }> = ( { x, y, size, children, color = COLORS.text, anchor = 'middle', opacity = 1, display = false, weight = 800, spacing = 0 } ) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={display ? FONT.display : FONT.ui} fontWeight={weight} fontSize={size} letterSpacing={spacing} fill={color} stroke="#070B14" strokeWidth={size * 0.16} strokeLinejoin="round" paintOrder="stroke" opacity={opacity} style={display ? { textTransform: 'uppercase' } : undefined}>{children}</text>
);

const Plates: React.FC<{ o: number }> = ( { o } ) => (
  <g opacity={o}>
    <rect x={60} y={1540} width={960} height={250} rx={26} fill="rgba(7,11,20,0.9)" stroke={COLORS.redHot} strokeWidth={6} />
    {/* schematic cross-section: the Australian plate dives beneath the Pacific plate; not to scale */}
    <path d="M110 1668 H440 L700 1746" fill="none" stroke="#2B5C8A" strokeWidth={34} strokeLinejoin="round" />
    <path d="M430 1588 H960 V1750 H735 L440 1650 Z" fill="#8A5A2B" />
    <path d="M150 1625 H290" stroke={COLORS.text} strokeWidth={8} markerEnd="url(#arrowHead)" />
    <Txt x={230} y={1590} size={26} weight={800} spacing={1} color={COLORS.text}>AUSTRALIAN PLATE</Txt>
    <Txt x={760} y={1630} size={26} weight={800} spacing={1} color={COLORS.text}>PACIFIC PLATE</Txt>
    <Txt x={540} y={1776} size={24} weight={700} spacing={1} color={COLORS.textSupport}>SCHEMATIC CROSS-SECTION · NOT TO SCALE</Txt>
  </g>
);

const overlay = ( b: Beats, total: number ) => ( _m: unknown, frame: number, tracked?: { x: number; y: number }[] ) => {
  const t = frame / FPS;
  const pts = tracked ?? [];
  const born = appearAt( b );
  const shown = born.filter( x => t >= x ).length;
  const cur = Math.max( 0, shown - 1 );
  const zoom = camera( frame, b, total ).zoom;
  const small = zoom < 6.5;
  const fadeOut = 1 - clamp( ( t - ( total - 1.4 ) ) / 1.2 );
  const globe = clamp( ( t - IMG_HOLD ) / IMG_FADE );
  const seq = vis( t, b.h1.start + 0.9, b.w0.start - 0.2, 0.5 );
  const strip = Math.max( seq, vis( t, b.e0.start - 0.3, total, 0.5 ) * 0.9 );
  const plates = vis( t, b.w0.start - 0.2, b.w1.end + 0.3, 0.5 );
  const stats = vis( t, b.e0.start - 0.1, total, 0.5 );
  const card = vis( t, born[0], b.w0.start - 0.2, 0.4 );
  const e = EVENTS[cur];
  const xs = [ 150, 345, 540, 735, 930 ];
  const labelAt: { dx: number; dy: number; a: 'start' | 'middle' | 'end' }[] = [ { dx: 0, dy: 46, a: 'middle' }, { dx: 20, dy: -16, a: 'start' }, { dx: -24, dy: 38, a: 'end' }, { dx: 24, dy: 10, a: 'start' }, { dx: -22, dy: 12, a: 'end' } ];
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070B14" stopOpacity="0.9" /><stop offset="0.8" stopColor="#070B14" stopOpacity="0.75" /><stop offset="1" stopColor="#070B14" stopOpacity="0" /></linearGradient>
        <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={COLORS.text} /></marker>
      </defs>
      <rect width={1080} height={640} fill="url(#shade)" opacity={globe * Math.max( strip, plates ) * 0.9} />
      {/* scale bar (20 km at the map center) once the view is close enough to compare distances */}
      {!small ? ( () => { const w = 20000 / ( ( 78271.5 * Math.cos( CL[1] * Math.PI / 180 ) ) / 2 ** zoom ); return (
        <g opacity={globe * fadeOut * Math.max( seq, stats )}>
          <path d={`M80 1290 v14 h${w} v-14`} fill="none" stroke={COLORS.textSupport} strokeWidth={4} />
          <Halo x={80 + w / 2} y={1285} size={28} color={COLORS.textSupport} weight={700}>20 KM</Halo>
        </g>
      ); } )() : null}
      {/* epicenters, projected by the map at the USGS coordinates */}
      <g opacity={globe * fadeOut}>
        {EVENTS.map( ( ev, i ) => {
          const p = pts[i];
          const k = clamp( ( t - born[i] ) / 0.45 );
          if ( !p || k <= 0 ) return null;
          const r = radius( ev.mag ) * ( small ? 0.55 : 1 ) * ( 0.6 + 0.4 * ease( k ) );
          const ring = clamp( ( t - born[i] ) / 1.3 );
          const hot = i === cur && t < b.w0.start - 0.2;
          return (
            <g key={ev.id}>
              {ring < 1 ? <circle cx={p.x} cy={p.y} r={r + 46 * ease( ring )} fill="none" stroke="#FF3B30" strokeWidth={4} opacity={0.8 * ( 1 - ring )} /> : null}
              <circle cx={p.x} cy={p.y} r={r * 1.8} fill="#FF3B30" opacity={0.2 * ease( k )} />
              <circle cx={p.x} cy={p.y} r={r} fill="#FF3B30" fillOpacity={0.95} stroke="#FFD9D6" strokeWidth={ev === LARGEST ? 3 : 1.5} />
              {hot || ev === LARGEST ? <circle cx={p.x} cy={p.y} r={r + 9} fill="none" stroke="#FFFFFF" strokeWidth={3} opacity={hot ? 0.95 : 0.6} /> : null}
              {!small ? (
                <g opacity={ease( k ) * ( 1 - plates )}>
                  <Halo x={p.x + labelAt[i].dx} y={p.y + labelAt[i].dy} size={ev === LARGEST ? 44 : 36} anchor={labelAt[i].a}>{`M${ev.mag.toFixed( 1 )}`}</Halo>
                  {ev === LARGEST ? <Halo x={p.x + labelAt[i].dx} y={p.y + labelAt[i].dy + 36} size={26} anchor={labelAt[i].a} color={COLORS.textSupport} spacing={2}>LARGEST</Halo> : null}
                  {ev === LATEST ? <Halo x={p.x + labelAt[i].dx} y={p.y + labelAt[i].dy - 38} size={26} anchor={labelAt[i].a} color={COLORS.redText} spacing={2}>LATEST</Halo> : null}
                </g>
              ) : null}
            </g>
          );
        } )}
      </g>
      {/* sequence strip: date and magnitude of each event, lit as it appears */}
      <g opacity={globe * strip * fadeOut}>
        <Txt x={540} y={285} size={36} display weight={800} spacing={4} color={COLORS.redText}>{stats > 0.5 || shown === 0 ? 'VANUATU · M6+ EARTHQUAKES' : `M6+ EARTHQUAKE ${cur + 1} OF ${N}`}</Txt>
        <line x1={xs[0]} y1={380} x2={xs[N - 1]} y2={380} stroke="#3A4558" strokeWidth={4} />
        {EVENTS.map( ( ev, i ) => {
          const on = stats > 0.5 ? 1 : prog( t, born[i], 0.4 );
          return (
            <g key={ev.id}>
              <circle cx={xs[i]} cy={380} r={ev === LARGEST ? 17 : 12} fill={on > 0.5 ? '#FF3B30' : '#1B2535'} stroke={i === cur && stats < 0.5 ? '#FFFFFF' : '#3A4558'} strokeWidth={i === cur && stats < 0.5 ? 4 : 2} />
              <Txt x={xs[i]} y={438} size={30} weight={800} color={on > 0.5 ? COLORS.text : COLORS.textSupport} opacity={0.35 + 0.65 * on}>{dateLabel( ev )}</Txt>
              <Txt x={xs[i]} y={492} size={ev === LARGEST ? 50 : 42} display weight={800} color={COLORS.redHot} opacity={on}>{`M${ev.mag.toFixed( 1 )}`}</Txt>
            </g>
          );
        } )}
      </g>
      {/* plate setting */}
      <g opacity={globe * fadeOut}><Plates o={plates} /></g>
      {/* current event card, then the rate */}
      <g opacity={globe * card * fadeOut}>
        <rect x={60} y={1540} width={960} height={250} rx={26} fill="rgba(7,11,20,0.9)" stroke={COLORS.redHot} strokeWidth={6} />
        <Txt x={225} y={1706} size={104} display weight={800} color={COLORS.redHot}>{`M${e.mag.toFixed( 1 )}`}</Txt>
        <Txt x={680} y={1630} size={44} display weight={800} color={COLORS.text}>{`${dateLabel( e )}, 2026 · ${timeLabel( e )}`}</Txt>
        <Txt x={680} y={1690} size={28} weight={700} color={COLORS.textSupport}>{e.place.toUpperCase()}</Txt>
        <Txt x={680} y={1742} size={26} weight={700} color={COLORS.textSupport}>{`USGS ${e.id.toUpperCase()}${e.magType === 'mb' ? ' · MB MAGNITUDE' : ''}`}</Txt>
      </g>
      <g opacity={globe * stats * fadeOut}>
        <rect x={60} y={1520} width={960} height={290} rx={26} fill="rgba(7,11,20,0.92)" stroke={COLORS.redHot} strokeWidth={6} />
        <Txt x={300} y={1690} size={150} display weight={800} color={COLORS.redHot}>{String( N )}</Txt>
        <Txt x={680} y={1640} size={46} display weight={800} color={COLORS.text}>M6+ EARTHQUAKES</Txt>
        <Txt x={680} y={1700} size={46} display weight={800} color={COLORS.redText}>IN 9 DAYS · OCT 19–28</Txt>
        <Txt x={540} y={1784} size={24} weight={700} color={COLORS.textSupport}>USGS CATALOG · WITHIN 100 KM OF THE OCT 24 EPICENTER</Txt>
      </g>
      <Txt x={540} y={1850} size={26} weight={700} spacing={1} color={COLORS.textSupport} opacity={0.9 * globe * fadeOut}>EPICENTERS PLOTTED AT USGS COORDINATES · NOT A LIVE FEED</Txt>
      <Txt x={540} y={1890} size={22} weight={700} spacing={3} color={COLORS.redText} opacity={0.8 * globe * fadeOut}>NEXT HUGE QUAKE</Txt>
    </svg>
  );
};

/** Opening: the approved AI illustration with a slow push-in toward the coast and mountains, hook text and the AI label. */
const Opening: React.FC<{ t: number; b: Beats }> = ( { t, b } ) => {
  const imgO = 1 - clamp( ( t - IMG_HOLD ) / IMG_FADE );
  const textO = 1 - clamp( ( t - ( IMG_HOLD + 0.5 ) ) / 0.5 );
  if ( imgO <= 0 && textO <= 0 ) return null;
  const k = clamp( t / ( IMG_HOLD + IMG_FADE ) );
  const h0 = b.h0;
  const pop = ( t0: number ) => ( 0.8 + 0.2 * ease( clamp( ( t - t0 ) / 0.25 ) ) );
  const line2 = h0.start + ( h0.end - h0.start ) * 0.68;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: imgO, overflow: 'hidden', background: '#05070d' }}>
        <Img src={staticFile( IMAGE_FILE )} style={{ width: 1080, height: 1920, objectFit: 'cover', transformOrigin: '72% 28%', transform: `translate(${-20 * ease( k )}px, ${10 * ease( k )}px) scale(${1.03 + 0.14 * ease( k )})` }} />
        <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,7,13,0.55) 0%, rgba(5,7,13,0) 38%, rgba(5,7,13,0) 72%, rgba(5,7,13,0.5) 100%)' }} />
      </AbsoluteFill>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <g opacity={textO}>
          <g opacity={clamp( ( t - h0.start ) / 0.2 )} transform={`translate(540 380) scale(${pop( h0.start )}) translate(-540 -380)`}>
            <Halo x={540} y={380} size={124} display>5 EARTHQUAKES</Halo>
          </g>
          <g opacity={clamp( ( t - line2 ) / 0.2 )} transform={`translate(540 510) scale(${pop( line2 )}) translate(-540 -510)`}>
            <Halo x={540} y={510} size={124} display color="#FF5A5F">IN 9 DAYS</Halo>
          </g>
          <Halo x={540} y={620} size={56} display color={COLORS.text} opacity={clamp( ( t - b.h1.start ) / 0.25 )} weight={700} spacing={3}>VANUATU IS STILL SHAKING</Halo>
        </g>
        {/* editorial convention (docs/DECISION_LOG.md): no prominent AI label over cinematic images; a small translucent watermark in a safe corner, with the full disclosure in metadata, description and credits */}
        <Txt x={72} y={236} size={20} weight={700} spacing={3} anchor="start" color={COLORS.text} opacity={0.5 * imgO}>AI VISUALIZATION</Txt>
      </svg>
    </AbsoluteFill>
  );
};

const cues = ( b: Beats ): SfxCue[] => [
  { sfx: 'rumble', at: 0, dur: 3.2, volume: 0.28 },
  { sfx: 'whoosh', at: IMG_HOLD - 0.35, dur: 1.2, volume: 0.5 },
  ...appearAt( b ).map( ( at, i ): SfxCue => ( { sfx: EVENTS[i].mag >= 6.9 ? 'boom' : 'tick', at, dur: EVENTS[i].mag >= 6.9 ? 1.5 : 0.4, volume: EVENTS[i].mag >= 6.9 ? 0.5 : 0.5 } ) ),
  { sfx: 'whoosh', at: b.w0.start + 0.2, dur: 1.2, volume: 0.35 },
  { sfx: 'whoosh', at: b.e0.start - 0.2, dur: 1.2, volume: 0.35 }
];

export const VanuatuSequence: React.FC<EduShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( VANUATU_SEQUENCE, audio );
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap cameraAt={f => camera( f, b, total )} epicenter={[ LATEST.lon, LATEST.lat ]} tiles="local" style={() => localStyle()} trackPoints={EVENTS.map( e => [ e.lon, e.lat ] as [ number, number ] )} diagnostics={{ event: 'vanuatu-m60-us7000ttlm', tiles: 'local' }} background={COLORS.background} overlay={overlay( b, total )} />
      <Opening t={t} b={b} />
      <Captions t={t} captions={audio?.captions ?? placeholderCaptions( VANUATU_SEQUENCE.script )} />
      {audio ? <Layers audio={audio} cues={cues( b )} total={total} /> : null}
    </AbsoluteFill>
  );
};
