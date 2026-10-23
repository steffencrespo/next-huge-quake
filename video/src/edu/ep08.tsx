/**
 * Episode 08, "SIX SEVEN vs FOUR TWO" (published slot 2026-10-28). Claims and sources: octClaims.ts.
 * A versus split slams in 6.7 and 4.2; the 4.2 shrinks to one dot and a grid of 5,600 dots fills the screen to show how many
 * magnitude 4.2 energies equal one 6.7. Deliberately different from "SIX SEVEN: Earthquake Edition" (Northridge, mountain lift, bouncing
 * numerals) and "Magnitude 6 vs 7" (logarithmic scale, shaking and damage): no real event, no scale lecture.
 */
import { COLORS, FONT } from '../design/tokens.js';
import { Backdrop, HOT, Txt, clamp, f1, lerp, prog, vis } from './kit.js';
import { plan } from './episodes.js';
import type { EpisodeMeta } from './episodes.js';
import { makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';
import { Layer, Pop } from './octShared.js';

export const VERSUS: EpisodeMeta = {
  id: 'versus', number: 8, compositionId: 'SixSevenVsFourTwo', title: 'SIX SEVEN vs FOUR TWO', baseSeconds: 20, tailSeconds: 2.6,
  script: plan( [
    { id: 'hook', text: 'Six seven versus four two!', gap: 0.5 },
    { id: 'which', text: 'Which one releases more energy?', gap: 0.35 },
    { id: 'ratio', text: 'Magnitude six point seven releases about fifty-six hundred times the seismic energy of a magnitude four point two.' },
    { id: 'match', text: 'You’d need about fifty-six hundred four-point-twos to equal one six-point-seven.', gap: 0.4 },
    { id: 'end', text: 'Just two and a half steps apart. Giant difference.', gap: 0 }
  ], 0.3 )
};

const AMBER = '#F2A900';
const CYAN = '#7FDBFF';
const COLS = 80, ROWS = 70, TOTAL = COLS * ROWS;
const GX = 100, GY = 470, STEP = 11;

const Visuals: EpisodeVisuals = ( { t, b } ) => {
  const slam = ( t0: number, from = 1.8 ) => Math.max( 1, lerp( from, 1, clamp( ( t - t0 ) / 0.18 ) ) );
  const versus = vis( t, -1, b.which.start + 0.5, 0.2 );
  const grid = prog( t, b.ratio.start + 0.2, 0.01 );
  const fill = Math.pow( clamp( ( t - ( b.ratio.start + 0.6 ) ) / Math.max( 2, b.match.start + 0.3 - ( b.ratio.start + 0.6 ) ) ), 2.2 );
  const n = Math.floor( TOTAL * fill );
  const count = Math.round( 5600 * fill ).toLocaleString( 'en-US' );
  const lit = prog( t, b.match.start + 0.3, 0.4 );
  const end = prog( t, b.end.start, 0.3 );
  const hit = t - b.ratio.start;
  const shake = hit > 0 && hit < 0.4 ? Math.sin( t * 85 ) * 10 * ( 1 - hit / 0.4 ) : 0;
  return (
    <>
      <Backdrop accent={t < b.ratio.start ? '#3f1b2b' : '#12304a'} />
      <Layer>
        <rect width={1080} height={1920} fill={HOT} opacity={t < 0.4 ? 0.35 * ( 1 - t / 0.4 ) : 0} />
        <g opacity={versus} transform={`translate(${f1( shake )} 0)`}>
          <g transform={`translate(${f1( lerp( -600, 0, prog( t, 0, 0.18 ) ) )} 0)`}>
            <Txt x={540} y={760} size={420} display weight={800} color={AMBER}>6.7</Txt>
          </g>
          <g transform={`translate(${f1( lerp( 600, 0, prog( t, 0.15, 0.18 ) ) )} 0)`}>
            <Txt x={540} y={1400} size={420} display weight={800} color={CYAN}>4.2</Txt>
          </g>
          <g opacity={prog( t, 0.4, 0.08 )} transform={`translate(540 1010) scale(${f1( slam( 0.4, 2.4 ) )}) rotate(${f1( Math.sin( t * 25 ) * 3 )}) translate(-540 -1010)`}>
            <rect x={300} y={920} width={480} height={150} rx={20} fill="rgba(7,11,20,0.95)" stroke={HOT} strokeWidth={8} />
            <Txt x={540} y={1030} size={110} display weight={800} color={COLORS.text}>VS</Txt>
          </g>
          <Txt x={540} y={480} size={50} display weight={800} spacing={12} color={COLORS.textSupport}>MAGNITUDE</Txt>
          <Txt x={540} y={1480} size={40} weight={700} color={CYAN} opacity={prog( t, b.which.start, 0.3 )}>which releases more energy?</Txt>
        </g>
        {grid > 0.5 ? (
          <g transform={`translate(${f1( shake )} 0)`}>
            <Txt x={540} y={290} size={56} display weight={800} spacing={6} color={CYAN}>EACH DOT = ONE MAGNITUDE 4.2</Txt>
            {Array.from( { length: n }, ( _, i ) => {
              const c = i % COLS, r = Math.floor( i / COLS );
              return <circle key={i} cx={GX + c * STEP + STEP / 2} cy={GY + r * STEP + STEP / 2} r={3.7} fill={lit > 0.5 ? AMBER : CYAN} opacity={lit > 0.5 ? 0.95 : 0.85} />;
            } )}
            <rect x={GX - 8} y={GY - 8} width={COLS * STEP + 16} height={ROWS * STEP + 16} rx={12} fill="none" stroke={AMBER} strokeWidth={8} opacity={lit} />
            <Txt x={540} y={425} size={110} display weight={800} color={COLORS.text}>{`× ${ count }`}</Txt>
            <Pop t={t} t0={b.match.start + 0.3} cx={540} cy={1320} from={1.5}><Txt x={540} y={1325} size={52} display weight={800} spacing={4} color={AMBER}>= ONE MAGNITUDE 6.7</Txt></Pop>
            <Txt x={540} y={1365} size={24} weight={600} color={COLORS.textSupport} opacity={prog( t, b.ratio.end, 0.4 )}>Energy ratio ≈ 10^(1.5 × 2.5) ≈ 5,600 · about 32× per whole step (USGS)</Txt>
          </g>
        ) : null}
        <g opacity={end}>
          <rect x={90} y={1700} width={900} height={110} rx={20} fill="rgba(7,11,20,0.95)" stroke={HOT} strokeWidth={6} />
          <text x={540} y={1775} textAnchor="middle" fontFamily={FONT.display} fontWeight={800} fontSize={60} letterSpacing={4} fill={COLORS.text}>2.5 STEPS = GIANT DIFFERENCE</text>
        </g>
      </Layer>
    </>
  );
};

export const SixSevenVsFourTwo = makeEduShort( {
  id: 'versus',
  meta: VERSUS,
  Visuals,
  Cta: () => null,
  cues: b => [
    ...[ 0, 0.2 ].map( s => ( { sfx: 'tick' as const, at: s, dur: 0.25, volume: 0.5 } ) ),
    { sfx: 'boom', at: 0.4, dur: 3, volume: 0.55 },
    { sfx: 'whoosh', at: b.which.start - 0.1, dur: 1, volume: 0.3 },
    { sfx: 'boom', at: b.ratio.start, dur: 3, volume: 0.5 },
    { sfx: 'riser', at: b.ratio.start + 0.6, dur: Math.max( 1, b.match.start - b.ratio.start - 0.3 ), volume: 0.35 },
    { sfx: 'boom', at: b.match.start + 0.3, dur: 3, volume: 0.6 },
    { sfx: 'tick', at: b.end.start, dur: 0.3, volume: 0.5 }
  ]
} );
