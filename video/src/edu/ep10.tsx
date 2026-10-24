/**
 * Episode 10 (prototype), "Where Will the Next Big One Hit?". Claims and sources: ep10claims.ts.
 * One West Coast map zooms from the whole coast to the Bay Area (faults light up), north to Cascadia (the subduction zone lights up),
 * then back out to two separate highlighted regions with a hypothetical "both?" question. The fault traces are schematic and labelled
 * as such. The two probabilities are shown side by side with their different windows and are never compared or combined.
 */
import { COLORS } from '../design/tokens.js';
import { RegionMap } from '../historic/kit.js';
import { Backdrop, HOT, Pill, Txt, f1, lerp, prog, vis } from './kit.js';
import { CTA_LINE, plan } from './episodes.js';
import type { EpisodeMeta } from './episodes.js';
import { makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';
import { Layer, Pop } from './octShared.js';

export const NEXT_BIG_ONE: EpisodeMeta = {
  id: 'nextbigone', number: 10, compositionId: 'WhereWillTheNextBigOneHitFull', title: 'Where Will the Next Big One Hit?', baseSeconds: 40, tailSeconds: 1.2,
  script: plan( [
    { id: 'hook', text: 'Could two massive earthquakes strike America’s West Coast close together in time?', gap: 0.35 },
    { id: 'two', text: 'Two regions stand out.', gap: 0.3 },
    { id: 'bay', gap: 0.3, text: 'First, the Bay Area, where the San Andreas is one of many faults.' },
    { id: 'bayperiod', gap: 0.3, text: 'A USGS outlook covers twenty fourteen to twenty forty-three.' },
    { id: 'baystat', gap: 0.3, text: 'Its odds of a magnitude six point seven or larger quake in the region: over seventy percent.' },
    { id: 'north', text: 'Now north: the Cascadia Subduction Zone.', gap: 0.4 },
    { id: 'cas', gap: 0.3, text: 'Its last giant earthquake, about magnitude nine, was in seventeen hundred.' },
    { id: 'casstat', gap: 0.3, text: 'USGS: ten to fifteen percent odds of another, about magnitude nine, in fifty years.' },
    { id: 'notsame', gap: 0.3, text: 'Different faults, different windows. Not comparable.' },
    { id: 'both', gap: 0.3, text: 'So, could both happen close together?' },
    { id: 'answer', gap: 0.3, text: 'No official forecast says so. It’s just a question.' },
    { id: 'end', text: 'We can’t predict the next big one. But these are two major threats.', gap: 0.5 },
    CTA_LINE
  ], 0.3 )
};

const AMBER = '#F2A900';
const CYAN = '#7FDBFF';
const MAP = { x: 40, y: 250, w: 1000, h: 1060 };
const BOX = { w: -140, e: -105, s: 28, n: 54 };

type LL = [ number, number ];
/** Schematic traces, [lon, lat]. Not survey data. */
const SAN_ANDREAS: LL[] = [ [ -120.5, 35.9 ], [ -121.5, 36.8 ], [ -122.4, 37.6 ], [ -123.1, 38.3 ], [ -123.7, 38.95 ], [ -124.3, 40.0 ], [ -124.4, 40.4 ] ];
const HAYWARD: LL[] = [ [ -121.85, 37.3 ], [ -121.97, 37.55 ], [ -122.2, 37.8 ], [ -122.3, 37.95 ], [ -122.45, 38.1 ], [ -122.55, 38.35 ], [ -122.7, 38.6 ] ];
const CALAVERAS: LL[] = [ [ -121.5, 36.9 ], [ -121.7, 37.3 ], [ -121.85, 37.6 ], [ -121.95, 37.85 ] ];
const CASCADIA: LL[] = [ [ -124.6, 40.4 ], [ -125.1, 42 ], [ -125.3, 44 ], [ -125.3, 46 ], [ -125.5, 47.5 ], [ -126.6, 48.5 ], [ -127.7, 49.5 ] ];
const SF: LL = [ -122.42, 37.77 ];
const SEATTLE: LL = [ -122.33, 47.6 ];

const line = ( proj: ( lo: number, la: number ) => [ number, number ], pts: LL[] ) => `M${pts.map( ( [ lo, la ] ) => proj( lo, la ).map( f1 ).join( ',' ) ).join( 'L' )}`;

const CoastMap: React.FC<{ t: number; b: Parameters<EpisodeVisuals>[0]['b'] }> = ( { t, b } ) => {
  const toBay = prog( t, b.two.start + 0.2, 1.4 );
  const toNorth = prog( t, b.north.start - 0.2, 1.8 );
  const toAll = prog( t, b.both.start - 0.3, 1.6 );
  const zoom = lerp( lerp( lerp( 2.5, 7.0, toBay ), 5.0, toNorth ), 2.5, toAll );
  const center: LL = [
    lerp( lerp( lerp( -123.5, -122.3, toBay ), -124.0, toNorth ), -123.5, toAll ),
    lerp( lerp( lerp( 41.2, 37.8, toBay ), 45.5, toNorth ), 41.2, toAll )
  ];
  const drawBay = prog( t, b.bay.start + 0.3, 1.4 );
  const drawCas = prog( t, b.cas.start - 0.5, 1.8 );
  const pulse = 0.65 + 0.35 * Math.sin( t * 6 );
  const bothGlow = prog( t, b.both.start, 0.6 );
  const hookShake = t < 1.2 ? Math.sin( t * 70 ) * 8 * ( 1 - t / 1.2 ) : 0;
  const o = vis( t, -1, b.end.end + 0.6, 0.5 );
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o, transform: `translate(${f1( hookShake )}px, 0)` }}>
      <RegionMap id="wc" rect={MAP} box={BOX} center={center} zoom={zoom} grid={5}>
        {proj => {
          const [ sfx, sfy ] = proj( ...SF ), [ sx, sy ] = proj( ...SEATTLE );
          const glowA = drawBay * ( t > b.north.start ? 0.5 + 0.5 * ( 1 - toNorth ) : 1 );
                    return (
            <>
              <g opacity={prog( t, b.two.start, 0.4 ) * ( 1 - 0.8 * bothGlow )}>
                <path d={line( proj, SAN_ANDREAS )} fill="none" stroke={AMBER} strokeOpacity={0.12 + 0.5 * glowA} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.max( drawBay, 0.001 )} />
                <path d={line( proj, SAN_ANDREAS )} fill="none" stroke="#ffcf6b" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - drawBay} />
                {[ HAYWARD, CALAVERAS ].map( ( f, i ) => <path key={i} d={line( proj, f )} fill="none" stroke={HOT} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - prog( t, b.bay.start + 0.9 + i * 0.4, 1.0 )} opacity={0.5 + 0.5 * pulse} /> )}
              </g>
              <g opacity={1 - 0.8 * bothGlow}>
              <path d={line( proj, CASCADIA )} fill="none" stroke={CYAN} strokeOpacity={0.35 + 0.2 * pulse} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - drawCas} />
              <path d={line( proj, CASCADIA )} fill="none" stroke="#e7fbff" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - drawCas} />
              </g>
              {[ [ SF, 'SAN FRANCISCO', sfx, sfy, 1 ], [ SEATTLE, 'SEATTLE', sx, sy, 1 ] ].map( ( [ , name, x, y ] ) => (
                <g key={name as string}><circle cx={x as number} cy={y as number} r={9} fill="#fff" opacity={prog( t, b.two.start + 0.6, 0.5 )} /><Pill x={( x as number ) + 0} y={( y as number ) - 40} text={name as string} color="#fff" size={22} opacity={prog( t, b.two.start + 0.6, 0.5 ) * ( name === 'SAN FRANCISCO' ? 1 - 0.9 * toNorth * ( 1 - toAll ) : 1 - 0.9 * ( 1 - toNorth ) )} /></g>
              ) )}
              <Pill x={proj( -126.6, 45.2 )[0]} y={proj( -126.6, 45.2 )[1]} text="CASCADIA SUBDUCTION ZONE" color={CYAN} size={24} opacity={prog( t, b.cas.start, 0.5 ) * ( 1 - bothGlow )} />
              <g opacity={bothGlow}>
                <circle cx={sfx} cy={sfy} r={95 + 15 * pulse} fill="none" stroke={AMBER} strokeWidth={6} />
                <circle cx={sx} cy={sy + 60} r={170 + 20 * pulse} fill="none" stroke={CYAN} strokeWidth={6} />
                <Pill x={sfx} y={sfy + 150} text="BAY AREA" color={AMBER} size={30} />
                <Pill x={sx} y={sy + 290} text="CASCADIA" color={CYAN} size={30} />
                <Txt x={sfx + 190} y={( sfy + sy ) / 2 + 40} size={190} display weight={800} color={COLORS.text} opacity={0.95 * bothGlow}>?</Txt>
              </g>
            </>
          );
        }}
      </RegionMap>
    </div>
  );
};

const StatCard: React.FC<{ t: number; t0: number; t1: number; y: number; color: string; kicker: string; big: string; small: string; foot: string }> = ( { t, t0, t1, y, color, kicker, big, small, foot } ) => {
  const o = vis( t, t0 - 0.05, t1, 0.35 );
  return (
    <g opacity={o}>
      <Pop t={t} t0={t0} cx={540} cy={y + 120} from={1.5}>
        <rect x={72} y={y} width={936} height={250} rx={20} fill="rgba(7,11,20,0.94)" stroke={color} strokeWidth={6} />
        <Txt x={540} y={y + 52} size={30} display weight={800} spacing={6} color={color}>{kicker}</Txt>
        <Txt x={540} y={y + 150} size={104} display weight={800} color={COLORS.text}>{big}</Txt>
        <Txt x={540} y={y + 200} size={30} weight={700} color={COLORS.textSupport}>{small}</Txt>
        <Txt x={540} y={y + 235} size={22} weight={600} color={COLORS.textSupport} opacity={0.85}>{foot}</Txt>
      </Pop>
    </g>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const hook = vis( t, -1, b.two.start + 0.2, 0.3 );
  const hit = Math.max( 0, 1 - t / 0.5 );
  const split = vis( t, b.notsame.start, b.both.start - 0.1, 0.3 );
  const both = prog( t, b.answer.start, 0.4 );
  const end = prog( t, b.end.start, 0.3 );
  const hyp = vis( t, b.both.start, b.end.start + 0.4, 0.4 );
  return (
    <>
      <Backdrop accent={t < b.two.start ? '#4a1b1b' : '#12304a'} />
      <CoastMap t={t} b={b} />
      <Layer>
        <rect width={1080} height={1920} fill={HOT} opacity={0.4 * hit} />
        <g opacity={hook}>
          <Txt x={540} y={190} size={34} display weight={800} spacing={8} color={HOT}>EARTHQUAKE SCIENCE EXPLAINED</Txt>
          <Pop t={t} t0={0.05} cx={540} cy={460} from={1.7}>
            <rect x={60} y={300} width={960} height={330} rx={22} fill="rgba(7,11,20,0.82)" stroke={HOT} strokeWidth={8} />
            <Txt x={540} y={410} size={90} display weight={800} color={COLORS.text}>WHERE WILL</Txt>
            <Txt x={540} y={500} size={90} display weight={800} color={COLORS.text}>THE NEXT</Txt>
            <Txt x={540} y={605} size={118} display weight={800} color={HOT}>BIG ONE HIT?</Txt>
          </Pop>
        </g>
        <StatCard t={t} t0={b.baystat.start + 0.2} t1={b.north.start - 0.2} y={1500} color={AMBER} kicker="BAY AREA · WHOLE FAULT SYSTEM" big="OVER 70%" small="≥ 1 quake of M6.7+ in 30 years" foot="USGS Bay Area earthquake outlook 2014–2043" />
        <StatCard t={t} t0={b.casstat.start + 0.2} t1={b.notsame.start - 0.1} y={1500} color={CYAN} kicker="CASCADIA SUBDUCTION ZONE" big="10–15%" small="≈ M9 earthquake in 50 years" foot="USGS Pacific Northwest fact sheet (2025)" />
        <g opacity={split}>
          <rect x={72} y={1500} width={936} height={250} rx={20} fill="rgba(7,11,20,0.94)" stroke={COLORS.text} strokeWidth={6} />
          <Txt x={300} y={1590} size={64} display weight={800} color={AMBER}>30 YEARS</Txt>
          <Txt x={300} y={1640} size={26} weight={700} color={COLORS.textSupport}>many faults · M6.7+</Txt>
          <Txt x={540} y={1625} size={96} display weight={800} color={HOT}>≠</Txt>
          <Txt x={780} y={1590} size={64} display weight={800} color={CYAN}>50 YEARS</Txt>
          <Txt x={780} y={1640} size={26} weight={700} color={COLORS.textSupport}>one megathrust · ≈M9</Txt>
          <Txt x={540} y={1720} size={26} weight={600} color={COLORS.textSupport}>Not directly comparable</Txt>
        </g>
        <g opacity={hyp}>
          <rect x={150} y={1500} width={780} height={100} rx={16} fill="rgba(7,11,20,0.94)" stroke={HOT} strokeWidth={5} />
          <Txt x={540} y={1566} size={44} display weight={800} spacing={4} color={HOT}>{both > 0.5 ? 'NOT A FORECAST' : 'HYPOTHETICAL QUESTION'}</Txt>
          <Txt x={540} y={1650} size={28} weight={600} color={COLORS.textSupport} opacity={both}>Two separate systems. No joint probability published.</Txt>
        </g>
        <g opacity={end}>
          <rect x={90} y={1700} width={900} height={110} rx={20} fill="rgba(7,11,20,0.95)" stroke={HOT} strokeWidth={6} />
          <Txt x={540} y={1775} size={52} display weight={800} spacing={3} color={COLORS.text}>WE CAN’T PREDICT THE BIG ONE</Txt>
        </g>
        <Txt x={540} y={1880} size={20} weight={600} color={COLORS.textSupport} opacity={0.7}>Fault traces schematic · Sources: USGS</Txt>
      </Layer>
    </>
  );
};

export const WhereWillTheNextBigOneHit = makeEduShort( {
  id: 'nextbigone',
  meta: NEXT_BIG_ONE,
  Visuals,
  cues: b => [
    { sfx: 'boom', at: 0.05, dur: 3, volume: 0.6 },
    { sfx: 'whoosh', at: b.bay.start - 0.2, dur: 1, volume: 0.3 },
    { sfx: 'rumble', at: b.baystat.start, dur: 4, volume: 0.3 },
    { sfx: 'whoosh', at: b.north.start - 0.2, dur: 1.2, volume: 0.35 },
    { sfx: 'riser', at: b.cas.start, dur: Math.max( 1, b.casstat.start - b.cas.start ), volume: 0.3 },
    { sfx: 'boom', at: b.both.start, dur: 3, volume: 0.45 },
    { sfx: 'tick', at: b.end.start, dur: 0.3, volume: 0.5 }
  ]
} );
