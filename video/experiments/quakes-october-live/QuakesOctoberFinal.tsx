/** FINAL landscape (1920×1080) loop of "Earthquakes in October 2026": every USGS M5.0+ event of the snapshot on the Next Huge Quake globe.
 * Scenes: title (also the loop frame) -> day-by-day replay -> regional tour -> strongest -> deep events -> magnitude summary -> title.
 * The first and last frames are the same title view with every dot shown; the music crossfades into its own continuation so the seam is silent of clicks.
 * Adapted from QuakesOctober.tsx (vertical, Oct 1-25). */
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS, FONT } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { LiveMap } from '../../src/map/LiveMap.js';
import type { MapCamera } from '../../src/map/LiveMap.js';
import { localStyle } from '../../src/spike/styles.js';
import { eduShortSchema } from '../../src/edu/EduShort.js';
import type { EduShortProps } from '../../src/edu/EduShort.js';
import { beatsFor, placeholderCaptions } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { Txt, clamp, vis } from '../../src/edu/kit.js';
import { BINS, COVERAGE, COVERAGE_SHORT, DEEP, DEEP_KM, DEEP_LARGEST, EVENTS, FEATURED, LARGEST, M6, MAG_LABEL, OTHER, QUAKES_OCTOBER_FINAL, RETRIEVED_LABEL, SPAN_MS, STRONGEST, TOTAL, WINDOW, dateLabel } from './script-final.js';

export { eduShortSchema };
export const W = 1920, H = 1080;
const FPS = 30;
/** Music crossfade into its own continuation at the loop seam (seconds). */
const XFADE = 3;
const ease = ( x: number ) => x * x * ( 3 - 2 * x );
const T0 = Date.parse( WINDOW.start );
const DAY_MS = 86_400_000;
const SPEC = QUAKES_OCTOBER_FINAL.script;
const PANEL_X = 84;

type Stop = { t: number; lon: number; lat: number; zoom: number; left: number; lin?: boolean };
/** Title view: Pacific-centred globe drawn right of the title column. */
const HOME = { lon: 165, lat: 6, zoom: 2.45, left: 620 };
const DRIFT = 0.9;
const toRad = Math.PI / 180;
/** Angular distance in degrees between two lon/lat points. */
const arc = ( lon1: number, lat1: number, lon2: number, lat2: number ) => Math.acos( clamp( Math.sin( lat1 * toRad ) * Math.sin( lat2 * toRad ) + Math.cos( lat1 * toRad ) * Math.cos( lat2 * toRad ) * Math.cos( ( lon1 - lon2 ) * toRad ), -1, 1 ) ) / toRad;
/** Spherical mean of points (handles the antimeridian). */
const centroid = ( pts: { lon: number; lat: number }[] ) => {
  let x = 0, y = 0, z = 0;
  pts.forEach( p => { x += Math.cos( p.lat * toRad ) * Math.cos( p.lon * toRad ); y += Math.cos( p.lat * toRad ) * Math.sin( p.lon * toRad ); z += Math.sin( p.lat * toRad ); } );
  return { lon: Math.atan2( y, x ) / toRad, lat: Math.atan2( z, Math.hypot( x, y ) ) / toRad };
};
const DEEP_VIEW = centroid( DEEP );

/** Scene times, all derived from the narration beats. */
export const scenes = ( b: Beats, total: number ) => {
  const strong = STRONGEST.map( ( _, i ) => b[`c${i}`] );
  return {
    replay: { start: b.b0.start - 0.2, end: b.r0.start - 2.2 },
    regions: FEATURED.map( ( _, i ) => b[`r${i}`] ),
    strong,
    deep: b.deep,
    summary: { start: b.s0.start - 0.3, end: Math.min( b.s0.end + 2.0, total - 2.6 ) },
    heroBack: Math.min( b.s0.end + 2.0, total - 2.6 )
  };
};

const stops = ( b: Beats, total: number ): Stop[] => {
  const s = scenes( b, total );
  // the title view drifts east at DRIFT °/s on both sides of the seam, so the loop point is in motion, never a held frame
  const out: Stop[] = [ { t: 0, ...HOME }, { t: s.replay.start - 0.4, ...HOME, lon: HOME.lon + DRIFT * ( s.replay.start - 0.4 ), lin: true }, { t: s.replay.end, lon: -40, lat: 8, zoom: 2.45, left: 620, lin: true } ];
  FEATURED.forEach( ( r, i ) => {
    const beat = s.regions[i];
    const arrive = Math.min( beat.start - 0.1, out[out.length - 1].t + 2.4 );
    out.push( { t: Math.max( arrive, out[out.length - 1].t + 1.2 ), lon: r.box.center[0], lat: r.box.center[1], zoom: r.box.zoom + 0.15, left: 620 } );
    const next = i + 1 < FEATURED.length ? s.regions[i + 1].start - 1.9 : b.rest.start - 1.6;
    out.push( { t: next, lon: r.box.center[0] + 1.5, lat: r.box.center[1], zoom: r.box.zoom + 0.25, left: 620 } );
  } );
  out.push( { t: b.rest.start + 0.4, lon: 175, lat: 8, zoom: 2.3, left: 620 } );
  out.push( { t: b.c0.start - 1.9, lon: 230, lat: 8, zoom: 2.3, left: 620, lin: true } );
  STRONGEST.forEach( ( e, i ) => {
    const c = s.strong[i];
    out.push( { t: c.start - 0.1, lon: e.lon, lat: e.lat, zoom: 4.3, left: 620 } );
    const next = i + 1 < STRONGEST.length ? s.strong[i + 1].start - 2.0 : b.deep.start - 2.0;
    out.push( { t: next, lon: e.lon + 2.5, lat: e.lat, zoom: 4.45, left: 620 } );
  } );
  out.push( { t: b.deep.start - 0.1, lon: DEEP_VIEW.lon, lat: DEEP_VIEW.lat, zoom: 2.75, left: 620 } );
  out.push( { t: b.s0.start - 1.8, lon: DEEP_VIEW.lon + 4, lat: DEEP_VIEW.lat, zoom: 2.8, left: 620 } );
  const settle = b.s0.start + 0.2;
  out.push( { t: settle, ...HOME, lon: HOME.lon - DRIFT * ( total - settle ) } );
  out.push( { t: total, ...HOME, lin: true } );
  return out;
};

export const camera = ( frame: number, b: Beats, total: number ): MapCamera => {
  const t = frame / FPS;
  const s = stops( b, total );
  let i = s.findIndex( x => x.t > t );
  if ( i < 0 ) i = s.length - 1;
  if ( i === 0 ) i = 1;
  const a = s[i - 1], z = s[i];
  const raw = clamp( ( t - a.t ) / Math.max( 0.01, z.t - a.t ) );
  const k = z.lin ? raw : ease( raw );
  // linear segments rotate east (the long way if needed); eased ones take the short way
  const dl = z.lin ? ( ( z.lon - a.lon + 720 ) % 360 ) : ( ( ( z.lon - a.lon + 540 ) % 360 ) - 180 );
  const lon = ( ( a.lon + dl * k + 540 ) % 360 ) - 180;
  // long flights pull back mid-way, like a flyTo, so the globe never smears past at high zoom
  const dist = arc( a.lon, a.lat, z.lon, z.lat );
  const dip = z.lin ? 0 : Math.min( 1.6, Math.max( 0, ( dist - 15 ) / 55 ) ) * Math.sin( Math.PI * k );
  return { center: [ lon, a.lat + ( z.lat - a.lat ) * k ], zoom: a.zoom + ( z.zoom - a.zoom ) * k - dip, bearing: 0, pitch: 0, padding: { top: 0, bottom: 60, left: a.left + ( z.left - a.left ) * k, right: 0 } };
};

const style = () => localStyle();
const radius = ( mag: number ) => ( mag >= 7 ? 15 : mag >= 6 ? 10.5 : mag >= 5.5 ? 7.5 : 5.5 );
const upDate = ( ms: number ) => dateLabel( new Date( ms ).toISOString() );
const fmtDepth = ( d: number ) => `${Math.round( d )} KM DEEP`;

const Card: React.FC<{ y: number; h: number; opacity: number; children: React.ReactNode }> = ( { y, h, opacity, children } ) => (
  <g opacity={opacity}>
    <rect x={PANEL_X - 24} y={y} width={640} height={h} rx={22} fill="rgba(7,11,20,0.86)" stroke={COLORS.rule} strokeWidth={2} />
    <rect x={PANEL_X - 24} y={y} width={8} height={h} rx={4} fill={COLORS.redHot} />
    {children}
  </g>
);

const overlay = ( b: Beats, total: number ) => ( _m: unknown, frame: number, tracked?: { x: number; y: number }[] ) => {
  const t = frame / FPS;
  const s = scenes( b, total );
  const cam = camera( frame, b, total );
  const { start: r0, end: r1 } = s.replay;
  const frac = clamp( ( t - r0 ) / ( r1 - r0 ) );
  const appears = ( e: typeof EVENTS[number] ) => r0 + ( ( Date.parse( e.time ) - T0 ) / SPAN_MS ) * ( r1 - r0 );
  const shown = EVENTS.filter( e => t >= appears( e ) ).length;
  const simMs = Math.min( T0 + frac * SPAN_MS, Date.parse( WINDOW.endExclusive ) - 1 );

  const heroIn = vis( t, -1, r0 - 0.5, 0.5 );
  const heroOut = clamp( ( t - s.heroBack ) / 1.0 );
  const hero = Math.max( heroIn, heroOut );
  const replay = vis( t, r0 + 0.2, r1 + 0.8, 0.5 );
  const regions = vis( t, s.regions[0].start - 0.5, b.plate.end + 0.6, 0.5 );
  const strong = vis( t, s.strong[0].start - 0.5, s.strong[s.strong.length - 1].end + 0.8, 0.4 );
  const deep = vis( t, b.deep.start - 0.4, b.deep.end + 1.0, 0.4 );
  const summary = vis( t, s.summary.start, s.summary.end, 0.5 );
  const header = 1 - hero;
  // dots: the title view shows the whole month; the replay clears them and rebuilds day by day
  const clear = clamp( ( t - ( r0 - 0.9 ) ) / 0.7 );
  const dotAlpha = ( e: typeof EVENTS[number] ) => ( t < r0 ? 1 - clear : clamp( ( t - appears( e ) ) / 0.45 ) );
  const hi = STRONGEST.findIndex( ( _, i ) => t >= s.strong[i].start - 0.2 && t <= ( i + 1 < STRONGEST.length ? s.strong[i + 1].start - 1.6 : b.deep.start - 1.6 ) );
  const deepRing = vis( t, b.deep.start - 0.2, b.deep.end + 0.9, 0.4 );
  const zoomK = clamp( ( cam.zoom - 2.5 ) / 1.8 );
  const activeRegion = s.regions.findIndex( ( r, i ) => t >= r.start - 1.2 && t < ( i + 1 < s.regions.length ? s.regions[i + 1].start - 1.2 : b.rest.start - 1.2 ) );
  const pts = tracked ?? [];
  const rows = [ ...FEATURED.map( r => ( { name: r.name.toUpperCase(), count: r.count } ) ), { name: 'ALL OTHER AREAS', count: OTHER } ];
  const maxRow = Math.max( ...rows.map( r => r.count ) );
  const maxBin = Math.max( ...BINS.map( x => x.n ) );

  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#070B14" stopOpacity="0.92" /><stop offset="0.36" stopColor="#070B14" stopOpacity="0.55" /><stop offset="0.5" stopColor="#070B14" stopOpacity="0" /></linearGradient>
        <linearGradient id="foot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070B14" stopOpacity="0" /><stop offset="1" stopColor="#070B14" stopOpacity="0.85" /></linearGradient>
      </defs>
      {/* markers: one per earthquake, projected by the map; hidden on the far side of the globe */}
      <g>
        {EVENTS.map( ( e, i ) => {
          const p = pts[i];
          if ( !p ) return null;
          const a = dotAlpha( e );
          if ( a <= 0 ) return null;
          const far = clamp( ( 84 - arc( cam.center[0], cam.center[1], e.lon, e.lat ) ) / 10 );
          if ( far <= 0 ) return null;
          const r = radius( e.mag ) * ( 1 + 0.35 * zoomK ) * ( 0.6 + 0.4 * ease( a ) );
          return (
            <g key={e.id} opacity={far * ease( a )}>
              <circle cx={p.x} cy={p.y} r={r * 1.9} fill="#FF3B30" opacity={0.18} />
              <circle cx={p.x} cy={p.y} r={r} fill="#FF3B30" fillOpacity={0.95} stroke="#FFD9D6" strokeWidth={e.mag >= 7 ? 2 : 1} />
              {e.mag >= 7 ? <circle cx={p.x} cy={p.y} r={r + 8} fill="none" stroke="#FFD9D6" strokeWidth={2.5} opacity={0.85} /> : null}
            </g>
          );
        } )}
        {hi >= 0 ? ( () => {
          const e = STRONGEST[hi]; const p = pts[EVENTS.indexOf( e )];
          const o = vis( t, s.strong[hi].start - 0.2, ( hi + 1 < STRONGEST.length ? s.strong[hi + 1].start : b.deep.start ) - 1.6, 0.3 );
          return p ? <circle cx={p.x} cy={p.y} r={radius( e.mag ) * 1.35 + 20} fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={0.9 * o} /> : null;
        } )() : null}
        {deepRing > 0.01 ? DEEP.map( e => {
          const p = pts[EVENTS.indexOf( e )];
          const far = clamp( ( 84 - arc( cam.center[0], cam.center[1], e.lon, e.lat ) ) / 10 );
          return p && far > 0 ? <circle key={e.id} cx={p.x} cy={p.y} r={radius( e.mag ) + 13} fill="none" stroke="#FFFFFF" strokeWidth={e === DEEP_LARGEST ? 4 : 2.5} opacity={0.9 * deepRing * far} /> : null;
        } ) : null}
      </g>
      <rect width={W} height={H} fill="url(#side)" />
      <rect y={H - 170} width={W} height={170} fill="url(#foot)" />

      {/* persistent header (hidden while the big title is up) */}
      <g opacity={header}>
        <Txt x={PANEL_X} y={92} size={46} display weight={800} anchor="start" color={COLORS.text}>EARTHQUAKES IN OCTOBER 2026</Txt>
        <Txt x={PANEL_X} y={132} size={24} weight={700} anchor="start" spacing={2} color={COLORS.redText}>{`${TOTAL} EARTHQUAKES · WORLDWIDE · ${MAG_LABEL}`}</Txt>
      </g>

      {/* title / loop frame */}
      <g opacity={hero}>
        <Txt x={PANEL_X} y={250} size={30} weight={800} anchor="start" spacing={6} color={COLORS.redText}>WORLDWIDE · USGS RECORD</Txt>
        <Txt x={PANEL_X} y={345} size={104} display weight={800} anchor="start" color={COLORS.text}>EARTHQUAKES IN</Txt>
        <Txt x={PANEL_X} y={445} size={104} display weight={800} anchor="start" color={COLORS.text}>OCTOBER 2026</Txt>
        <Txt x={PANEL_X} y={640} size={210} display weight={800} anchor="start" color={COLORS.redHot}>{String( TOTAL )}</Txt>
        <Txt x={PANEL_X} y={712} size={52} display weight={800} anchor="start" color={COLORS.text}>EARTHQUAKES</Txt>
        <Txt x={PANEL_X} y={772} size={30} weight={700} anchor="start" color={COLORS.textSupport}>{MAG_LABEL}</Txt>
        <Txt x={PANEL_X} y={818} size={30} weight={700} anchor="start" spacing={2} color={COLORS.redText}>{COVERAGE}</Txt>
      </g>

      {/* day-by-day replay */}
      <g opacity={replay}>
        <Txt x={PANEL_X} y={300} size={30} weight={800} anchor="start" spacing={5} color={COLORS.textSupport}>DAY BY DAY</Txt>
        <Txt x={PANEL_X} y={420} size={128} display weight={800} anchor="start" color={COLORS.text}>{upDate( simMs ).replace( ', 2026', '' )}</Txt>
        <Txt x={PANEL_X} y={520} size={84} display weight={800} anchor="start" color={COLORS.redHot}>{String( shown )}</Txt>
        <Txt x={PANEL_X + 22 + String( shown ).length * 39} y={520} size={36} display weight={800} anchor="start" color={COLORS.text}>EARTHQUAKES SO FAR</Txt>
        <rect x={PANEL_X} y={566} width={520} height={10} rx={5} fill={COLORS.rule} />
        <rect x={PANEL_X} y={566} width={520 * frac} height={10} rx={5} fill={COLORS.redHot} />
        <Txt x={PANEL_X} y={612} size={24} weight={700} anchor="start" color={COLORS.textSupport}>OCT 1</Txt>
        <Txt x={PANEL_X + 520} y={612} size={24} weight={700} anchor="end" color={COLORS.textSupport}>{WINDOW.full ? 'OCT 31' : upDate( Date.parse( WINDOW.endExclusive ) - 1 ).replace( ', 2026', '' )}</Txt>
      </g>

      {/* regional tour: ranked list, the current area highlighted */}
      <Card y={250} h={110 + rows.length * 74} opacity={regions}>
        <Txt x={PANEL_X} y={310} size={40} display weight={800} anchor="start" color={COLORS.text}>MOST ACTIVE AREAS</Txt>
        {rows.map( ( r, i ) => {
          const on = i === activeRegion || ( i === rows.length - 1 && t >= b.rest.start - 1.2 && t < b.plate.end + 0.6 );
          const y = 380 + i * 74;
          return (
            <g key={r.name} opacity={on ? 1 : 0.55}>
              <Txt x={PANEL_X} y={y} size={26} weight={800} anchor="start" spacing={1} color={on ? COLORS.text : COLORS.textSupport}>{r.name}</Txt>
              <rect x={PANEL_X} y={y + 12} width={440 * ( r.count / maxRow )} height={16} rx={8} fill={on ? COLORS.redHot : COLORS.textSecondary} />
              <Txt x={PANEL_X + 560} y={y + 26} size={40} display weight={800} anchor="end" color={on ? COLORS.redHot : COLORS.textSupport}>{String( r.count )}</Txt>
            </g>
          );
        } )}
      </Card>

      {/* strongest */}
      {STRONGEST.map( ( e, i ) => {
        const o = strong * vis( t, s.strong[i].start - 0.3, ( i + 1 < STRONGEST.length ? s.strong[i + 1].start : b.deep.start ) - 1.4, 0.35 );
        const tied = STRONGEST.filter( x => x.mag === e.mag ).length > 1;
        const rank = STRONGEST.findIndex( x => x.mag === e.mag ) + 1;
        return o > 0.01 ? (
          <Card key={e.id} y={250} h={420} opacity={o}>
            <Txt x={PANEL_X} y={310} size={30} weight={800} anchor="start" spacing={4} color={COLORS.textSupport}>{rank === 1 ? 'STRONGEST OF THE MONTH' : `#${rank} STRONGEST${tied ? ' (TIED)' : ''}`}</Txt>
            <Txt x={PANEL_X} y={440} size={150} display weight={800} anchor="start" color={COLORS.redHot}>{`M${e.mag.toFixed( 1 )}`}</Txt>
            <Txt x={PANEL_X} y={510} size={e.place.length > 34 ? 30 : 36} weight={800} anchor="start" color={COLORS.text}>{e.place}</Txt>
            <Txt x={PANEL_X} y={562} size={30} weight={700} anchor="start" color={COLORS.textSupport}>{`${dateLabel( e.time )} · ${e.time.slice( 11, 16 )} UTC`}</Txt>
            <Txt x={PANEL_X} y={608} size={30} weight={700} anchor="start" color={COLORS.textSupport}>{fmtDepth( e.depth )}</Txt>
          </Card>
        ) : null;
      } )}

      {/* deep events */}
      <Card y={250} h={420} opacity={deep}>
        <Txt x={PANEL_X} y={310} size={30} weight={800} anchor="start" spacing={4} color={COLORS.textSupport}>DEEP EARTHQUAKES</Txt>
        <Txt x={PANEL_X} y={440} size={150} display weight={800} anchor="start" color={COLORS.text}>{String( DEEP.length )}</Txt>
        <Txt x={PANEL_X} y={495} size={30} weight={800} anchor="start" color={COLORS.text}>{`AT LEAST ${DEEP_KM} KM DEEP (WHITE RINGS)`}</Txt>
        <Txt x={PANEL_X} y={560} size={30} weight={700} anchor="start" color={COLORS.textSupport}>{`LARGEST: M${DEEP_LARGEST.mag.toFixed( 1 )}, ${fmtDepth( DEEP_LARGEST.depth )}`}</Txt>
        <Txt x={PANEL_X} y={606} size={DEEP_LARGEST.place.length > 34 ? 26 : 30} weight={700} anchor="start" color={COLORS.textSupport}>{`${DEEP_LARGEST.place.toUpperCase()} · ${dateLabel( DEEP_LARGEST.time )}`}</Txt>
      </Card>

      {/* magnitude summary */}
      <Card y={250} h={470} opacity={summary}>
        <Txt x={PANEL_X} y={310} size={40} display weight={800} anchor="start" color={COLORS.text}>BY MAGNITUDE</Txt>
        {BINS.map( ( x, i ) => {
          const y = 390 + i * 86;
          return (
            <g key={x.label}>
              <Txt x={PANEL_X} y={y} size={28} weight={800} anchor="start" color={COLORS.textSupport}>{x.label}</Txt>
              <rect x={PANEL_X} y={y + 14} width={Math.max( 6, 440 * ( x.n / maxBin ) )} height={20} rx={10} fill={i === 0 ? COLORS.textSecondary : COLORS.redHot} />
              <Txt x={PANEL_X + 560} y={y + 32} size={52} display weight={800} anchor="end" color={i === 0 ? COLORS.text : COLORS.redHot}>{String( x.n )}</Txt>
            </g>
          );
        } )}
        <Txt x={PANEL_X} y={672} size={30} weight={800} anchor="start" color={COLORS.text}>{`M6.0+: ${M6}  ·  LARGEST: M${LARGEST.mag.toFixed( 1 )}`}</Txt>
      </Card>

      {/* persistent footer */}
      <Txt x={PANEL_X} y={H - 44} size={20} weight={700} anchor="start" spacing={0.5} color={COLORS.textSupport}>{`${COVERAGE_SHORT} · ${RETRIEVED_LABEL} · HISTORICAL RECORD, NOT A LIVE FEED`}</Txt>
      <Txt x={W - PANEL_X} y={H - 44} size={24} weight={800} anchor="end" spacing={4} color={COLORS.redText}>NEXT HUGE QUAKE</Txt>
    </svg>
  );
};

const Caption: React.FC<{ t: number; captions: { text: string; start: number; end: number }[] }> = ( { t, captions } ) => {
  const c = captions.find( x => t >= x.start && t < x.end );
  if ( !c ) return null;
  return (
    <div style={{ position: 'absolute', left: 660, right: 160, top: H - 168, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 34, lineHeight: 1.2, textAlign: 'center', color: COLORS.text, background: 'rgba(7, 11, 20, 0.72)', padding: '8px 20px', borderRadius: 10, textShadow: '0 2px 6px rgba(0, 0, 0, 0.9)' }}>{c.text}</div>
    </div>
  );
};

/** Steady bed level under the voice. */
const MUSIC = 0.12;

export const QuakesOctoberFinal: React.FC<EduShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( QUAKES_OCTOBER_FINAL, audio );
  const x = XFADE * FPS;
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap width={W} height={H} cameraAt={f => camera( f, b, total )} epicenter={[ 0, 0 ]} tiles="local" style={style} trackPoints={EVENTS.map( e => [ e.lon, e.lat ] as [ number, number ] )} diagnostics={{ event: 'quakes-october-live-final', tiles: 'local' }} background={COLORS.background} overlay={overlay( b, total )} />
      <Caption t={t} captions={audio?.captions ?? placeholderCaptions( SPEC )} />
      {audio ? (
        <>
          {/* equal-power crossfade: the opening plays the track from `total` (what would follow the last frame), fading into the track from 0 */}
          <Audio src={staticFile( audio.musicFile )} volume={f => MUSIC * ( f < x ? Math.sin( ( Math.PI / 2 ) * ( f / x ) ) : 1 )} />
          <Sequence from={0} durationInFrames={x} layout="none">
            <Audio src={staticFile( audio.musicFile )} trimBefore={durationInFrames} volume={f => MUSIC * Math.cos( ( Math.PI / 2 ) * ( f / x ) )} />
          </Sequence>
          {audio.clips.map( clip => (
            <Sequence key={clip.id} from={Math.round( clip.start * FPS )} layout="none">
              <Audio src={staticFile( clip.file )} volume={clip.gain ?? 1} />
            </Sequence>
          ) )}
        </>
      ) : null}
    </AbsoluteFill>
  );
};
