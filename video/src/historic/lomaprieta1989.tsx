/**
 * Historic 05, "Loma Prieta 1989". The base composition only carries the audio, the Bay Area map that separates Oakland (Cypress Street Viaduct,
 * collapsed) from San Francisco (Embarcadero Freeway, damaged and closed, did not collapse), and the data cards; the cinematic experiment layers the
 * stills over it (experiments/loma-prieta-1989-cinematic/).
 * Facts: USGS (M6.9, 5:04 PM PDT on 1989-10-17, about 9 mi NE of Santa Cruz and 60 mi SE of San Francisco, 63 deaths, 3,757 injuries; Cypress Viaduct deaths are
 * 41 on the USGS page and 42 in Caltrans and NIST, so the narration says "more than forty"); Caltrans (Cypress Street Viaduct, Oakland, opened 1957, 0.7 mile of
 * the upper deck pancaked); San Francisco Embarcadero Freeway (damaged and closed, not collapsed; Board of Supervisors voted 6 to 5 to demolish, the vote date
 * is not stated here because sources conflict; demolition began February 27, 1991, per FHWA). Maps use Natural Earth 1:50m land; epicentre, city and
 * structure markers are approximate.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, Pill, S_COLOR, Txt, at, prog, vis, within } from '../edu/kit.js';
import { makeEduShort } from '../edu/EduShort.js';
import type { EpisodeVisuals } from '../edu/EduShort.js';
import { HISTORIC } from './episodes.js';
import { Card, Epicenter, HistoricTag, HistoricTitle, RegionMap } from './kit.js';
import type { MapTheme } from './kit.js';

type B = Parameters<EpisodeVisuals>[0]['b'];

const THEME: MapTheme = { ocean: '#0b1830', land: '#33384a', coast: '#ece2e2', rule: COLORS.rule };
const BOX = { w: -123.6, e: -120.6, s: 36.4, n: 38.4 };
const EPI: [ number, number ] = [ -121.88, 37.04 ];
const SF: [ number, number ] = [ -122.393, 37.795 ];
const OAK: [ number, number ] = [ -122.294, 37.808 ];
const SANTA_CRUZ: [ number, number ] = [ -122.03, 36.974 ];
const SF_COLOR = '#7FDBFF';
const OAK_COLOR = S_COLOR;

/** When the map is on screen: from just before the magnitude line to partway into the toll line (the Cypress picture takes over at "Oakland"). */
export const mapWindow = ( b: B ) => ( { from: b.mag.start - 0.3, to: b.toll.start + 1.7 } );

const BayMap: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const w = mapWindow( b );
  const o = vis( t, w.from, w.to, 0.4 );
  if ( o <= 0.01 ) {
    return null;
  }
  const rect = { x: 60, y: 330, w: 960, h: 660 };
  const pins = prog( t, within( b, 'mag', 0.55 ), 0.5 );
  const oak = prog( t, b.toll.start + 0.9, 0.4 );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <RegionMap id="bay" rect={rect} box={BOX} center={[ -122.25, 37.45 ]} zoom={26} theme={THEME} grid={1} detail="10m">
        {proj => {
          const [ ex, ey ] = proj( EPI[0], EPI[1] );
          const [ sx, sy ] = proj( SF[0], SF[1] );
          const [ ox, oy ] = proj( OAK[0], OAK[1] );
          const [ cx, cy ] = proj( SANTA_CRUZ[0], SANTA_CRUZ[1] );
          return (
            <>
              <circle cx={cx} cy={cy} r={7} fill="#fff" opacity={0.8} />
              <Txt x={cx - 16} y={cy + 10} size={24} anchor="end" weight={600} color={COLORS.textSupport}>Santa Cruz</Txt>
              <line x1={ex} y1={ey} x2={sx} y2={sy} stroke="#fff" strokeWidth={3} strokeDasharray="12 10" opacity={0.55 * pins} />
              <Epicenter x={ex} y={ey} t={t} opacity={prog( t, within( b, 'mag', 0.1 ), 0.5 )} />
              <Pill x={ex - 150} y={ey - 100} text="EPICENTER · USGS" color={COLORS.redHot} size={24} opacity={prog( t, within( b, 'mag', 0.2 ), 0.5 )} />
              <Pill x={ex - 150} y={ey - 48} text="ABOUT 60 MI FROM SF" color="#ffffff" size={22} opacity={pins} />
              <circle cx={sx} cy={sy} r={9} fill={SF_COLOR} stroke="#fff" strokeWidth={3} opacity={pins} />
              <circle cx={ox} cy={oy} r={9} fill={OAK_COLOR} stroke="#fff" strokeWidth={3} opacity={oak} />
              <Pill x={350} y={sy + 70} text="SAN FRANCISCO · EMBARCADERO FREEWAY" color={SF_COLOR} size={22} opacity={pins} />
              <Pill x={ox + 150} y={oy - 80} text="OAKLAND · CYPRESS VIADUCT" color={OAK_COLOR} size={22} opacity={oak} />
            </>
          );
        }}
      </RegionMap>
    </div>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const w = mapWindow( b );
  return (
    <>
      <Backdrop accent="#2a1a14" grid={false} />
      <BayMap t={t} b={b} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Card x={60} y={1020} w={470} label="MAGNITUDE · USGS" value="6.9" valueSize={110} note="5:04 PM · Oct 17, 1989" opacity={vis( t, w.from + 0.4, b.toll.start + 0.3, 0.4 )} />
        <Card x={550} y={1020} w={470} label="DEAD · USGS" value="63" valueSize={110} note="Across Northern California" opacity={vis( t, b.toll.start - 0.1, w.to, 0.4 )} color="#ffffff" />
      </svg>
      <HistoricTitle lines={[ 'LOMA PRIETA 1989', 'EARTHQUAKE' ]} size={88} opacity={vis( t, 0.15, b.plan.end, 0.5 )} />
      <HistoricTag number={5} opacity={vis( t, b.date.start + 0.4, b.cta.start - 1, 0.6 )} />
    </>
  );
};

export const HistoricLomaPrieta1989 = makeEduShort( {
  id: 'lomaprieta1989',
  meta: HISTORIC.lomaprieta1989,
  Visuals,
  cues: b => [
    { sfx: 'riser', at: b.hook.start + 0.2, dur: 2.2, volume: 0.2 },
    { sfx: 'tick', at: at( b, 'date', 2.2 ), dur: 0.3, volume: 0.4 },
    { sfx: 'rumble', at: b.mag.start - 0.1, dur: 3.2, volume: s => 0.16 * Math.min( 1, s / 0.4 ) * ( 1 - Math.min( 1, Math.max( 0, ( s - 2.2 ) / 1.0 ) ) ) },
    { sfx: 'tick', at: at( b, 'mag', 0.6 ), dur: 0.3, volume: 0.35 },
    { sfx: 'tick', at: at( b, 'toll', 0.1 ), dur: 0.3, volume: 0.35 },
    { sfx: 'tick', at: at( b, 'vote', 0.3 ), dur: 0.3, volume: 0.4 },
    { sfx: 'boom', at: b.demo.start + 0.2, dur: 3, volume: 0.32 },
    { sfx: 'whoosh', at: at( b, 'after', 0.9 ), dur: 1.4, volume: 0.22 },
    { sfx: 'tick', at: at( b, 'central', 0.3 ), dur: 0.3, volume: 0.35 }
  ]
} );
