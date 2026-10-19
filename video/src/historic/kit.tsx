/** Drawing pieces shared by the Historic Earthquakes Shorts: regional map window, schematic subduction section, data cards. */
import { COLORS, FONT } from '../design/tokens.js';
import { Txt, clamp, f1, lerp, prog, smooth } from '../edu/kit.js';
import { landPath, merc } from './regionmap.js';
import type { Box } from './regionmap.js';

export type Rect = { x: number; y: number; w: number; h: number };
export type Proj = ( lon: number, lat: number ) => [ number, number ];

export type MapTheme = { ocean: string; land: string; coast: string; rule: string };
export const OCEAN_THEME: MapTheme = { ocean: '#0A1D31', land: '#2a3442', coast: '#B4CDE6', rule: COLORS.rule };
export const SEPIA_THEME: MapTheme = { ocean: '#1b1712', land: '#3a3226', coast: '#d9c49a', rule: '#5a4b34' };

const pathCache = new Map<string, string>();
const cachedLand = ( box: Box ) => {
  const k = JSON.stringify( box );
  if ( !pathCache.has( k ) ) {
    pathCache.set( k, landPath( box ) );
  }
  return pathCache.get( k )!;
};

/** Screen projection for a map window centred on [lon, lat] at `zoom` screen px per world px. */
export const makeProj = ( rect: Rect, center: [ number, number ], zoom: number ): Proj => {
  const [ cx, cy ] = merc( center[0], center[1] );
  return ( lon, lat ) => {
    const [ x, y ] = merc( lon, lat );
    return [ rect.x + rect.w / 2 + ( x - cx ) * zoom, rect.y + rect.h / 2 + ( y - cy ) * zoom ];
  };
};

/** A rounded map window with land, a graticule and overlays in screen space (children get the projection). */
export const RegionMap: React.FC<{ id: string; rect: Rect; box: Box; center: [ number, number ]; zoom: number; theme?: MapTheme; grid?: number; children?: ( p: Proj ) => React.ReactNode }> = (
  { id, rect, box, center, zoom, theme = OCEAN_THEME, grid = 5, children }
) => {
  const [ cx, cy ] = merc( center[0], center[1] );
  const proj = makeProj( rect, center, zoom );
  const lines: React.ReactNode[] = [];
  const west = center[0] - rect.w / zoom / 17.45 / 1.2, east = center[0] + rect.w / zoom / 17.45 / 1.2;
  for ( let lo = Math.ceil( west / grid ) * grid; lo <= east; lo += grid ) {
    const [ x ] = proj( lo, center[1] );
    lines.push( <line key={`m${lo}`} x1={x} x2={x} y1={rect.y} y2={rect.y + rect.h} stroke="#8fa3c7" strokeOpacity={0.1} strokeWidth={2} /> );
  }
  for ( let la = Math.ceil( ( center[1] - 30 ) / grid ) * grid; la <= center[1] + 30; la += grid ) {
    const [ , y ] = proj( center[0], la );
    if ( y > rect.y && y < rect.y + rect.h ) {
      lines.push( <line key={`p${la}`} x1={rect.x} x2={rect.x + rect.w} y1={y} y2={y} stroke="#8fa3c7" strokeOpacity={0.1} strokeWidth={2} /> );
    }
  }
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', left: 0, top: 0 }}>
      <clipPath id={`clip-${id}`}><rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={16} /></clipPath>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={16} fill={theme.ocean} />
      <g clipPath={`url(#clip-${id})`}>
        {lines}
        <g transform={`translate(${f1( rect.x + rect.w / 2 )} ${f1( rect.y + rect.h / 2 )}) scale(${zoom}) translate(${f1( -cx )} ${f1( -cy )})`}>
          <path d={cachedLand( box )} fill={theme.land} stroke={theme.coast} strokeWidth={1.6 / zoom} strokeOpacity={0.7} strokeLinejoin="round" />
        </g>
        {children?.( proj )}
      </g>
      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={16} fill="none" stroke={theme.rule} strokeWidth={3} />
    </svg>
  );
};

/** Pulsing epicentre marker. */
export const Epicenter: React.FC<{ x: number; y: number; t: number; opacity?: number; color?: string; r?: number }> = ( { x, y, t, opacity = 1, color = COLORS.redHot, r = 12 } ) => {
  if ( opacity <= 0.01 ) {
    return null;
  }
  return (
    <g opacity={opacity}>
      {[ 0, 0.5 ].map( o => {
        const ph = ( t * 0.8 + o ) % 1;
        return <circle key={o} cx={x} cy={y} r={r + ph * r * 6} fill="none" stroke={color} strokeWidth={4} opacity={1 - ph} />;
      } )}
      <circle cx={x} cy={y} r={r} fill={color} stroke="#fff" strokeWidth={4} />
    </g>
  );
};

/** Big data card: small label on top, large value, optional footnote. */
export const Card: React.FC<{ x: number; y: number; w: number; label: string; value: string; note?: string; color?: string; opacity?: number; valueSize?: number }> = (
  { x, y, w, label, value, note, color = COLORS.redHot, opacity = 1, valueSize = 120 }
) => {
  if ( opacity <= 0.01 ) {
    return null;
  }
  const h = note ? 250 : 215;
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={16} fill="rgba(7,11,20,0.9)" stroke={color} strokeWidth={4} />
      <Txt x={x + w / 2} y={y + 52} size={32} weight={700} spacing={3} color={COLORS.textSupport}>{label}</Txt>
      <Txt x={x + w / 2} y={y + 52 + valueSize * 0.92} size={valueSize} display weight={800} spacing={2} color={COLORS.text}>{value}</Txt>
      {note ? <Txt x={x + w / 2} y={y + h - 22} size={28} weight={500} color={COLORS.textSupport}>{note}</Txt> : null}
    </g>
  );
};

/** Small label under a map or diagram marking it as schematic / illustrative. */
export const Disclaimer: React.FC<{ x?: number; y: number; text: string; opacity?: number; anchor?: 'start' | 'middle' | 'end' }> = ( { x = 540, y, text, opacity = 1, anchor = 'middle' } ) => (
  <Txt x={x} y={y} size={28} weight={600} color={COLORS.textSupport} opacity={opacity} anchor={anchor}>{text}</Txt>
);

/** Tag row under the safe top margin: series name and episode number. */
export const HistoricTag: React.FC<{ number: number; opacity?: number; color?: string }> = ( { number, opacity = 1, color = COLORS.redText } ) => (
  <div style={{ position: 'absolute', left: 72, top: 200, fontFamily: FONT.display, fontWeight: 700, fontSize: 32, letterSpacing: 4, textTransform: 'uppercase', color, opacity }}>
    HISTORIC EARTHQUAKES · {String( number ).padStart( 2, '0' )}
  </div>
);

/** Big opening title with the series label above it. */
export const HistoricTitle: React.FC<{ lines: string[]; opacity: number; top?: number; color?: string; size?: number }> = ( { lines, opacity, top = 250, color = COLORS.redText, size = 108 } ) => {
  if ( opacity <= 0.01 ) {
    return null;
  }
  return (
    <div style={{ position: 'absolute', left: 72, top, width: 936, opacity }}>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 36, letterSpacing: 5, textTransform: 'uppercase', color }}>HISTORIC EARTHQUAKES</div>
      {lines.map( ( l, i ) => <div key={i} style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: size, lineHeight: 1.0, textTransform: 'uppercase', color: COLORS.text, marginTop: i === 0 ? 16 : 0 }}>{l}</div> )}
    </div>
  );
};

// ---------- schematic subduction section ----------

export type SectionTimes = {
  /** Plates appear and the slab starts to move. */ show: number;
  /** The interface locks (red segment starts to load). */ lock: number;
  /** The moment of sudden slip. */ slip: number;
  /** End of the section's visibility. */ hide: number;
};
export type SectionLabels = { ocean: string; land: string };

const OY = 40;
const slabTop = ( x: number ) => ( x < 400 ? 150 + OY : 150 + OY + ( x - 400 ) * 0.36 );

/** A schematic (not to scale) ocean-to-continent subduction cross-section: locked interface, stress, sudden slip, seafloor uplift and a tsunami. */
export const SubductionSection: React.FC<{ t: number; times: SectionTimes; x?: number; y?: number; labels: SectionLabels; accent?: string }> = ( { t, times, x = 90, y = 910, labels, accent = COLORS.redHot } ) => {
  const o = clamp( ( t - times.show ) / 0.5 ) * clamp( ( times.hide - t ) / 0.5 );
  if ( o <= 0.01 ) {
    return null;
  }
  const lock = prog( t, times.lock, 0.6 );
  const stress = clamp( ( t - times.lock - 0.3 ) / Math.max( 0.5, times.slip - times.lock - 0.3 ) ) * lock;
  const tr = t - times.slip;
  const after = tr > 0 ? smooth( tr / 0.4 ) : 0;
  const burst = tr > 0 && tr < 1.8 ? 1 - tr / 1.8 : 0;
  const jolt = tr > 0 && tr < 1.2 ? Math.sin( tr * 50 ) * 7 * ( 1 - tr / 1.2 ) : 0;
  const stressColor = `rgb(${Math.round( lerp( 242, 255, stress ) )}, ${Math.round( lerp( 169, 59, stress ) )}, ${Math.round( lerp( 0, 48, stress ) )})`;
  const uplift = after * 26 * ( 1 - prog( t, times.slip + 3, 1.5 ) * 0.6 );
  const slabDx = ( t * 30 ) % 40;
  const wedge = `400,${150 + OY} 470,${70 + OY} 900,${50 + OY} 900,${150 + OY + 180}`;
  const slabPts = `0,${150 + OY - 20} 400,${150 + OY} 900,${150 + OY + 180} 900,${150 + OY + 220} 400,${150 + OY + 40} 0,${150 + OY + 20}`;
  const waveP = clamp( tr / 3.5 );
  return (
    <g opacity={o} transform={`translate(${x} ${y})`}>
      <clipPath id="hsec"><rect x={0} y={0} width={900} height={370} rx={16} /></clipPath>
      <rect x={0} y={0} width={900} height={370} rx={16} fill="#24182b" stroke={COLORS.rule} strokeWidth={3} />
      <g clipPath="url(#hsec)">
        <rect x={0} y={OY + 30} width={470} height={150 + OY} fill="#0d3a5e" opacity={0.85} />
        <polygon points={wedge} fill="#4f4547" stroke="#cdbfa0" strokeWidth={3} transform={`translate(${f1( jolt * after )} 0)`} />
        <polygon points={slabPts} fill="#3a5a7a" stroke="#9fc4ea" strokeWidth={3} />
        {Array.from( { length: 24 }, ( _, i ) => {
          const px = -40 + i * 40 + slabDx;
          return px > 0 && px < 900 ? <circle key={i} cx={px} cy={slabTop( Math.max( 0, px ) ) + 20} r={4} fill="#cfe6ff" opacity={0.55} /> : null;
        } )}
        {uplift > 0.5 ? <path d={`M250,${150 + OY} Q340,${150 + OY - uplift * 2} 430,${150 + OY} Z`} fill="#0d3a5e" stroke="#9fc4ea" strokeWidth={3} opacity={0.9} /> : null}
        <line x1={400} y1={150 + OY} x2={580} y2={slabTop( 580 )} stroke={stressColor} strokeWidth={12} opacity={lock * ( 1 - after * 0.8 )} strokeLinecap="round" />
        {burst > 0 ? <circle cx={480} cy={slabTop( 480 )} r={30 + ( 1 - burst ) * 190} fill="none" stroke="#fff" strokeWidth={8 * burst} opacity={burst} /> : null}
        {tr > 0.3 ? [ 0, 1, 2 ].map( i => {
          const p = clamp( waveP - i * 0.18 );
          return <path key={i} d={`M${f1( 330 - p * 300 )},${OY + 32} q${f1( 20 )},-${f1( 20 * ( 1 - p ) )} 40,0`} fill="none" stroke="#fff" strokeWidth={5} opacity={p > 0 ? 1 - p : 0} strokeLinecap="round" />;
        } ) : null}
      </g>
      <Pill2 x={170} y={314} text={labels.ocean} color="#7FDBFF" opacity={prog( t, times.show + 0.3, 0.4 )} />
      <Pill2 x={700} y={314} text={labels.land} color="#cdbfa0" opacity={prog( t, times.show + 0.6, 0.4 )} />
      <Pill2 x={300} y={60} text="LOCKED" color={stressColor} opacity={lock * ( 1 - after )} />
      <Pill2 x={300} y={60} text="SUDDEN SLIP" color={accent} opacity={after} />
      {tr > 1.5 ? <Pill2 x={150} y={128} text="TSUNAMI" color="#ffffff" opacity={prog( t, times.slip + 1.5, 0.5 )} /> : null}
      <text x={450} y={362} textAnchor="middle" fontFamily={FONT.ui} fontWeight={600} fontSize={26} fill={COLORS.textSupport}>Schematic · not to scale</text>
    </g>
  );
};

const Pill2: React.FC<{ x: number; y: number; text: string; color: string; opacity: number }> = ( { x, y, text, color, opacity } ) => {
  if ( opacity <= 0.01 ) {
    return null;
  }
  const size = 28;
  const w = Math.round( text.length * size * 0.66 + 44 );
  return (
    <g opacity={opacity}>
      <rect x={x - w / 2} y={y - size * 0.95} width={w} height={size * 1.8} rx={12} fill="rgba(7, 11, 20, 0.92)" stroke={color} strokeWidth={3} />
      <text x={x} y={y + size * 0.36} textAnchor="middle" fontFamily={FONT.ui} fontWeight={700} fontSize={size} letterSpacing={2} fill={COLORS.text}>{text}</text>
    </g>
  );
};
export { Pill2 as SmallPill };
