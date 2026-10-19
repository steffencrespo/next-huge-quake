/**
 * Episode 02, "Why Can't We Predict Earthquakes?": a seismogram that keeps scrolling with no reliable warning in it,
 * the three things a prediction would need (date, place, magnitude), a fault that can't be observed at depth, and the
 * contrast between probability forecasts and early warning (an alert sent after the rupture begins, ahead of the shaking).
 * Nothing here is a real dataset: the trace, the odds grid and the map are illustrations and are labelled as such.
 */
import { COLORS } from '../design/tokens.js';
import { Backdrop, HOT, HookTitle, P_COLOR, Pill, S_COLOR, Txt, at, clamp, f1, mulberry32, prog, smooth, span, vis, within } from './kit.js';
import { SeriesTag, makeEduShort } from './EduShort.js';
import type { EpisodeVisuals } from './EduShort.js';

type B = Parameters<EpisodeVisuals>[0]['b'];

const noise = ( xw: number ) => 0.5 * Math.sin( xw / 9 ) + 0.3 * Math.sin( xw / 3.7 + 1 ) + 0.25 * Math.sin( xw / 17 + 2 ) + 0.2 * Math.sin( xw / 2.3 + 4 );

/** Scrolling trace: background microtremor plus bursts at world positions. */
const Scroll: React.FC<{ y: number; t: number; speed: number; bursts: { x: number; amp: number }[]; color?: string; base?: number }> = ( { y, t, speed, bursts, color = P_COLOR, base = 9 } ) => {
  const pts: string[] = [];
  for ( let x = 40; x <= 1040; x += 4 ) {
    const xw = x + t * speed;
    let v = noise( xw ) * base;
    for ( const b of bursts ) {
      const d = xw - b.x;
      if ( d > -4 ) {
        v += Math.sin( d / 2.4 ) * b.amp * Math.exp( -Math.max( 0, d ) / 110 ) * Math.min( 1, ( d + 4 ) / 6 ) * ( 0.7 + 0.3 * Math.sin( d / 9 ) );
      }
    }
    pts.push( `${x},${f1( y + v )}` );
  }
  return <polyline points={pts.join( ' ' )} fill="none" stroke={color} strokeWidth={3.5} strokeLinejoin="round" />;
};

const HookTrace: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = span( t, b, 'hook', 'need' );
  if ( o <= 0.01 ) {
    return null;
  }
  return (
    <g opacity={o}>
      <line x1={40} x2={1040} y1={1000} y2={1000} stroke={COLORS.rule} strokeWidth={2} strokeDasharray="8 8" />
      <Scroll y={1000} t={t} speed={170} bursts={[ { x: 700, amp: 60 }, { x: 1250, amp: 150 }, { x: 1900, amp: 30 } ]} />
      <Pill x={540} y={1250} text="WHEN WILL THE NEXT ONE HIT?" color={S_COLOR} size={34} opacity={prog( t, 2.3 )} />
    </g>
  );
};

const ICONS: Record<string, React.ReactNode> = {
  when: <g fill="none" stroke="#fff" strokeWidth={6}><circle r={34} /><path d="M0,-20 V0 L16,10" strokeLinecap="round" /></g>,
  where: <g><path d="M0,40 C-34,0 -34,-12 -34,-18 A34,34 0 0 1 34,-18 C34,-12 34,0 0,40Z" fill="none" stroke="#fff" strokeWidth={6} /><circle cy={-18} r={11} fill="#fff" /></g>,
  big: <g fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round"><path d="M-40,0 H-24 L-14,-26 L2,28 L14,-14 L22,0 H40" /></g>
};

const Needs: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = span( t, b, 'need', 'hidden' );
  if ( o <= 0.01 ) {
    return null;
  }
  const rows = [ { k: 'when', label: 'DATE', q: 'WHEN?', f: 0.38 }, { k: 'where', label: 'PLACE', q: 'WHERE?', f: 0.6 }, { k: 'big', label: 'MAGNITUDE', q: 'HOW BIG?', f: 0.85 } ];
  return (
    <g opacity={o}>
      <Txt x={540} y={470} size={46} display spacing={5} color={COLORS.redText}>A REAL PREDICTION NEEDS</Txt>
      {rows.map( ( r, i ) => {
        const y = 540 + i * 220;
        const k = prog( t, within( b, 'need', r.f ) - 0.25, 0.45 );
        const x = prog( t, at( b, 'never', 0.6 + i * 0.9 ), 0.35 );
        return (
          <g key={r.k} opacity={k} transform={`translate(0 ${f1( ( 1 - k ) * 30 )})`}>
            <rect x={90} y={y} width={900} height={180} rx={20} fill="rgba(14,21,34,0.92)" stroke={x > 0.5 ? HOT : S_COLOR} strokeWidth={4} />
            <g transform={`translate(190 ${y + 90})`}>{ICONS[r.k]}</g>
            <Txt x={300} y={y + 112} size={86} display weight={800} anchor="start" spacing={3}>{r.label}</Txt>
            <Txt x={950} y={y + 112} size={80} display weight={800} anchor="end" color={S_COLOR} opacity={1 - x}>?</Txt>
            <g opacity={x} transform={`translate(895 ${y + 90}) scale(${f1( 0.6 + 0.4 * x )})`}>
              <circle r={46} fill="rgba(215,32,42,0.2)" stroke={HOT} strokeWidth={6} />
              <path d="M-20,-20 L20,20 M20,-20 L-20,20" stroke={HOT} strokeWidth={9} strokeLinecap="round" />
            </g>
          </g>
        );
      } )}
      <g opacity={prog( t, at( b, 'never', 2.6 ), 0.6 )}>
        <rect x={90} y={1215} width={900} height={74} rx={14} fill={HOT} opacity={0.92} />
        <Txt x={540} y={1266} size={38} display weight={700} spacing={3}>NEVER RELIABLY DONE FOR A MAJOR QUAKE</Txt>
      </g>
    </g>
  );
};

const Hidden: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = span( t, b, 'hidden', 'signal' );
  if ( o <= 0.01 ) {
    return null;
  }
  const k = prog( t, at( b, 'hidden', 0 ), 1 );
  const pulse = 0.55 + 0.45 * Math.sin( t * 3 );
  const strata = [ '#6b5640', '#5d4a3b', '#4f4547', '#453f4d', '#3a3b4f', '#2e3247' ];
  return (
    <g opacity={o}>
      <rect x={90} y={440} width={900} height={780} rx={16} fill="#0a0f1c" stroke={COLORS.rule} strokeWidth={3} />
      <clipPath id="hid"><rect x={93} y={443} width={894} height={774} rx={14} /></clipPath>
      <g clipPath="url(#hid)">
        {strata.map( ( c, i ) => <rect key={i} x={93} y={560 + i * 110} width={894} height={112} fill={c} /> )}
        <rect x={93} y={443} width={894} height={117} fill="#101a30" />
        <path d="M93,560 H987" stroke="#cdbfa0" strokeWidth={4} />
        {[ [ 220, 60, 90 ], [ 330, 80, 60 ], [ 470, 40, 110 ], [ 700, 70, 80 ] ].map( ( [ x, w, h ], i ) => <rect key={i} x={x + 93} y={560 - h} width={w} height={h} fill="#0c1220" stroke="#8fa3c7" strokeWidth={2} /> )}
        <line x1={250} y1={600} x2={800} y2={1180} stroke="#05080f" strokeWidth={9} />
        <line x1={250} y1={600} x2={800} y2={1180} stroke="#9aa6bd" strokeWidth={2} strokeDasharray="14 12" opacity={0.7} />
        <circle cx={600} cy={980} r={110 + 25 * pulse} fill="#ff5a3c" opacity={0.2 * k} />
        <circle cx={600} cy={980} r={70} fill="#ff5a3c" opacity={0.3 * k * pulse} />
        <Txt x={600} y={1006} size={92} display weight={800} color={COLORS.text} opacity={k}>?</Txt>
      </g>
      <Pill x={540} y={500} text="FAULT: BURIED DEEP" color={S_COLOR} size={34} opacity={prog( t, at( b, 'hidden', 0.5 ) )} />
      <Pill x={400} y={1130} text="STRESS: NOT DIRECTLY VISIBLE" color={HOT} size={32} opacity={prog( t, within( b, 'hidden', 0.62 ) )} />
      <g opacity={prog( t, at( b, 'hidden', 0.9 ), 0.5 )}>
        <line x1={930} y1={565} x2={930} y2={1190} stroke={COLORS.text} strokeWidth={4} />
        <path d="M930,1190 l-14,-24 h28 z" fill={COLORS.text} />
        <Txt x={905} y={900} size={34} color={COLORS.textSupport} anchor="middle" opacity={1}>DEPTH</Txt>
      </g>
    </g>
  );
};

const Signal: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = span( t, b, 'signal', 'forecast' );
  if ( o <= 0.01 ) {
    return null;
  }
  const s = t - at( b, 'signal', 0 );
  const flags = [ { x: 300, at: 1.2 }, { x: 560, at: 2.6 }, { x: 790, at: 3.8 } ];
  const bigAt = within( b, 'signal', 0.78 ) - at( b, 'signal', 0 );
  return (
    <g opacity={o}>
      <line x1={40} x2={1040} y1={800} y2={800} stroke={COLORS.rule} strokeWidth={2} strokeDasharray="8 8" />
      <Scroll y={800} t={s} speed={170} base={14} bursts={[ { x: 130, amp: 22 }, { x: 650, amp: 20 }, { x: 1400, amp: 10 }, { x: 170 * bigAt + 1040, amp: 230 } ]} />
      {flags.map( ( f, i ) => {
        const a = prog( s, f.at, 0.3 );
        const gone = prog( s, f.at + 1.1, 0.4 );
        return (
          <g key={i} opacity={a * ( 1 - gone * 0.15 )}>
            <line x1={f.x} y1={560} x2={f.x} y2={850} stroke={S_COLOR} strokeWidth={3} strokeDasharray="8 6" />
            <Pill x={f.x} y={530} text={gone > 0.5 ? 'FALSE ALARM' : 'SIGNAL?'} color={gone > 0.5 ? COLORS.textSecondary : S_COLOR} size={30} />
          </g>
        );
      } )}
      <g opacity={prog( s, bigAt, 0.4 )}>
        <Txt x={540} y={1130} size={110} display weight={800} color={HOT} spacing={2}>NO RELIABLE WARNING</Txt>
        <Txt x={540} y={1190} size={34} color={COLORS.textSupport}>No signal reliably appears before a major earthquake</Txt>
      </g>
    </g>
  );
};

const Forecast: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = span( t, b, 'forecast', 'warning' );
  if ( o <= 0.01 ) {
    return null;
  }
  const dateK = prog( t, at( b, 'forecast', 0.2 ), 0.5 );
  const oddsK = prog( t, at( b, 'odds', 0.1 ), 0.6 );
  const faults = prog( t, at( b, 'odds', 0.2 ), 1.6 );
  const dots = [ [ 220, 640 ], [ 330, 600 ], [ 450, 560 ], [ 590, 520 ], [ 720, 560 ], [ 810, 640 ], [ 380, 660 ], [ 660, 620 ] ];
  const lit = Math.round( 30 * prog( t, within( b, 'odds', 0.6 ), 1.5 ) );
  const cal = prog( t, at( b, 'notdate', 0 ), 0.5 );
  const day = Math.floor( t * 9 ) % 30;
  return (
    <g opacity={o}>
      <g opacity={1 - clamp( ( t - at( b, 'odds', 4.6 ) ) / 0.5 )}>
        <Txt x={540} y={470} size={110} display weight={800} color={S_COLOR} opacity={dateK} spacing={3}>FORECAST</Txt>
        <Txt x={540} y={540} size={42} color={COLORS.textSupport} opacity={dateK * ( 1 - oddsK )}>odds over time, not an exact date</Txt>
        <g opacity={oddsK}>
          <rect x={90} y={520} width={900} height={250} rx={16} fill="rgba(14,21,34,0.7)" stroke={COLORS.rule} strokeWidth={3} />
          <path d={`M170,740 L300,610 L430,650 L560,560 L700,610 L820,540 L910,600`} fill="none" stroke={P_COLOR} strokeWidth={5} strokeDasharray="1200" strokeDashoffset={1200 * ( 1 - faults )} strokeLinecap="round" />
          {dots.map( ( [ x, y ], i ) => <circle key={i} cx={x} cy={y} r={11} fill={HOT} opacity={clamp( ( faults - i / 10 ) * 4 )} stroke="#fff" strokeWidth={2} /> )}
          <Txt x={170} y={800} size={30} anchor="start" color={P_COLOR} opacity={faults}>MAPPED FAULTS</Txt>
          <Txt x={910} y={800} size={30} anchor="end" color={HOT} opacity={faults}>PAST EARTHQUAKES</Txt>
        </g>
        <g opacity={oddsK}>
          {Array.from( { length: 100 }, ( _, i ) => {
            const c = i % 10;
            const r = Math.floor( i / 10 );
            const on = ( ( i * 37 ) % 100 ) < lit;
            return <circle key={i} cx={230 + c * 62} cy={900 + r * 30} r={10} fill={on ? S_COLOR : '#26324a'} />;
          } )}
          <Txt x={540} y={1250} size={40} color={COLORS.text}>Illustrative: 30 in 100 · a chance over decades</Txt>
        </g>
      </g>
      <g opacity={cal * clamp( ( t - at( b, 'odds', 4.6 ) ) / 0.5 )}>
        <Txt x={540} y={470} size={100} display weight={800} color={COLORS.text} spacing={3}>NOT A DATE</Txt>
        {Array.from( { length: 30 }, ( _, i ) => {
          const c = i % 6;
          const r = Math.floor( i / 6 );
          const on = i === day;
          return (
            <g key={i}>
              <rect x={150 + c * 130} y={540 + r * 130} width={112} height={112} rx={12} fill={on ? S_COLOR : 'rgba(14,21,34,0.9)'} stroke={on ? '#fff' : COLORS.rule} strokeWidth={3} />
              <Txt x={206 + c * 130} y={610 + r * 130} size={44} color={on ? '#1a1200' : COLORS.textSecondary}>{i + 1}</Txt>
            </g>
          );
        } )}
        <Txt x={540} y={1250} size={44} color={COLORS.textSupport}>Which day? We can’t say.</Txt>
      </g>
    </g>
  );
};

const CITY = { x: 820, y: 1000 };
const EPI = { x: 220, y: 560 };
const Warning: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = span( t, b, 'warning', 'ready' );
  if ( o <= 0.01 ) {
    return null;
  }
  const s = t - at( b, 'warning', 0.5 );
  const d = Math.hypot( CITY.x - EPI.x, CITY.y - EPI.y );
  const vp = d / 4.4;
  const vs = d / 7.6;
  const alert = prog( s, 2.5, 0.7 );
  const sArrive = s > 7.6;
  const shake = clamp( ( s - 7.6 ) / 0.4 ) * ( s < 11.5 ? 1 : 0 );
  return (
    <g opacity={o}>
      <rect x={90} y={440} width={900} height={800} rx={16} fill="rgba(14,21,34,0.7)" stroke={COLORS.rule} strokeWidth={3} />
      <clipPath id="wmap"><rect x={93} y={443} width={894} height={794} rx={14} /></clipPath>
      <g clipPath="url(#wmap)">
        {s > 0 ? <circle cx={EPI.x} cy={EPI.y} r={vp * s} fill="none" stroke={P_COLOR} strokeWidth={5} opacity={0.9} /> : null}
        {s > 0 ? <circle cx={EPI.x} cy={EPI.y} r={vs * s} fill="none" stroke={S_COLOR} strokeWidth={7} opacity={0.9} /> : null}
        {s > 2.2 ? <line x1={EPI.x} y1={EPI.y} x2={lerpPt( EPI.x, CITY.x, ( s - 2.2 ) / 0.8 )} y2={lerpPt( EPI.y, CITY.y, ( s - 2.2 ) / 0.8 )} stroke="#fff" strokeWidth={5} strokeDasharray="12 8" /> : null}
        <circle cx={EPI.x} cy={EPI.y} r={18} fill={HOT} stroke="#fff" strokeWidth={4} />
        <g transform={`translate(${f1( CITY.x + shake * 7 * Math.sin( t * 33 ) )} ${CITY.y})`}>
          {[ [ -40, 60 ], [ -10, 100 ], [ 24, 78 ] ].map( ( [ x, h ], i ) => <rect key={i} x={x - 14} y={-h} width={28} height={h} fill="#0c1220" stroke="#8fa3c7" strokeWidth={2} /> )}
        </g>
      </g>
      <Pill x={EPI.x + 70} y={500} text="QUAKE HAS STARTED" color={HOT} size={30} opacity={prog( s, 0.2, 0.4 )} />
      <Pill x={CITY.x - 40} y={870} text={sArrive ? 'SHAKING ARRIVES' : 'ALERT RECEIVED'} color={sArrive ? S_COLOR : '#ffffff'} size={32} opacity={alert} />
      <Txt x={540} y={1130} size={32} color={P_COLOR} opacity={prog( s, 1 )}>P WAVES</Txt>
      <Txt x={540} y={1180} size={32} color={S_COLOR} opacity={prog( s, 1 )}>S WAVES (STRONGER SHAKING)</Txt>
      <Pill x={540} y={1290} text="EARLY WARNING ≠ PREDICTION" color={COLORS.redText} size={34} opacity={prog( t, within( b, 'warning', 0.5 ), 0.5 )} />
    </g>
  );
};
const lerpPt = ( a: number, b2: number, k: number ) => a + ( b2 - a ) * smooth( clamp( k ) );

const Ready: React.FC<{ t: number; b: B }> = ( { t, b } ) => {
  const o = span( t, b, 'ready', 'cta', 0.4 );
  if ( o <= 0.01 ) {
    return null;
  }
  const s = t - at( b, 'ready', 0 );
  return (
    <g opacity={o}>
      <Scroll y={620} t={s} speed={90} base={4} bursts={[]} color={COLORS.textSupport} />
      <Txt x={540} y={820} size={120} display weight={800} color={COLORS.text} spacing={3} opacity={prog( s, 0.2 )}>WHEN? UNKNOWN</Txt>
      {[ 'KNOW YOUR RISK', 'PREPARE', 'DROP, COVER, HOLD ON' ].map( ( c, i ) => <Pill key={c} x={540} y={980 + i * 110} text={c} color={S_COLOR} size={40} opacity={prog( s, within( b, 'ready', 0.2 + i * 0.25 ) - at( b, 'ready', 0 ), 0.4 )} /> )}
    </g>
  );
};

const Visuals: EpisodeVisuals = ( { t, b } ) => (
  <>
    <Backdrop accent="#12304a" />
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <HookTrace t={t} b={b} />
      <Needs t={t} b={b} />
      <Hidden t={t} b={b} />
      <Signal t={t} b={b} />
      <Forecast t={t} b={b} />
      <Warning t={t} b={b} />
      <Ready t={t} b={b} />
    </svg>
    <HookTitle t={t} lines={[ 'WHY CAN’T WE', 'PREDICT', 'EARTHQUAKES?' ]} until={b.need.start - 0.2} />
    <SeriesTag number={2} opacity={vis( t, b.need.start, b.cta.start - 1, 0.6 )} />
  </>
);

export const Predict = makeEduShort( {
  id: 'predict',
  Visuals,
  cues: b => [
    { sfx: 'rumble', at: b.hook.start, dur: 5, volume: s => 0.3 * Math.min( 1, s / 0.5 ) * ( 1 - smooth( ( s - 3.4 ) / 1.6 ) ) },
    { sfx: 'riser', at: b.hook.start + 1.8, dur: 2.2, volume: 0.22 },
    { sfx: 'tick', at: within( b, 'need', 0.38 ) - 0.2, dur: 0.3, volume: 0.5 },
    { sfx: 'tick', at: within( b, 'need', 0.6 ) - 0.2, dur: 0.3, volume: 0.5 },
    { sfx: 'tick', at: within( b, 'need', 0.85 ) - 0.2, dur: 0.3, volume: 0.5 },
    { sfx: 'boom', at: at( b, 'never', 0.6 ), dur: 3, volume: 0.25 },
    { sfx: 'boom', at: at( b, 'never', 1.5 ), dur: 3, volume: 0.25 },
    { sfx: 'boom', at: at( b, 'never', 2.4 ), dur: 3, volume: 0.3 },
    { sfx: 'rumble', at: at( b, 'hidden', 0.2 ), dur: 6, volume: s => 0.2 * Math.min( 1, s ) * ( 1 - smooth( ( s - 4.5 ) / 1.4 ) ) },
    { sfx: 'tick', at: at( b, 'signal', 1.2 ), dur: 0.3, volume: 0.45 },
    { sfx: 'tick', at: at( b, 'signal', 2.6 ), dur: 0.3, volume: 0.45 },
    { sfx: 'tick', at: at( b, 'signal', 3.8 ), dur: 0.3, volume: 0.45 },
    { sfx: 'rumble', at: within( b, 'signal', 0.78 ) - 0.2, dur: 5, volume: s => 0.5 * Math.exp( -s / 2 ) },
    { sfx: 'whoosh', at: at( b, 'forecast', 0 ), dur: 1.4, volume: 0.3 },
    { sfx: 'whoosh', at: at( b, 'notdate', 0 ), dur: 1.4, volume: 0.3 },
    { sfx: 'boom', at: at( b, 'warning', 0.5 ), dur: 3, volume: 0.45 },
    { sfx: 'tick', at: at( b, 'warning', 0.5 + 2.5 ), dur: 0.3, volume: 0.7 },
    { sfx: 'rumble', at: at( b, 'warning', 0.5 + 7.6 ), dur: 4, volume: s => 0.4 * Math.exp( -s / 1.5 ) },
    { sfx: 'riser', at: at( b, 'ready', 0 ), dur: 2.2, volume: 0.18 }
  ]
} );
