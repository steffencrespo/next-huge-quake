/**
 * Historic 02, "The 2011 Japan Earthquake and Tsunami". Japan-centred map (Natural Earth 1:50m) with the USGS epicentre, a schematic
 * Japan Trench, a schematic subduction section, illustrative wave arcs toward the coast, and restrained impact cards.
 * Facts: USGS ComCat (M9.1 Mww, 2011-03-11 05:46:24 UTC = 2:46 PM JST, 38.297 N 142.373 E); USGS event summary (15,703 dead at the time of
 * writing, max run-up 37.88 m at Miyako); JMA (revised tsunami warning system introduced 2013-03-07). The wave arcs are NOT a tsunami simulation.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, P_COLOR, Pill, Txt, at, clamp, f1, lerp, prog, smooth, span, vis, within } from '../edu/kit.js';
import { makeEduShort } from '../edu/EduShort.js';
import type { EpisodeVisuals } from '../edu/EduShort.js';
import { HISTORIC } from './episodes.js';
import { Card, Epicenter, HistoricTag, HistoricTitle, RegionMap, SubductionSection } from './kit.js';
import type { MapTheme } from './kit.js';

type B = Parameters<EpisodeVisuals>[0]['b'];

const TOP = 330;
const EPI: [ number, number ] = [ 142.373, 38.297 ];
const BOX = { w: 120, e: 165, s: 22, n: 52 };
const THEME: MapTheme = { ocean: '#0b1830', land: '#33384a', coast: '#ece2e2', rule: COLORS.rule };
const TRENCH: [ number, number ][] = [ [ 145.3, 41.6 ], [ 144.9, 40 ], [ 144.6, 38.6 ], [ 144.2, 37 ], [ 143.7, 35.6 ] ];
const SENDAI: [ number, number ] = [ 141.0, 38.27 ];
const MIYAKO: [ number, number ] = [ 141.97, 39.64 ];
const FUKUSHIMA: [ number, number ] = [ 141.03, 37.42 ];

const mapH = ( t: number, b: B ) => lerp( 960, 560, prog( t, b.plates.start - 0.3, 0.8 ) - prog( t, b.wave.end - 0.2, 0.8 ) );

const JapanMap: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const h = mapH( t, b );
  const rect = { x: 60, y: TOP, w: 960, h };
  const dim = lerp( 0.35, 1, prog( t, b.date.start - 0.3, 0.8 ) );
  const trench = prog( t, b.plates.start, 1.2 );
  const wave0 = b.wave.end - 0.1;
  const fuku = span( t, b, 'fukushima', 'warning', 0.4 );
  const coastO = prog( t, wave0 + 2.2, 0.5 );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: dim }}>
      <RegionMap id="japan" rect={rect} box={BOX} center={[ 141.8, 38.2 ]} zoom={2.9} theme={THEME}>
        {proj => {
          const [ ex, ey ] = proj( EPI[0], EPI[1] );
          const trenchD = `M${TRENCH.map( ( [ lo, la ] ) => proj( lo, la ).map( f1 ).join( ',' ) ).join( 'L' )}`;
          const pts = ( p: [ number, number ] ) => proj( p[0], p[1] );
          const [ sx, sy ] = pts( SENDAI );
          const [ mx, my ] = pts( MIYAKO );
          const [ fx, fy ] = pts( FUKUSHIMA );
          const [ jx, jy ] = proj( 136.5, 36 );
          const [ ox, oy ] = proj( 147.5, 35 );
          const r0 = ( t - wave0 ) / 2.4;
          const arcs = [ 0, 1, 2 ].map( i => {
            const p = clamp( r0 - i * 0.16 );
            const r = 20 + p * 112;
            const a0 = ( 140 * Math.PI ) / 180, a1 = ( 220 * Math.PI ) / 180;
            const d = `M${f1( ex + r * Math.cos( a0 ) )},${f1( ey - r * Math.sin( a0 ) )} A${f1( r )},${f1( r )} 0 0 1 ${f1( ex + r * Math.cos( a1 ) )},${f1( ey - r * Math.sin( a1 ) )}`;
            return p > 0 && p < 1 ? <path key={i} d={d} fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={Math.min( 1, ( 1 - p ) * 2 )} /> : null;
          } );
          return (
            <>
              <path d={trenchD} fill="none" stroke={COLORS.redHot} strokeWidth={6} strokeDasharray="22 14" strokeLinecap="round" opacity={0.85 * trench} />
              {arcs}
              <Epicenter x={ex} y={ey} t={t} opacity={prog( t, b.hook.start + 0.4, 0.5 )} />
              <Pill x={ex + 215} y={ey + 70} text="EPICENTER · USGS" color={COLORS.redHot} size={26} opacity={prog( t, b.date.start, 0.5 )} />
              <Pill x={ex + 220} y={ey - 190} text="JAPAN TRENCH · SCHEMATIC" color={COLORS.redHot} size={24} opacity={trench} />
              {[ [ sx, sy, 'SENDAI' ], [ mx, my, 'MIYAKO' ] ].map( ( [ x, y, n ] ) => (
                <g key={n as string} opacity={coastO}><circle cx={x as number} cy={y as number} r={9} fill="#7FDBFF" stroke="#fff" strokeWidth={3} /></g>
              ) )}
              <Epicenter x={fx} y={fy} t={t} opacity={fuku} color="#FFB800" r={10} />
              <Pill x={fx - 170} y={fy + 10} text="FUKUSHIMA DAIICHI" color="#FFB800" size={24} opacity={fuku} />
              <Pill x={sx - 120} y={sy - 40} text="SENDAI" color="#7FDBFF" size={24} opacity={coastO * ( 1 - fuku )} />
              <Pill x={mx - 130} y={my - 40} text="MIYAKO" color="#7FDBFF" size={24} opacity={coastO * ( 1 - fuku )} />
              <Txt x={jx} y={jy} size={34} weight={600} spacing={4} color={COLORS.textSupport} opacity={0.8}>JAPAN</Txt>
              <Txt x={ox} y={oy} size={34} weight={600} spacing={4} color={P_COLOR} opacity={0.8}>PACIFIC OCEAN</Txt>
            </>
          );
        }}
      </RegionMap>
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Txt x={84} y={TOP + h - 20} size={26} anchor="start" weight={600} color={COLORS.textSupport} opacity={prog( t, wave0 + 0.5, 0.5 )}>Wave arcs are illustrative · not a tsunami simulation</Txt>
      </svg>
    </div>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const date = span( t, b, 'date', 'plates', 0.4 );
  const runup = span( t, b, 'runup', 'lives', 0.4 );
  const lives = span( t, b, 'lives', 'fukushima', 0.4 );
  const warning = span( t, b, 'warning', 'lesson', 0.4 );
  const lesson = vis( t, b.lesson.start - 0.1, b.lesson.end + 0.6, 0.4 );
  return (
    <>
      <Backdrop accent="#3a1020" grid={false} />
      <JapanMap t={t} b={b} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <SubductionSection t={t} times={{ show: b.plates.start - 0.2, lock: b.lock.start + 0.2, slip: within( b, 'slip', 0.45 ), hide: b.wave.end - 0.2 }} labels={{ ocean: 'PACIFIC PLATE', land: 'N. AMERICAN PLATE' }} />
        <Card x={60} y={1020} w={540} label="DATE · LOCAL TIME" value="MARCH 11, 2011" valueSize={62} note="2:46 PM · Japan Standard Time" opacity={date} color="#ffffff" />
        <Card x={620} y={1020} w={400} label="MAGNITUDE · USGS" value="9.1" valueSize={110} opacity={date} />
        <Card x={60} y={1020} w={960} label="TSUNAMI RUN-UP · USGS" value="30+ METERS" valueSize={96} note="In places · USGS lists 37.9 m at Miyako" opacity={runup} color="#7FDBFF" />
        <Card x={60} y={1020} w={960} label="EARTHQUAKE AND TSUNAMI" value="15,000+ LIVES LOST" valueSize={74} note="Thousands more were missing · Source: USGS" opacity={lives} color="#cfd6e4" />
        <Card x={60} y={1020} w={960} label="JAPAN METEOROLOGICAL AGENCY" value="WARNINGS REWORKED" valueSize={74} note="Revised tsunami warning system in service March 2013" opacity={warning} color="#7FDBFF" />
        <Card x={60} y={1020} w={960} label="TSUNAMI SAFETY" value="SHAKING = WARNING" valueSize={80} note="Near the coast, move to high ground without waiting" opacity={lesson} color="#ffffff" />
      </svg>
      <HistoricTitle lines={[ 'JAPAN 2011', 'EARTHQUAKE & TSUNAMI' ]} size={92} opacity={vis( t, 0.15, b.date.start + 0.2, 0.5 )} />
      <HistoricTag number={2} opacity={vis( t, b.date.start + 0.4, b.cta.start - 1, 0.6 )} />
    </>
  );
};

export const HistoricJapan2011 = makeEduShort( {
  id: 'japan2011',
  meta: HISTORIC.japan2011,
  Visuals,
  cues: b => [
    { sfx: 'riser', at: b.hook.start + 0.2, dur: 2.2, volume: 0.22 },
    { sfx: 'boom', at: b.hook.start + 1.2, dur: 3, volume: 0.5 },
    { sfx: 'tick', at: at( b, 'date', 1.9 ), dur: 0.3, volume: 0.4 },
    { sfx: 'whoosh', at: at( b, 'plates', -0.2 ), dur: 1.4, volume: 0.3 },
    { sfx: 'rumble', at: at( b, 'lock', 0 ), dur: 6, volume: s => 0.2 * Math.min( 1, s ) * ( 1 - smooth( ( s - 4.5 ) / 1.4 ) ) },
    { sfx: 'boom', at: within( b, 'slip', 0.45 ), dur: 3, volume: 0.65 },
    { sfx: 'rumble', at: within( b, 'slip', 0.45 ), dur: 6, volume: s => 0.45 * Math.exp( -s / 2 ) },
    { sfx: 'whoosh', at: b.wave.end - 0.2, dur: 1.4, volume: 0.35 },
    { sfx: 'tick', at: b.wave.end + 2.1, dur: 0.3, volume: 0.4 },
    { sfx: 'tick', at: at( b, 'fukushima', 0.4 ), dur: 0.3, volume: 0.4 },
    { sfx: 'tick', at: at( b, 'lesson', 0.3 ), dur: 0.3, volume: 0.4 }
  ]
} );
