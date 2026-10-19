/**
 * Episode 04, "What Is the Ring of Fire?": a Pacific-centred Equal Earth map (Natural Earth land, USGS M8+ catalogue
 * since 1900 as dots, a simplified belt along the trenches and arcs) with a schematic subduction cross-section that
 * slides in below it: slab sinking, locked megathrust and sudden slip, water release, melt and a volcano. The map then
 * returns for the magnitude-9 events and for what is NOT part of the ring (Hawaii's hotspot, the Himalayan collision).
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, HOT, HookTitle, P_COLOR, Pill, S_COLOR, Txt, at, clamp, f1, lerp, prog, smooth, span, vis, within } from './kit.js';
import { SeriesTag, makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';
import { BELT_PATH, LAND_PATH, VOLCANOES, project } from './ringmap.js';
import { M8_EVENTS } from './ep04data.js';

type B = Parameters<EpisodeVisuals>[0]['b'];

const MAP_TOP = 330;
const Z = 0.78;
const C = project( 187, 3 );
const LAND = '#2a3442';
const OCEAN = '#0A1D31';
const COAST = '#B4CDE6';

/** Height of the map window: tall normally, short while the cross-section is on screen. */
const mapH = ( t: number, b: B ) => lerp( 960, 560, prog( t, b.subduction.start - 0.3, 0.8 ) - prog( t, b.volcanoes.end + 0.2, 0.8 ) );
const screen = ( lon: number, lat: number, h: number ): [ number, number ] => {
  const [ x, y ] = project( lon, lat );
  return [ 540 + ( x - C[0] ) * Z, MAP_TOP + h / 2 + ( y - C[1] ) * Z ];
};

const MapLayer: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const h = mapH( t, b );
  const reveal = prog( t, b.hook.start + 0.8, 3.2 );
  const o = prog( t, 0.1, 0.8 );
  const flow = prog( t, b.subduction.start, 0.6 ) * ( 1 - prog( t, b.volcanoes.end, 0.6 ) );
  const sweep = prog( t, b.stat.start + 0.2, 4.2 );
  const shown = Math.floor( sweep * M8_EVENTS.length );
  const volcO = prog( t, b.volcanoes.start, 0.8 );
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0, opacity: o }}>
      <clipPath id="mapclip"><rect x={60} y={MAP_TOP} width={960} height={h} rx={16} /></clipPath>
      <rect x={60} y={MAP_TOP} width={960} height={h} rx={16} fill={OCEAN} stroke={COLORS.rule} strokeWidth={3} />
      <g clipPath="url(#mapclip)">
        <g transform={`translate(540 ${f1( MAP_TOP + h / 2 )}) scale(${Z}) translate(${f1( -C[0] )} ${f1( -C[1] )})`}>
          <path d={LAND_PATH} fill={LAND} stroke={COAST} strokeWidth={1.4 / Z} strokeOpacity={0.55} strokeLinejoin="round" />
          <path d={BELT_PATH} fill="none" stroke={HOT} strokeWidth={16 / Z} strokeOpacity={0.22} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - reveal} />
          <path d={BELT_PATH} fill="none" stroke="#ff7a59" strokeWidth={5 / Z} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - reveal} />
          <path d={BELT_PATH} fill="none" stroke="#fff" strokeWidth={5 / Z} strokeLinecap="round" pathLength={1} strokeDasharray="0.012 0.05" strokeDashoffset={-t * 0.06} opacity={flow * 0.9} />
          {M8_EVENTS.slice( 0, shown ).map( ( [ , la, lo, m ], i ) => {
            const [ x, y ] = project( lo, la );
            const fresh = i === shown - 1 ? 1 : 0;
            return <circle key={i} cx={x} cy={y} r={( 3 + ( m - 8 ) * 9 + fresh * 4 ) / Z} fill={m >= 9 ? '#fff' : S_COLOR} fillOpacity={0.55} stroke={m >= 9 ? '#fff' : S_COLOR} strokeWidth={1.5 / Z} />;
          } )}
          {VOLCANOES.map( ( [ lo, la ], i ) => {
            const [ x, y ] = project( lo, la );
            const k = prog( t, within( b, 'volcanoes', 0.1 + i * 0.03 ), 0.4 ) * volcO;
            const s = 11 / Z;
            return <path key={i} d={`M${f1( x - s )},${f1( y + s * 0.8 )} L${f1( x )},${f1( y - s )} L${f1( x + s )},${f1( y + s * 0.8 )} Z`} fill="#ff9a3c" stroke="#fff" strokeWidth={1.5 / Z} opacity={k} />;
          } )}
        </g>
      </g>
    </svg>
  );
};

/** Screen-space labels over the map. */
const MapLabels: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const h = mapH( t, b );
  const hw = ( text: string, size: number ) => ( text.length * size * 0.66 + 52 ) / 2;
  const pl = ( lon: number, lat: number, text: string, from: string, to: string, color: string, dx = 0, dy = 0, size = 30 ) => {
    const [ x, y ] = screen( lon, lat, h );
    return <Pill key={text} x={Math.min( 1000 - hw( text, size ), Math.max( 80 + hw( text, size ), x + dx ) )} y={y + dy} text={text} color={color} size={size} opacity={span( t, b, from, to ) * prog( t, at( b, from, 0.1 ), 0.4 )} />;
  };
  const stat = span( t, b, 'stat', 'plates' );
  const yr = Math.min( 2026, Math.round( 1900 + prog( t, b.stat.start + 0.2, 4.2 ) * 126 ) );
  const mapBottom = MAP_TOP + h;
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <g opacity={stat}>
        <Txt x={540} y={mapBottom - 120} size={150} display weight={800} spacing={2} color={COLORS.text}>{Math.floor( prog( t, b.stat.start + 0.2, 4.2 ) * M8_EVENTS.length )}</Txt>
        <Txt x={540} y={mapBottom - 62} size={38} color={COLORS.text}>earthquakes of magnitude 8 or greater</Txt>
        <Txt x={540} y={mapBottom - 20} size={30} color={COLORS.textSupport}>Dots: every M8+ since 1900 · {yr} · USGS</Txt>
      </g>
      {pl( -145, 0, 'PACIFIC PLATE', 'plates', 'subduction', P_COLOR )}
      {pl( -92, -18, 'NAZCA', 'plates', 'subduction', P_COLOR, 0, 40 )}
      {pl( -100, 45, 'NORTH AMERICAN', 'plates', 'subduction', P_COLOR )}
      {pl( 133, 17, 'PHILIPPINE SEA', 'plates', 'subduction', P_COLOR, 0, 30 )}
      {pl( 135, -24, 'AUSTRALIAN', 'plates', 'subduction', P_COLOR )}
      {pl( -73.4, -38.1, 'CHILE 1960 · M9.5', 'places', 'notall', '#ffffff', -150, 60 )}
      {pl( -147.3, 60.9, 'ALASKA 1964 · M9.2', 'places', 'notall', '#ffffff', 120, -75 )}
      {pl( 159.8, 52.6, 'KAMCHATKA 1952 · M9.0', 'places', 'notall', '#ffffff', -110, -75 )}
      {pl( 142.4, 38.3, 'JAPAN 2011 · M9.1', 'places', 'notall', '#ffffff', -40, 110 )}
      {pl( -155.5, 19.6, 'HAWAII · HOTSPOT', 'notall', 'end', S_COLOR, 0, 70 )}
      {pl( 86, 28, 'HIMALAYAS · COLLISION', 'notall', 'end', S_COLOR, 60, -80 )}
      <Txt x={1000} y={MAP_TOP + 40} size={30} anchor="end" color={COLORS.textSupport} opacity={prog( t, 1.5 ) * span( t, b, 'hook', 'subduction' )}>Simplified belt</Txt>
    </svg>
  );
};

/** Pulsing rings on the four magnitude-9 epicentres and on non-ring markers. */
const Pulses: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const h = mapH( t, b );
  const pts: [ number, number, string, string, string ][] = [
    [ -73.41, -38.14, '#fff', 'places', 'notall' ], [ -147.34, 60.91, '#fff', 'places', 'notall' ], [ 159.78, 52.62, '#fff', 'places', 'notall' ], [ 142.37, 38.3, '#fff', 'places', 'notall' ],
    [ -155.5, 19.6, S_COLOR, 'notall', 'end' ], [ 86, 28, S_COLOR, 'notall', 'end' ]
  ];
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      {pts.map( ( [ lo, la, c, from, to ], i ) => {
        const [ x, y ] = screen( lo, la, h );
        const o = span( t, b, from, to );
        const ph = ( t * 0.9 + i * 0.3 ) % 1;
        return <g key={i} opacity={o}><circle cx={x} cy={y} r={10 + ph * 50} fill="none" stroke={c} strokeWidth={4} opacity={1 - ph} /><circle cx={x} cy={y} r={9} fill={c} stroke="#070b14" strokeWidth={3} /></g>;
      } )}
    </svg>
  );
};

// ---------- subduction cross-section ----------

const OY = 40;
const slabTop = ( x: number ) => ( x < 400 ? 150 + OY : 150 + OY + ( x - 400 ) * 0.36 );
const SLAB_DIR = Math.atan2( 0.36, 1 );

const Section: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = span( t, b, 'subduction', 'places', 0.5 ) * ( 1 - prog( t, b.places.start - 0.2, 0.4 ) );
  if ( o <= 0.01 ) {
    return null;
  }
  const lock = prog( t, at( b, 'quakes', 0.2 ), 0.6 );
  const stress = clamp( ( t - at( b, 'quakes', 0.5 ) ) / ( ( b.quakes.end - b.quakes.start ) * 0.55 ) ) * lock;
  const ruptureAt = within( b, 'quakes', 0.72 );
  const tr = t - ruptureAt;
  const burst = tr > 0 && tr < 1.8 ? 1 - tr / 1.8 : 0;
  const jolt = tr > 0 && tr < 1.2 ? Math.sin( tr * 50 ) * 7 * ( 1 - tr / 1.2 ) : 0;
  const afterRupture = tr > 0 ? smooth( tr / 0.4 ) : 0;
  const stressColor = `rgb(${Math.round( lerp( 242, 255, stress ) )}, ${Math.round( lerp( 169, 59, stress ) )}, ${Math.round( lerp( 0, 48, stress ) )})`;
  const water = prog( t, within( b, 'volcanoes', 0.1 ), 0.5 );
  const melt = prog( t, within( b, 'volcanoes', 0.35 ), 0.5 );
  const erupt = prog( t, within( b, 'volcanoes', 0.75 ), 0.8 ) * ( 0.7 + 0.3 * Math.sin( t * 9 ) );
  const labelSub = prog( t, at( b, 'subduction', 1.2 ), 0.5 );
  const slabPts = `0,${150 + OY - 20} 400,${150 + OY} 900,${150 + OY + 180} 900,${150 + OY + 180 + 40} 400,${150 + OY + 40} 0,${150 + OY + 20}`;
  const slabDx = ( t * 30 ) % 40;
  const wedge = `400,${150 + OY} 470,${70 + OY} 900,${50 + OY} 900,${150 + OY + 180}`;
  const blobs = Array.from( { length: 5 }, ( _, i ) => {
    const p = ( ( t * 0.35 + i / 5 ) % 1 );
    return { x: lerp( 720, 800, p ) + 10 * Math.sin( p * 9 + i ), y: lerp( 150 + OY + 120, 60 + OY, p ) };
  } );
  const drops = Array.from( { length: 6 }, ( _, i ) => {
    const p = ( ( t * 0.5 + i / 6 ) % 1 );
    return { x: 640 + i * 12 + 8 * Math.sin( p * 8 ), y: lerp( slabTop( 640 ) + 14, slabTop( 640 ) - 90, p ), a: 1 - p };
  } );
  return (
    <g opacity={o} transform="translate(90 910)">
      <clipPath id="sec"><rect x={0} y={0} width={900} height={370} rx={16} /></clipPath>
      <rect x={0} y={0} width={900} height={370} rx={16} fill="#24182b" stroke={COLORS.rule} strokeWidth={3} />
      <g clipPath="url(#sec)">
        <rect x={0} y={OY + 20} width={400} height={30} fill="#0d3a5e" opacity={0.0} />
        <rect x={0} y={OY + 30} width={470} height={150 + OY} fill="#0d3a5e" opacity={0.85} transform={`translate(0 ${-10 + jolt * 0})`} />
        <g transform={`translate(${f1( jolt * afterRupture )} 0)`}>
          <polygon points={wedge} fill="#4f4547" stroke="#cdbfa0" strokeWidth={3} />
        </g>
        <polygon points={slabPts} fill="#3a5a7a" stroke="#9fc4ea" strokeWidth={3} />
        {Array.from( { length: 24 }, ( _, i ) => {
          const x = -40 + i * 40 + slabDx;
          const y = slabTop( Math.max( 0, x ) ) + 20;
          return x > 0 && x < 900 ? <circle key={i} cx={x} cy={y} r={4} fill="#cfe6ff" opacity={0.55} /> : null;
        } )}
        <line x1={400} y1={150 + OY} x2={580} y2={slabTop( 580 )} stroke={stressColor} strokeWidth={12} opacity={lock * ( 1 - afterRupture * 0.8 )} strokeLinecap="round" />
        {burst > 0 ? <circle cx={480} cy={slabTop( 480 )} r={30 + ( 1 - burst ) * 190} fill="none" stroke="#fff" strokeWidth={8 * burst} opacity={burst} /> : null}
        {/* water released */}
        {drops.map( ( d, i ) => <circle key={i} cx={d.x} cy={d.y} r={5} fill="#7FDBFF" opacity={water * d.a} /> )}
        {/* melt */}
        <path d={`M${720},${150 + OY + 120} Q760,${130 + OY} 800,${60 + OY}`} stroke="#ff7a3c" strokeWidth={8} fill="none" opacity={0.35 * melt} strokeLinecap="round" />
        {blobs.map( ( p, i ) => <circle key={i} cx={p.x} cy={p.y} r={9} fill="#ff7a3c" opacity={melt} /> )}
        {/* volcano */}
        <polygon points={`755,${50 + OY} 800,${OY - 14} 845,${50 + OY}`} fill="#3d3434" stroke="#cdbfa0" strokeWidth={3} />
        <circle cx={800} cy={OY - 26} r={30 + 24 * erupt} fill="#ff6a2c" opacity={0.55 * erupt} />
        <circle cx={800} cy={OY - 30} r={14 + 10 * erupt} fill="#ffd27a" opacity={erupt} />
        <g transform={`translate(${f1( 90 + 80 * clamp( t - at( b, 'subduction', 0 ) ) * 0 )} 0)`}>
          <path d={`M30,${OY + 8} h120 l-22,-18 m22,18 l-22,18`} fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={labelSub} transform={`translate(${f1( ( t * 20 ) % 30 )} 0)`} />
        </g>
      </g>
      <Pill x={170} y={302} text="OCEANIC PLATE" color={P_COLOR} size={30} opacity={prog( t, at( b, 'subduction', 0.4 ), 0.4 )} />
      <Pill x={480} y={50} text="SUBDUCTION" color="#ffffff" size={32} opacity={labelSub} />
      <Pill x={300} y={95} text="LOCKED" color={stressColor} size={30} opacity={lock * ( 1 - afterRupture )} />
      <Pill x={320} y={95} text="SUDDEN SLIP" color={HOT} size={30} opacity={afterRupture * ( 1 - prog( t, b.volcanoes.start, 0.4 ) )} />
      <Pill x={620} y={338} text="WATER RELEASED" color="#7FDBFF" size={28} opacity={water * ( 1 - 0 )} />
      <Pill x={720} y={178} text="MELT RISES" color="#ff7a3c" size={28} opacity={melt} />
      <Txt x={450} y={366} size={30} color={COLORS.textSupport} opacity={0.0}>Schematic</Txt>
    </g>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const namePill = vis( t, b.name.start + 0.1, b.stat.start + 0.2, 0.3 );
  return (
    <>
      <Backdrop accent="#3a1a1a" grid={false} />
      <MapLayer t={t} b={b} />
      <Pulses t={t} b={b} />
      <MapLabels t={t} b={b} />
      <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Section t={t} b={b} />
        <g opacity={namePill}>
          <rect x={150} y={760} width={780} height={150} rx={16} fill="rgba(7,11,20,0.82)" stroke={HOT} strokeWidth={4} />
          <Txt x={540} y={866} size={96} display weight={800} spacing={4}>RING OF FIRE</Txt>
        </g>
        <Txt x={540} y={1318 + 0} size={30} color={COLORS.textSupport} opacity={0}>.</Txt>
      </svg>
      <HookTitle t={t} lines={[ 'WHAT IS THE', 'RING OF FIRE?' ]} until={b.name.start + 0.2} />
      <SeriesTag number={4} opacity={vis( t, b.name.start + 0.4, b.cta.start - 1, 0.6 )} />
    </>
  );
};

export const RingOfFire = makeEduShort( {
  id: 'ring',
  Visuals,
  cues: b => [
    { sfx: 'riser', at: b.hook.start + 0.5, dur: 2.2, volume: 0.22 },
    { sfx: 'whoosh', at: b.hook.start + 0.9, dur: 1.4, volume: 0.35 },
    { sfx: 'boom', at: b.name.start, dur: 3, volume: 0.5 },
    ...Array.from( { length: 10 }, ( _, i ) => ( { sfx: 'tick' as const, at: at( b, 'stat', 0.4 + i * 0.4 ), dur: 0.3, volume: 0.25 } ) ),
    { sfx: 'whoosh', at: at( b, 'plates', 0 ), dur: 1.4, volume: 0.25 },
    { sfx: 'whoosh', at: at( b, 'subduction', -0.2 ), dur: 1.4, volume: 0.35 },
    { sfx: 'rumble', at: at( b, 'subduction', 0.3 ), dur: 6, volume: s => 0.22 * Math.min( 1, s ) * ( 1 - smooth( ( s - 4.5 ) / 1.4 ) ) },
    { sfx: 'boom', at: within( b, 'quakes', 0.72 ), dur: 3, volume: 0.6 },
    { sfx: 'rumble', at: within( b, 'quakes', 0.72 ), dur: 5, volume: s => 0.45 * Math.exp( -s / 1.8 ) },
    { sfx: 'riser', at: within( b, 'volcanoes', 0.4 ), dur: 2.2, volume: 0.2 },
    { sfx: 'rumble', at: within( b, 'volcanoes', 0.75 ), dur: 4, volume: s => 0.3 * Math.exp( -s / 2 ) },
    { sfx: 'whoosh', at: at( b, 'places', 0 ), dur: 1.4, volume: 0.3 },
    ...[ 0.2, 0.4, 0.6, 0.8 ].map( f => ( { sfx: 'boom' as const, at: within( b, 'places', f ), dur: 3, volume: 0.25 } ) ),
    { sfx: 'tick', at: at( b, 'notall', 1.2 ), dur: 0.3, volume: 0.5 },
    { sfx: 'tick', at: within( b, 'notall', 0.6 ), dur: 0.3, volume: 0.5 }
  ]
} );
void P_COLOR;
