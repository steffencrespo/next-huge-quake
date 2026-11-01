/** 9:16 Shorts/TikTok edit of "Earthquakes in October 2026" (1080×1920): same snapshot and figures as the approved landscape final, re-framed for phones.
 * Scenes: hook title (also the loop frame) -> day-by-day replay -> most active areas -> plate line -> strongest (incl. the tied M6.9s) -> deep -> by magnitude -> title.
 * All text stays inside the platform safe area (src/design/layout.ts SAFE); the map sits between the text block and the captions.
 * Adapted from QuakesOctoberFinal.tsx (landscape). */
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { SAFE } from '../../src/design/layout.js';
import { COLORS } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { LiveMap } from '../../src/map/LiveMap.js';
import type { MapCamera } from '../../src/map/LiveMap.js';
import { localStyle } from '../../src/spike/styles.js';
import { eduShortSchema } from '../../src/edu/EduShort.js';
import type { EduShortProps } from '../../src/edu/EduShort.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { beatsFor, placeholderCaptions } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { Txt, clamp, vis } from '../../src/edu/kit.js';
import { BINS, DEEP, DEEP_KM, DEEP_LARGEST, EVENTS, FEATURED, LARGEST, M6, OTHER, SPAN_MS, STRONGEST, TOTAL, WINDOW, dateLabel } from './script-final.js';
import { QUAKES_OCTOBER_VERTICAL } from './script-vertical.js';

export { eduShortSchema };
export const W = 1080, H = 1920;
const FPS = 30;
const XFADE = 3;
const ease = ( x: number ) => x * x * ( 3 - 2 * x );
const T0 = Date.parse( WINDOW.start );
const SPEC = QUAKES_OCTOBER_VERTICAL.script;
/** Text column: the safe area, centred on its own middle (clear of the right-hand button rail). */
const L = SAFE.left, R = W - SAFE.right, CX = ( L + R ) / 2, CW = R - L;
/** Map padding: the globe / epicenter sits between the text block (ends ~720) and the captions (start 1330). */
const PAD_TOP = 700, PAD_BOTTOM = SAFE.bottom;

type Stop = { t: number; lon: number; lat: number; zoom: number; lin?: boolean };
const HOME = { lon: 165, lat: 2, zoom: 2.3 };
const DRIFT = 1.2;
const toRad = Math.PI / 180;
const arc = ( lon1: number, lat1: number, lon2: number, lat2: number ) => Math.acos( clamp( Math.sin( lat1 * toRad ) * Math.sin( lat2 * toRad ) + Math.cos( lat1 * toRad ) * Math.cos( lat2 * toRad ) * Math.cos( ( lon1 - lon2 ) * toRad ), -1, 1 ) ) / toRad;
const centroid = ( pts: { lon: number; lat: number }[] ) => {
  let x = 0, y = 0, z = 0;
  pts.forEach( p => { x += Math.cos( p.lat * toRad ) * Math.cos( p.lon * toRad ); y += Math.cos( p.lat * toRad ) * Math.sin( p.lon * toRad ); z += Math.sin( p.lat * toRad ); } );
  return { lon: Math.atan2( y, x ) / toRad, lat: Math.atan2( z, Math.hypot( x, y ) ) / toRad };
};
const DEEP_VIEW = centroid( DEEP );
/** The two narrated regions; the rest of the ranking is on the card. */
const TOUR = FEATURED.slice( 0, 2 );

export const scenes = ( b: Beats, total: number ) => ( {
  replay: { start: b.b0.start - 0.1, end: b.r0.start - 1.5 },
  heroBack: Math.min( b.s0.end + 0.5, total - 2.2 )
} );
const strongEnd = ( b: Beats, i: number ) => ( i + 1 < STRONGEST.length ? b[`c${i + 1}`].start : b.deep.start ) - 0.9;

const stops = ( b: Beats, total: number ): Stop[] => {
  const s = scenes( b, total );
  const out: Stop[] = [ { t: 0, ...HOME }, { t: s.replay.start - 0.3, ...HOME, lon: HOME.lon + DRIFT * ( s.replay.start - 0.3 ), lin: true }, { t: s.replay.end, lon: -60, lat: 5, zoom: 2.3, lin: true } ];
  TOUR.forEach( ( r, i ) => {
    out.push( { t: b[`r${i}`].start + 0.1, lon: r.box.center[0], lat: r.box.center[1], zoom: r.box.zoom + 0.35 } );
    out.push( { t: ( i + 1 < TOUR.length ? b[`r${i + 1}`].start : b.plate.start ) - 1.3, lon: r.box.center[0] + 1.2, lat: r.box.center[1], zoom: r.box.zoom + 0.45 } );
  } );
  // plate line: the Pacific Ring of Fire, slowly turning
  out.push( { t: b.plate.start + 0.4, lon: -175, lat: 8, zoom: 2.2 } );
  out.push( { t: b.c0.start - 1.4, lon: -150, lat: 8, zoom: 2.2, lin: true } );
  STRONGEST.forEach( ( e, i ) => {
    out.push( { t: b[`c${i}`].start + 0.05, lon: e.lon, lat: e.lat, zoom: 4.5 } );
    out.push( { t: strongEnd( b, i ) - 0.5, lon: e.lon + 1.5, lat: e.lat, zoom: 4.7 } );
  } );
  out.push( { t: b.deep.start + 0.05, lon: DEEP_VIEW.lon, lat: DEEP_VIEW.lat, zoom: 2.55 } );
  out.push( { t: b.s0.start - 1.3, lon: DEEP_VIEW.lon + 4, lat: DEEP_VIEW.lat, zoom: 2.6 } );
  const settle = b.s0.start + 0.3;
  out.push( { t: settle, ...HOME, lon: HOME.lon - DRIFT * ( total - settle ) } );
  out.push( { t: total, ...HOME, lin: true } );
  for ( let i = 1; i < out.length; i++ ) if ( out[i].t <= out[i - 1].t ) throw new Error( `camera stops out of order at ${i} (${out[i - 1].t} >= ${out[i].t})` );
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
  const dl = z.lin ? ( ( z.lon - a.lon + 720 ) % 360 ) : ( ( ( z.lon - a.lon + 540 ) % 360 ) - 180 );
  const lon = ( ( a.lon + dl * k + 540 ) % 360 ) - 180;
  const dist = arc( a.lon, a.lat, z.lon, z.lat );
  const dip = z.lin ? 0 : Math.min( 1.8, Math.max( 0, ( dist - 12 ) / 45 ) ) * Math.sin( Math.PI * k );
  return { center: [ lon, a.lat + ( z.lat - a.lat ) * k ], zoom: a.zoom + ( z.zoom - a.zoom ) * k - dip, bearing: 0, pitch: 0, padding: { top: PAD_TOP, bottom: PAD_BOTTOM, left: 0, right: 0 } };
};

const style = () => localStyle();
const radius = ( mag: number ) => ( mag >= 7 ? 16 : mag >= 6 ? 11.5 : mag >= 5.5 ? 8 : 6 );
const upDate = ( ms: number ) => dateLabel( new Date( ms ).toISOString() );
const fmtDepth = ( d: number ) => `${Math.round( d )} KM DEEP`;
/** Card entrance: fade plus a short rise. */
const rise = ( o: number ) => `translate(0 ${Math.round( ( 1 - ease( clamp( o ) ) ) * 26 )})`;

const Card: React.FC<{ y: number; h: number; opacity: number; children: React.ReactNode }> = ( { y, h, opacity, children } ) => (
  opacity > 0.01 ? (
    <g opacity={opacity} transform={rise( opacity )}>
      <rect x={L} y={y} width={CW} height={h} rx={24} fill="rgba(7,11,20,0.88)" stroke={COLORS.rule} strokeWidth={2} />
      <rect x={L} y={y} width={CW} height={8} rx={4} fill={COLORS.redHot} />
      {children}
    </g>
  ) : null
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

  const hero = Math.max( vis( t, -1, r0 - 0.15, 0.35 ), clamp( ( t - s.heroBack ) / 0.8 ) );
  const header = 1 - hero;
  const replay = vis( t, r0 + 0.1, r1 + 0.5, 0.35 );
  const regions = vis( t, b.r0.start - 0.5, b.plate.end + 0.5, 0.35 );
  const deep = vis( t, b.deep.start - 0.3, b.s0.start - 0.4, 0.3 );
  const summary = vis( t, b.s0.start - 0.2, s.heroBack + 0.2, 0.35 );
  const clear = clamp( ( t - ( r0 - 0.6 ) ) / 0.45 );
  const dotAlpha = ( e: typeof EVENTS[number] ) => ( t < r0 ? 1 - clear : clamp( ( t - appears( e ) ) / 0.35 ) );
  const hi = STRONGEST.findIndex( ( _, i ) => t >= b[`c${i}`].start - 0.2 && t <= strongEnd( b, i ) );
  const deepRing = vis( t, b.deep.start - 0.1, b.s0.start - 0.4, 0.3 );
  const zoomK = clamp( ( cam.zoom - 2.4 ) / 2 );
  const activeRow = t < b.r1.start - 0.4 ? 0 : t < b.plate.start - 0.6 ? 1 : -1;
  const pts = tracked ?? [];
  const rows = [ ...FEATURED.map( r => ( { name: r.name.toUpperCase(), count: r.count } ) ), { name: 'ALL OTHER AREAS', count: OTHER } ];
  const maxRow = Math.max( ...rows.map( r => r.count ) );
  const maxBin = Math.max( ...BINS.map( x => x.n ) );

  return (
    <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <linearGradient id="top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070B14" stopOpacity="0.95" /><stop offset="0.75" stopColor="#070B14" stopOpacity="0.7" /><stop offset="1" stopColor="#070B14" stopOpacity="0" /></linearGradient>
      </defs>
      <g>
        {EVENTS.map( ( e, i ) => {
          const p = pts[i];
          if ( !p ) return null;
          const a = dotAlpha( e );
          if ( a <= 0 ) return null;
          const far = clamp( ( 84 - arc( cam.center[0], cam.center[1], e.lon, e.lat ) ) / 10 );
          if ( far <= 0 ) return null;
          const r = radius( e.mag ) * ( 1 + 0.4 * zoomK ) * ( 0.6 + 0.4 * ease( a ) );
          return (
            <g key={e.id} opacity={far * ease( a )}>
              <circle cx={p.x} cy={p.y} r={r * 1.9} fill="#FF3B30" opacity={0.2} />
              <circle cx={p.x} cy={p.y} r={r} fill="#FF3B30" fillOpacity={0.95} stroke="#FFD9D6" strokeWidth={e.mag >= 7 ? 2 : 1} />
              {e.mag >= 7 ? <circle cx={p.x} cy={p.y} r={r + 9} fill="none" stroke="#FFD9D6" strokeWidth={2.5} opacity={0.85} /> : null}
            </g>
          );
        } )}
        {hi >= 0 ? ( () => {
          const e = STRONGEST[hi]; const p = pts[EVENTS.indexOf( e )];
          const o = vis( t, b[`c${hi}`].start - 0.2, strongEnd( b, hi ), 0.25 );
          const pulse = 1 + 0.12 * Math.sin( ( t - b[`c${hi}`].start ) * 4 );
          return p ? <circle cx={p.x} cy={p.y} r={( radius( e.mag ) * 1.4 + 24 ) * pulse} fill="none" stroke="#FFFFFF" strokeWidth={5} opacity={0.95 * o} /> : null;
        } )() : null}
        {deepRing > 0.01 ? DEEP.map( e => {
          const p = pts[EVENTS.indexOf( e )];
          const far = clamp( ( 84 - arc( cam.center[0], cam.center[1], e.lon, e.lat ) ) / 10 );
          return p && far > 0 ? <circle key={e.id} cx={p.x} cy={p.y} r={radius( e.mag ) + 14} fill="none" stroke="#FFFFFF" strokeWidth={e === DEEP_LARGEST ? 4.5 : 3} opacity={0.9 * deepRing * far} /> : null;
        } ) : null}
      </g>
      <rect width={W} height={760} fill="url(#top)" />

      {/* hook title / loop frame */}
      <g opacity={hero}>
        <Txt x={CX} y={268} size={34} weight={800} spacing={6} color={COLORS.redText}>OCTOBER 2026 · WORLDWIDE</Txt>
        <Txt x={CX} y={478} size={250} display weight={800} color={COLORS.redHot}>{String( TOTAL )}</Txt>
        <Txt x={CX} y={566} size={92} display weight={800} color={COLORS.text}>EARTHQUAKES</Txt>
        <Txt x={CX} y={624} size={36} weight={800} color={COLORS.text}>MAGNITUDE 5.0 OR GREATER</Txt>
        <Txt x={CX} y={672} size={30} weight={700} spacing={2} color={COLORS.textSupport}>OCT 1–31, 2026 (UTC) · USGS</Txt>
      </g>

      {/* compact header for every other scene */}
      <g opacity={header}>
        <Txt x={CX} y={262} size={40} display weight={800} color={COLORS.text}>{`OCTOBER 2026 · ${TOTAL} EARTHQUAKES`}</Txt>
      </g>

      {/* day-by-day replay */}
      <g opacity={replay}>
        <Txt x={CX} y={340} size={32} weight={800} spacing={6} color={COLORS.textSupport}>DAY BY DAY</Txt>
        <Txt x={CX} y={480} size={150} display weight={800} color={COLORS.text}>{upDate( simMs ).replace( ', 2026', '' )}</Txt>
        <Txt x={CX} y={560} size={60} display weight={800} color={COLORS.redHot}>{`${shown} SO FAR`}</Txt>
        <rect x={L + 60} y={598} width={CW - 120} height={12} rx={6} fill={COLORS.rule} />
        <rect x={L + 60} y={598} width={( CW - 120 ) * frac} height={12} rx={6} fill={COLORS.redHot} />
        <Txt x={L + 60} y={652} size={30} weight={700} anchor="start" color={COLORS.textSupport}>OCT 1</Txt>
        <Txt x={R - 60} y={652} size={30} weight={700} anchor="end" color={COLORS.textSupport}>OCT 31</Txt>
      </g>

      {/* most active areas */}
      <Card y={300} h={420} opacity={regions}>
        <Txt x={L + 32} y={358} size={40} display weight={800} anchor="start" color={COLORS.text}>MOST ACTIVE AREAS</Txt>
        {rows.map( ( r, i ) => {
          const on = i === activeRow;
          const y = 414 + i * 54;
          return (
            <g key={r.name} opacity={activeRow < 0 || on ? 1 : 0.6}>
              <Txt x={L + 32} y={y} size={30} weight={800} anchor="start" color={on ? COLORS.text : COLORS.textSupport}>{r.name}</Txt>
              <rect x={L + 32} y={y + 10} width={560 * ( r.count / maxRow )} height={11} rx={5.5} fill={on ? COLORS.redHot : COLORS.textSecondary} />
              <Txt x={R - 32} y={y + 18} size={44} display weight={800} anchor="end" color={on ? COLORS.redHot : COLORS.text}>{String( r.count )}</Txt>
            </g>
          );
        } )}
      </Card>

      {/* strongest */}
      {STRONGEST.map( ( e, i ) => {
        const o = vis( t, b[`c${i}`].start - 0.25, strongEnd( b, i ) + 0.1, 0.25 );
        const tied = STRONGEST.filter( x => x.mag === e.mag ).length > 1;
        const rank = STRONGEST.findIndex( x => x.mag === e.mag ) + 1;
        return (
          <Card key={e.id} y={300} h={420} opacity={o}>
            <Txt x={L + 32} y={360} size={32} weight={800} anchor="start" spacing={4} color={COLORS.textSupport}>{rank === 1 ? 'STRONGEST OF THE MONTH' : `#${rank} STRONGEST${tied ? ' (TIED)' : ''}`}</Txt>
            <Txt x={L + 32} y={530} size={190} display weight={800} anchor="start" color={COLORS.redHot}>{`M${e.mag.toFixed( 1 )}`}</Txt>
            <Txt x={L + 32} y={596} size={e.place.length > 36 ? 32 : 38} weight={800} anchor="start" color={COLORS.text}>{e.place}</Txt>
            <Txt x={L + 32} y={646} size={32} weight={700} anchor="start" color={COLORS.textSupport}>{`${dateLabel( e.time )} · ${e.time.slice( 11, 16 )} UTC`}</Txt>
            <Txt x={L + 32} y={692} size={32} weight={700} anchor="start" color={COLORS.textSupport}>{fmtDepth( e.depth )}</Txt>
          </Card>
        );
      } )}

      {/* deep */}
      <Card y={300} h={420} opacity={deep}>
        <Txt x={L + 32} y={360} size={32} weight={800} anchor="start" spacing={4} color={COLORS.textSupport}>DEEP EARTHQUAKES</Txt>
        <Txt x={L + 32} y={530} size={190} display weight={800} anchor="start" color={COLORS.text}>{String( DEEP.length )}</Txt>
        <Txt x={L + 200} y={470} size={36} weight={800} anchor="start" color={COLORS.text}>{`AT LEAST ${DEEP_KM} KM DEEP`}</Txt>
        <Txt x={L + 200} y={520} size={30} weight={700} anchor="start" color={COLORS.textSupport}>WHITE RINGS ON THE MAP</Txt>
        <Txt x={L + 32} y={606} size={32} weight={800} anchor="start" color={COLORS.text}>{`LARGEST: M${DEEP_LARGEST.mag.toFixed( 1 )}, ${fmtDepth( DEEP_LARGEST.depth )}`}</Txt>
        <Txt x={L + 32} y={656} size={30} weight={700} anchor="start" color={COLORS.textSupport}>{`${DEEP_LARGEST.place.toUpperCase()}`}</Txt>
        <Txt x={L + 32} y={698} size={30} weight={700} anchor="start" color={COLORS.textSupport}>{dateLabel( DEEP_LARGEST.time )}</Txt>
      </Card>

      {/* by magnitude */}
      <Card y={300} h={420} opacity={summary}>
        <Txt x={L + 32} y={358} size={40} display weight={800} anchor="start" color={COLORS.text}>BY MAGNITUDE</Txt>
        {BINS.map( ( x, i ) => {
          const y = 430 + i * 82;
          return (
            <g key={x.label}>
              <Txt x={L + 32} y={y} size={30} weight={800} anchor="start" color={COLORS.textSupport}>{x.label}</Txt>
              <rect x={L + 32} y={y + 14} width={Math.max( 8, 560 * ( x.n / maxBin ) )} height={18} rx={9} fill={i === 0 ? COLORS.textSecondary : COLORS.redHot} />
              <Txt x={R - 32} y={y + 30} size={64} display weight={800} anchor="end" color={i === 0 ? COLORS.text : COLORS.redHot}>{String( x.n )}</Txt>
            </g>
          );
        } )}
        <Txt x={L + 32} y={690} size={32} weight={800} anchor="start" color={COLORS.text}>{`M6.0+: ${M6}  ·  LARGEST: M${LARGEST.mag.toFixed( 1 )}`}</Txt>
      </Card>

      {/* source line, just above the captions */}
      <g>
        <rect x={CX - 290} y={1262} width={580} height={50} rx={25} fill="rgba(7,11,20,0.78)" />
        <Txt x={CX} y={1298} size={30} weight={800} spacing={2} color={COLORS.textSupport}>USGS DATA · NEXT HUGE QUAKE</Txt>
      </g>
    </svg>
  );
};

const MUSIC = 0.13;

export const QuakesOctoberVertical: React.FC<EduShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( QUAKES_OCTOBER_VERTICAL, audio );
  const x = XFADE * FPS;
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap width={W} height={H} cameraAt={f => camera( f, b, total )} epicenter={[ 0, 0 ]} tiles="local" style={style} trackPoints={EVENTS.map( e => [ e.lon, e.lat ] as [ number, number ] )} diagnostics={{ event: 'quakes-october-live-vertical', tiles: 'local' }} background={COLORS.background} overlay={overlay( b, total )} />
      <Captions t={t} captions={audio?.captions ?? placeholderCaptions( SPEC )} />
      {audio ? (
        <>
          {/* equal-power crossfade at the loop seam: the opening plays the track from `total`, fading into the track from 0 */}
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
