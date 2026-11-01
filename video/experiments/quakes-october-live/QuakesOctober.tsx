/** "Earthquakes in October 2026": M5+ USGS events of Oct 1-25 appear chronologically on the Next Huge Quake globe. Designed to loop. Adapted from experiments/quakes-week. */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COLORS } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { LiveMap } from '../../src/map/LiveMap.js';
import type { MapCamera } from '../../src/map/LiveMap.js';
import { localStyle } from '../../src/spike/styles.js';
import { Layers, eduShortSchema } from '../../src/edu/EduShort.js';
import type { EduShortProps } from '../../src/edu/EduShort.js';
import { Captions } from '../../src/edu/ScienceShort.js';
import { beatsFor, placeholderCaptions } from '../../src/edu/episodes.js';
import type { Beats } from '../../src/edu/episodes.js';
import { Txt, clamp, prog, vis } from '../../src/edu/kit.js';
import { EVENTS, FEATURED, LARGEST, M6, M7, OTHER, QUAKES_OCTOBER, STRONGEST, TOTAL, dateLabel, placeOf } from './script.js';

export { eduShortSchema };
const FPS = 30;
const ease = ( x: number ) => x * x * ( 3 - 2 * x );
const DAY_MS = 86_400_000;
const T0 = Date.parse( '2026-10-01T00:00:00Z' );
const DAYS = 25;
const MONTHS = [ 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC' ];

type Stop = { t: number; lon: number; lat: number; zoom: number; top: number; bottom: number; lin?: boolean };
const HOME = { lon: 160, lat: 10, zoom: 2.5 };
const SPEC = QUAKES_OCTOBER.script;
const end = ( b: Beats ) => b.s1.end + QUAKES_OCTOBER.tailSeconds!;

/** Timeline of the chronological scene: begins just before "Watch them appear", ends a moment before the first strongest-earthquake line. */
const span = ( b: Beats ) => ( { b0: b.b0.start - 0.2, b1: b.c0.start - 1.0 } );

const stops = ( b: Beats ): Stop[] => {
  const { b0, b1 } = span( b );
  const s: Stop[] = [
    { t: 0, ...HOME, top: 300, bottom: 0 },
    { t: b0 - 0.8, ...HOME, top: 290, bottom: 430 },
    { t: b1, lon: -90, lat: 10, zoom: 2.5, top: 290, bottom: 430, lin: true }
  ];
  STRONGEST.forEach( ( e, i ) => {
    const c = b[`c${i}`];
    s.push( { t: c.start - 0.1, lon: e.lon, lat: e.lat, zoom: 4.2, top: 300, bottom: 560 }, { t: c.end + 0.3, lon: e.lon + 3, lat: e.lat, zoom: 4.3, top: 300, bottom: 560 } );
  } );
  s.push( { t: b.s0.start - 0.2, lon: 130, lat: 15, zoom: 2.4, top: 290, bottom: 430 }, { t: end( b ), ...HOME, top: 300, bottom: 0 } );
  return s;
};

export const camera = ( frame: number, b: Beats ): MapCamera => {
  const t = frame / FPS;
  const s = stops( b );
  let i = s.findIndex( x => x.t > t );
  if ( i < 0 ) i = s.length - 1;
  if ( i === 0 ) i = 1;
  const a = s[i - 1], z = s[i];
  const raw = clamp( ( t - a.t ) / Math.max( 0.01, z.t - a.t ) );
  const k = z.lin ? raw : ease( raw );
  const dl = ( ( ( z.lon - a.lon + 540 ) % 360 ) - 180 );
  // the slow rotation goes east (positive longitude) the long way when it is a linear segment
  const span = z.lin ? ( ( z.lon - a.lon + 360 ) % 360 ) : dl;
  const lon = ( ( a.lon + span * k + 540 ) % 360 ) - 180;
  return { center: [ lon, a.lat + ( z.lat - a.lat ) * k ], zoom: a.zoom + ( z.zoom - a.zoom ) * k, bearing: 0, pitch: 0, padding: { top: a.top + ( z.top - a.top ) * k, bottom: a.bottom + ( z.bottom - a.bottom ) * k, left: 0, right: 0 } };
};

const style = () => localStyle();
const radius = ( mag: number ) => ( mag >= 7 ? 17 : mag >= 6 ? 12 : mag >= 5.5 ? 8.5 : 6 );
const toRad = Math.PI / 180;
/** Angular distance in degrees between two lon/lat points. */
const arc = ( lon1: number, lat1: number, lon2: number, lat2: number ) => Math.acos( clamp( Math.sin( lat1 * toRad ) * Math.sin( lat2 * toRad ) + Math.cos( lat1 * toRad ) * Math.cos( lat2 * toRad ) * Math.cos( ( lon1 - lon2 ) * toRad ), -1, 1 ) ) / toRad;
const upDate = ( ms: number ) => { const d = new Date( ms ); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };

const Panel: React.FC<{ children: React.ReactNode; opacity: number }> = ( { children, opacity } ) => (
  <g opacity={opacity}>
    <rect x={60} y={1540} width={960} height={250} rx={26} fill="rgba(7,11,20,0.9)" stroke={COLORS.redHot} strokeWidth={6} />
    {children}
  </g>
);

const overlay = ( b: Beats, total: number ) => ( _m: unknown, frame: number, tracked?: { x: number; y: number }[] ) => {
  const t = frame / FPS;
  const { b0, b1 } = span( b );
  const cam = camera( frame, b );
  const frac = clamp( ( t - b0 ) / ( b1 - b0 ) );
  const simMs = T0 + frac * DAYS * DAY_MS;
  const appears = ( e: typeof EVENTS[number] ) => b0 + ( ( Date.parse( e.time ) - T0 ) / ( DAYS * DAY_MS ) ) * ( b1 - b0 );
  const shown = EVENTS.filter( e => t >= appears( e ) ).length;
  const dayNo = Math.min( DAYS, Math.floor( frac * DAYS ) + 1 );

  // scene visibilities
  const heroStart = vis( t, -1, b.b0.start - 0.3, 0.5 );
  const heroEnd = clamp( ( t - ( b.s1.end + 0.6 ) ) / 1.0 );
  const hero = Math.max( heroStart, heroEnd );
  const timeline = vis( t, b0 + 0.3, b1 + 0.7, 0.5 );
  const strong = vis( t, b.c0.start - 0.4, b.c2.end + 0.8, 0.4 );
  const summary = vis( t, b.s0.start - 0.2, b.s1.end + 0.4, 0.5 );
  const fadeAllOut = 1 - clamp( ( t - ( total - 1.6 ) ) / 1.2 );
  const dotOpacity = Math.min( clamp( ( t - 0.01 ) / 0.01 ), fadeAllOut );
  const counted = Math.round( TOTAL * prog( t, 0.8, 1.6 ) );
  const chips = [ ...FEATURED.map( ( r, i ) => ( { name: r.name.toUpperCase(), count: r.count, id: `r${i}` } ) ), { name: 'REST OF THE WORLD', count: OTHER, id: 'rest' } ];
  const hi = STRONGEST.findIndex( ( _, i ) => t >= b[`c${i}`].start - 0.1 && t <= b[`c${i}`].end + 0.4 );

  const pts = tracked ?? [];
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#070B14" stopOpacity="0.88" /><stop offset="1" stopColor="#070B14" stopOpacity="0" /></linearGradient></defs>
      {/* markers: one per earthquake, projected by the map; hidden when on the far side of the globe */}
      <g opacity={dotOpacity}>
        {EVENTS.map( ( e, i ) => {
          const p = pts[i];
          if ( !p ) return null;
          const born = clamp( ( t - appears( e ) ) / 0.5 );
          if ( born <= 0 ) return null;
          const far = clamp( ( 84 - arc( cam.center[0], cam.center[1], e.lon, e.lat ) ) / 10 );
          if ( far <= 0 ) return null;
          const r = radius( e.mag ) * ( cam.zoom > 3 ? 1.35 : 1 ) * ( 0.6 + 0.4 * ease( born ) );
          return (
            <g key={e.id} opacity={far * ease( born )}>
              <circle cx={p.x} cy={p.y} r={r * 1.9} fill="#FF3B30" opacity={0.2} />
              <circle cx={p.x} cy={p.y} r={r} fill="#FF3B30" fillOpacity={0.95} stroke="#FFD9D6" strokeWidth={e.mag >= 7 ? 2 : 1} />
              {e.mag >= 7 ? <circle cx={p.x} cy={p.y} r={r + 9} fill="none" stroke="#FFD9D6" strokeWidth={2.5} opacity={0.85} /> : null}
            </g>
          );
        } )}
        {hi >= 0 ? ( () => {
          const e = STRONGEST[hi]; const p = pts[EVENTS.indexOf( e )];
          return p ? <circle cx={p.x} cy={p.y} r={radius( e.mag ) * 1.35 + 22} fill="none" stroke="#FFFFFF" strokeWidth={4} opacity={0.9 * vis( t, b[`c${hi}`].start - 0.1, b[`c${hi}`].end + 0.3, 0.3 )} /> : null;
        } )() : null}
      </g>
      <rect width={1080} height={580} fill="url(#shade)" opacity={Math.max( hero, timeline, strong, summary ) * 0.9} />
      {/* A / loop: title block */}
      <g opacity={hero}>
        <Txt x={540} y={275} size={74} display weight={800} color={COLORS.text}>EARTHQUAKES IN OCTOBER 2026</Txt>
        <Txt x={540} y={410} size={120} display weight={800} color={COLORS.redHot} opacity={Math.max( prog( t, 0.8, 0.5 ), heroEnd )}>{`${heroEnd > 0 ? TOTAL : counted} EARTHQUAKES`}</Txt>
        <Txt x={540} y={475} size={38} weight={700} color={COLORS.textSupport}>WORLDWIDE | MAGNITUDE &gt;5.0</Txt>
        <Txt x={540} y={530} size={42} weight={700} spacing={4} color={COLORS.redText}>OCTOBER 1–25, 2026</Txt>
      </g>
      {/* B: date and cumulative counter */}
      <g opacity={timeline}>
        <Txt x={540} y={265} size={34} display weight={800} spacing={5} color={COLORS.redText}>EARTHQUAKES IN OCTOBER 2026</Txt>
        <Txt x={540} y={380} size={120} display weight={800} color={COLORS.text}>{upDate( T0 + ( dayNo - 1 ) * DAY_MS ).replace( ', 2026', '' ) + ', 2026'}</Txt>
        <Txt x={540} y={448} size={52} display weight={800} color={COLORS.redHot}>{`${shown} EARTHQUAKES RECORDED`}</Txt>
        {chips.map( c => {
          const o = vis( t, b[c.id].start - 0.1, b[c.id].end + 0.5, 0.3 );
          return o > 0.01 ? (
            <Panel key={c.id} opacity={o}>
              <Txt x={540} y={1612} size={c.name.length > 22 ? 52 : 62} display weight={800} color={COLORS.text}>{c.name}</Txt>
              <Txt x={540} y={1762} size={104} display weight={800} color={COLORS.redHot}>{`${Math.round( c.count * prog( t, b[c.id].start, 0.8 ) )} EARTHQUAKES`}</Txt>
              <Txt x={540} y={1658} size={28} weight={700} spacing={2} color={COLORS.textSupport}>OCT 1–25 TOTAL</Txt>
            </Panel>
          ) : null;
        } )}
      </g>
      {/* C: strongest */}
      <g opacity={strong}>
        <Txt x={540} y={285} size={64} display weight={800} color={COLORS.text}>STRONGEST EARTHQUAKES</Txt>
        <Txt x={540} y={355} size={36} weight={700} spacing={3} color={COLORS.redText}>OCTOBER 1–25, 2026 | USGS</Txt>
        {STRONGEST.map( ( e, i ) => {
          const o = vis( t, b[`c${i}`].start - 0.1, b[`c${i}`].end + 0.5, 0.3 );
          return o > 0.01 ? (
            <g key={e.id} opacity={o}>
              <Txt x={540} y={450} size={40} weight={800} spacing={4} color={COLORS.textSupport}>{`#${i + 1} STRONGEST`}</Txt>
              <rect x={60} y={1540} width={960} height={250} rx={26} fill="rgba(7,11,20,0.9)" stroke={COLORS.redHot} strokeWidth={6} />
              <Txt x={250} y={1708} size={118} display weight={800} color={COLORS.redHot}>{`M${e.mag.toFixed( 1 )}`}</Txt>
              <Txt x={650} y={1630} size={placeOf( e ).length > 24 ? 40 : 50} display weight={800} anchor="middle" color={COLORS.text}>{placeOf( e ).toUpperCase()}</Txt>
              <Txt x={650} y={1700} size={42} weight={700} anchor="middle" color={COLORS.textSupport}>{`${dateLabel( e )} · ${e.time.slice( 11, 16 )} UTC`}</Txt>
              <Txt x={650} y={1755} size={30} weight={700} anchor="middle" color={COLORS.textSupport}>{`DEPTH ${Math.round( e.depth )} KM`}</Txt>
            </g>
          ) : null;
        } )}
      </g>
      {/* D: summary */}
      <g opacity={summary}>
        <Txt x={540} y={285} size={74} display weight={800} color={COLORS.text}>OCTOBER 1–25, 2026</Txt>
        <Txt x={540} y={365} size={38} weight={700} color={COLORS.textSupport}>WORLDWIDE | MAGNITUDE &gt;5.0</Txt>
        <rect x={60} y={1520} width={960} height={290} rx={26} fill="rgba(7,11,20,0.92)" stroke={COLORS.redHot} strokeWidth={6} />
        {[ [ String( TOTAL ), 'EARTHQUAKES' ], [ String( M6 ), 'M6.0+' ], [ String( M7 ), 'M7.0+' ], [ `M${LARGEST.mag.toFixed( 1 )}`, 'LARGEST' ] ].map( ( [ n, l ], i ) => (
          <g key={l}>
            <Txt x={[ 200, 440, 660, 870 ][i]} y={1660} size={i === 3 ? 84 : 100} display weight={800} color={COLORS.redHot}>{n}</Txt>
            <Txt x={[ 200, 440, 660, 870 ][i]} y={1725} size={26} weight={700} spacing={1} color={COLORS.text}>{l}</Txt>
          </g>
        ) )}
        <Txt x={540} y={1785} size={24} weight={700} color={COLORS.textSupport}>M &gt; 5.0 · USGS EARTHQUAKE CATALOG</Txt>
      </g>
      {/* persistent label */}
      <Txt x={540} y={1850} size={26} weight={700} spacing={1} color={COLORS.textSupport} opacity={0.9 * fadeAllOut}>OCT 1–25, 2026 · HISTORICAL RECORD, NOT A LIVE FEED</Txt>
      <Txt x={540} y={1890} size={22} weight={700} spacing={3} color={COLORS.redText} opacity={0.8 * fadeAllOut}>NEXT HUGE QUAKE</Txt>
    </svg>
  );
};

export const QuakesOctober: React.FC<EduShortProps> = ( { audio } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / FPS;
  const total = durationInFrames / FPS;
  const b = beatsFor( QUAKES_OCTOBER, audio );
  // steady music bed under the voice (no swells, so the loop seam stays quiet): short fade in, longer fade out
  const musicVolume = ( f: number ) => 0.11 * clamp( f / FPS / 1.2 ) * clamp( ( total - f / FPS ) / 2.2 );
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap cameraAt={f => camera( f, b )} epicenter={[ 0, 0 ]} tiles="local" style={style} trackPoints={EVENTS.map( e => [ e.lon, e.lat ] as [ number, number ] )} diagnostics={{ event: 'quakes-october-live', tiles: 'local' }} background={COLORS.background} overlay={overlay( b, total )} />
      <Captions t={t} captions={audio?.captions ?? placeholderCaptions( SPEC )} />
      {audio ? <Layers audio={audio} cues={[]} total={total} musicVolume={musicVolume} /> : null}
    </AbsoluteFill>
  );
};
