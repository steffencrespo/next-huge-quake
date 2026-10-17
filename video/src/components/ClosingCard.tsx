import type { ScreenCopy } from '../copy/screenCopy.js';
import { REGIONS, rectStyle } from '../design/layout.js';
import { COLORS, TYPE } from '../design/tokens.js';
import { Wordmark } from './Wordmark.js';
import type { WordmarkPart } from './Wordmark.js';

export type ClosingPart = WordmarkPart | 'source' | 'disclaimers';

/**
 * The fixed end card. The wordmark and tagline lead; the USGS source block and disclaimers follow as
 * secondary information, still at phone-readable sizes.
 */
export const ClosingCard: React.FC<{ closing: ScreenCopy['closing']; partStyle?: ( part: ClosingPart ) => React.CSSProperties | undefined }> = (
  { closing, partStyle = () => undefined }
) => (
  <div style={{ ...rectStyle( REGIONS.closing ), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 64 }}>
    <Wordmark partStyle={partStyle} />
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', ...partStyle( 'source' ) }}>
      <div style={{ ...TYPE.meta, fontWeight: 600, color: COLORS.textSupport }}>{closing.source}</div>
      <div style={{ ...TYPE.fine, color: COLORS.textSupport }}>{closing.url}</div>
      <div style={{ ...TYPE.fine, color: COLORS.textSecondary }}>{closing.eventId}</div>
      <div style={{ ...TYPE.fine, color: COLORS.textSecondary }}>{closing.updated}</div>
      {closing.mapCredit ? <div style={{ ...TYPE.fine, color: COLORS.textSecondary }}>{closing.mapCredit}</div> : null}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '22px 28px', border: `2px solid ${COLORS.rule}`, background: COLORS.panel, width: '100%', boxSizing: 'border-box', ...partStyle( 'disclaimers' ) }}>
      {closing.disclaimers.map( d => (
        <div key={d} style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
          <div style={{ width: 10, height: 10, background: COLORS.red, flexShrink: 0, transform: 'translateY(-4px)' }} />
          <div style={{ ...TYPE.fine, color: COLORS.textSupport }}>{d}</div>
        </div>
      ) )}
    </div>
  </div>
);
