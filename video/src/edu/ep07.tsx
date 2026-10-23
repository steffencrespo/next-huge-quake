/**
 * Episode 07, "Can a Magnitude 10 Earthquake Actually Happen?" (published slot 2026-10-26). Claims and sources: octClaims.ts.
 * A 9.5 becomes a "10?", then a ring drawn to scale around Earth's circumference: the Chile 1960 fault (almost 1,000 miles, USGS)
 * against the "most of the planet" a magnitude 10 fault would have to extend (USGS FAQ). The red arc is illustrative.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, HOT, Pill, Txt, clamp, f1, prog, vis } from './kit.js';
import { CTA_LINE, plan } from './episodes.js';
import type { EpisodeMeta } from './episodes.js';
import { SeriesTag, makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';
import { CompactCta } from './ep06.js';
import { Layer, Pop, arcPath } from './octShared.js';

export const MAG10: EpisodeMeta = {
  id: 'mag10', number: 7, compositionId: 'MagnitudeTen', title: 'Can a Magnitude 10 Earthquake Actually Happen?', baseSeconds: 35, tailSeconds: 4.8,
  script: plan( [
    { id: 'hook', text: 'We’ve seen magnitude nine point five. But could Earth ever produce a ten?', gap: 0.45 },
    { id: 'short', text: 'Short answer: very unlikely. Here’s why.', gap: 0.4 },
    { id: 'size', text: 'Bigger earthquakes need longer faults.' },
    { id: 'chile', text: 'In Chile, in nineteen sixty, a fault almost a thousand miles long produced the largest earthquake ever recorded.' },
    { id: 'need', text: 'A magnitude ten would need a fault extending around most of the planet.' },
    { id: 'none', text: 'No fault that long is known to exist.', gap: 0.4 },
    { id: 'so', text: 'So a ten isn’t something scientists expect.', gap: 0.5 },
    { id: 'tie', text: 'Tomorrow, we revisit that nine point five: Chile, nineteen sixty.' },
    CTA_LINE
  ], 0.4 )
};

const AMBER = '#e0a43c';
const CX = 540, CY = 960, R = 260;
/** Chile 1960 fault, almost 1,000 miles, against Earth's circumference of about 24,900 miles. */
const CHILE_TURN = 1000 / 24901;

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const intro = vis( t, -1, b.size.start + 0.1, 0.35 );
  const bars = vis( t, b.size.start - 0.1, b.chile.start + 0.1, 0.35 );
  const ringO = vis( t, b.chile.start - 0.1, b.tie.start + 0.1, 0.4 );
  const tie = vis( t, b.tie.start - 0.1, 999, 0.35 );
  const chile = prog( t, b.chile.start + 0.5, 1.6 );
  const need = prog( t, b.need.start + 0.2, Math.max( 1.5, b.need.end - b.need.start - 0.2 ) );
  const none = prog( t, b.none.start, 0.3 );
  const so = prog( t, b.so.start, 0.3 );
  const pulse = 0.7 + 0.3 * Math.sin( t * 8 );
  const shake = t > b.hook.start + 2.2 && t < b.hook.start + 2.7 ? Math.sin( t * 80 ) * 8 : 0;
  return (
    <>
      <Backdrop accent="#3f1b2b" />
      <Layer>
        <rect width={1080} height={1920} fill={HOT} opacity={t < 0.5 ? 0.3 * ( 1 - t / 0.5 ) : 0} />
        <g opacity={intro} transform={`translate(${f1( shake )} 0)`}>
          <Txt x={540} y={520} size={60} display weight={800} spacing={14} color={HOT}>MAGNITUDE</Txt>
          <Txt x={270} y={940} size={300} display weight={800} color={COLORS.text}>9.5</Txt>
          <Txt x={535} y={910} size={120} display weight={800} color={COLORS.textSupport} opacity={prog( t, 1.6, 0.3 )}>→</Txt>
          <Pop t={t} t0={2.2} cx={800} cy={940} from={2.6}><Txt x={800} y={940} size={300} display weight={800} color={HOT}>10?</Txt></Pop>
          <Txt x={270} y={1010} size={36} weight={700} color={COLORS.textSupport}>LARGEST RECORDED</Txt>
        </g>
        <g opacity={bars}>
          <Txt x={540} y={480} size={64} display weight={800} spacing={8} color={COLORS.text}>LONGER FAULT, BIGGER QUAKE</Txt>
          {[ { y: 700, w: 240, label: 'SHORTER FAULT', sub: 'SMALLER EARTHQUAKE', c: '#7FDBFF' }, { y: 960, w: 560, label: 'LONGER FAULT', sub: 'BIGGER EARTHQUAKE', c: AMBER }, { y: 1220, w: 880, label: 'MUCH LONGER FAULT', sub: 'MUCH BIGGER EARTHQUAKE', c: HOT } ].map( ( r, i ) => {
            const k = prog( t, b.size.start + 0.2 + i * 0.5, 0.7 );
            return (
              <g key={r.y} opacity={clamp( k * 3 )}>
                <Txt x={100} y={r.y - 36} size={34} anchor="start" color={r.c} spacing={3}>{r.label}</Txt>
                <rect x={100} y={r.y - 10} width={r.w * k} height={46} rx={23} fill={r.c} />
                <Txt x={100} y={r.y + 100} size={32} anchor="start" color={COLORS.textSupport} opacity={k}>{r.sub}</Txt>
              </g>
            );
          } )}
          <Txt x={540} y={1450} size={28} weight={600} color={COLORS.textSupport}>Schematic · lengths not to scale</Txt>
        </g>
        <g opacity={ringO}>
          <circle cx={CX} cy={CY} r={R} fill="rgba(10,29,49,0.85)" stroke="#8fa3c7" strokeOpacity={0.45} strokeWidth={6} />
          <Txt x={CX} y={CY - 10} size={44} display weight={800} spacing={6} color={COLORS.textSupport}>EARTH</Txt>
          <Txt x={CX} y={CY + 40} size={28} weight={700} color={COLORS.textSupport}>circumference ≈ 24,900 mi</Txt>
          <path d={arcPath( CX, CY, R, 0, CHILE_TURN * chile )} stroke={AMBER} strokeWidth={26} strokeLinecap="round" fill="none" />
          <path d={arcPath( CX, CY, R, CHILE_TURN + 0.01, CHILE_TURN + 0.01 + 0.62 * need )} stroke={HOT} strokeWidth={22} strokeLinecap="round" strokeDasharray="4 30" fill="none" opacity={0.95} />
          <Pill x={CX + 150} y={CY - R - 70} text="CHILE 1960 · M9.5" color={AMBER} size={30} opacity={chile} />
          <Txt x={CX + 150} y={CY - R - 20} size={30} weight={700} color={AMBER} opacity={chile}>fault almost 1,000 mi (USGS)</Txt>
          <Pill x={CX - 130} y={CY + R + 50} text="A MAGNITUDE 10 FAULT" color={HOT} size={32} opacity={need} />
          <Txt x={CX - 130} y={CY + R + 98}  size={30} weight={700} color={COLORS.text} opacity={need}>would extend around most of the planet</Txt>
          <g opacity={none * ( t < b.so.start ? pulse : 1 )}>
            <Txt x={CX} y={440} size={56} display weight={800} color={HOT}>NO KNOWN FAULT THIS LONG</Txt>
          </g>
          <Txt x={CX} y={520} size={46} display weight={800} color={COLORS.text} opacity={so}>NOT EXPECTED</Txt>
          <Txt x={CX} y={CY + 105} size={24} weight={600} color={COLORS.textSupport}>Chile arc to scale · red arc illustrative</Txt>
        </g>
        <g opacity={tie}>
          <rect x={90} y={620} width={900} height={420} rx={22} fill="rgba(7,11,20,0.94)" stroke={AMBER} strokeWidth={8} />
          <Txt x={540} y={720} size={46} display weight={800} spacing={10} color={AMBER}>TOMORROW</Txt>
          <Txt x={540} y={850} size={100} display weight={800} color={COLORS.text}>CHILE 1960</Txt>
          <Txt x={540} y={940} size={60} display weight={800} color={HOT}>MAGNITUDE 9.5</Txt>
        </g>
      </Layer>
      <SeriesTag number={7} opacity={vis( t, b.size.start, b.tie.start, 0.5 )} />
    </>
  );
};

export const MagnitudeTen = makeEduShort( {
  id: 'mag10',
  meta: MAG10,
  Visuals,
  Cta: CompactCta,
  cues: b => [
    { sfx: 'riser', at: b.hook.start, dur: 2.2, volume: 0.3 },
    { sfx: 'boom', at: 2.2, dur: 3, volume: 0.5 },
    { sfx: 'whoosh', at: b.size.start - 0.1, dur: 1.2, volume: 0.3 },
    { sfx: 'whoosh', at: b.chile.start - 0.1, dur: 1.2, volume: 0.3 },
    { sfx: 'tick', at: b.chile.start + 0.5, dur: 0.3, volume: 0.5 },
    { sfx: 'riser', at: b.need.start, dur: Math.max( 1, b.need.end - b.need.start ), volume: 0.3 },
    { sfx: 'boom', at: b.none.start, dur: 3, volume: 0.4 },
    { sfx: 'tick', at: b.so.start, dur: 0.3, volume: 0.5 },
    { sfx: 'whoosh', at: b.tie.start - 0.1, dur: 1.2, volume: 0.3 }
  ]
} );
