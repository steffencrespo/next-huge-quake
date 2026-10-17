import type { DataRow, ScreenCopy } from '../copy/screenCopy.js';
import { REGIONS, rectStyle } from '../design/layout.js';
import { COLORS, TYPE } from '../design/tokens.js';

const LABEL_WIDTH = 240;
const ROW_PAD = 28;
const VALUE_GAP = 18;
/** Average advance per character, measured on the rendered boards (Barlow Condensed Bold digits, Inter Medium). */
const EM_PER_CHAR = { value: 0.4, detail: 0.53 };

/**
 * A detail is shown only when it fits on the row next to the value, so the value is never squeezed or clipped.
 * Deterministic estimate from character counts; e.g. "USGS location" drops beside long coordinates.
 */
export function detailFits( row: DataRow ): boolean {
  if ( row.detail === null ) {
    return false;
  }
  const available = REGIONS.dataGrid.width - 2 * ROW_PAD - LABEL_WIDTH - VALUE_GAP;
  const value = row.value.length * EM_PER_CHAR.value * Number( TYPE.dataValue.fontSize );
  const detail = row.detail.length * EM_PER_CHAR.detail * Number( TYPE.meta.fontSize );
  return value + detail <= available;
}

export const StatRow: React.FC<{ row: DataRow; last: boolean; style?: React.CSSProperties }> = ( { row, last, style } ) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: `0 ${ROW_PAD}px`, borderBottom: last ? 'none' : `2px solid ${COLORS.rule}`, ...style }}>
    <div style={{ ...TYPE.label, color: COLORS.textSecondary, width: LABEL_WIDTH, flexShrink: 0 }}>{row.label}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: VALUE_GAP, minWidth: 0 }}>
      <span style={{ ...TYPE.dataValue, color: COLORS.text, whiteSpace: 'nowrap' }}>{row.value}</span>
      {detailFits( row ) ? <span style={{ ...TYPE.meta, color: COLORS.textSupport, whiteSpace: 'nowrap' }}>{row.detail}</span> : null}
    </div>
  </div>
);

/**
 * The facts rows to show. When USGS gave no place name, the lower third already shows the coordinates,
 * so the Epicenter row is dropped instead of repeating them.
 */
export const factsRows = ( copy: ScreenCopy ): DataRow[] =>
  copy.location.name === null ? copy.facts.rows.filter( row => row.label !== 'Epicenter' ) : copy.facts.rows;

/**
 * Data panel: one row per fact, label | value | detail. Rows share the panel height, so animating a row's
 * opacity never reflows the others.
 */
export const DataPanel: React.FC<{ rows: DataRow[]; style?: React.CSSProperties; rowStyle?: ( index: number ) => React.CSSProperties }> = ( { rows, style, rowStyle } ) => (
  <div style={{ ...rectStyle( REGIONS.dataGrid ), display: 'flex', flexDirection: 'column', background: COLORS.panelTranslucent, borderTop: `4px solid ${COLORS.red}`, ...style }}>
    {rows.map( ( row, i ) => <StatRow key={row.label} row={row} last={i === rows.length - 1} style={rowStyle?.( i )} /> )}
  </div>
);
