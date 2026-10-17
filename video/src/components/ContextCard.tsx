import type { ContextCard as Card } from '../copy/screenCopy.js';
import { fitFontSize } from '../design/fit.js';
import { REGIONS, rectStyle } from '../design/layout.js';
import { COLORS, PAGER_COLORS, TYPE } from '../design/tokens.js';

const ACCENT = 12;
const PAD = 40;

const pagerSwatch = ( card: Card ) =>
  card.item === 'pager' ? PAGER_COLORS[card.value.toLowerCase() as keyof typeof PAGER_COLORS] ?? null : null;

/**
 * One context card: kicker title, large value, one short line, one caveat. Dots show position in the scene
 * when there is more than one card.
 * Sized for the CARD_LIMITS maximums: a two-line line and a two-line caveat.
 */
export const ContextCard: React.FC<{ card: Card; index: number; count: number; style?: React.CSSProperties }> = ( { card, index, count, style } ) => {
  const swatch = pagerSwatch( card );
  const valueWidth = REGIONS.contextCard.width - ACCENT - 2 * PAD - ( swatch ? 110 : 0 );
  return (
    <div style={{ ...rectStyle( REGIONS.contextCard ), display: 'flex', background: COLORS.panelTranslucent, ...style }}>
      <div style={{ width: ACCENT, background: COLORS.red }} />
      <div style={{ flex: 1, padding: `${PAD}px`, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ ...TYPE.kicker, color: COLORS.redText }}>{card.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          {swatch ? <div style={{ width: 80, height: 80, background: swatch, flexShrink: 0 }} /> : null}
          <div style={{ ...TYPE.cardValue, fontSize: fitFontSize( card.value, valueWidth, 136, 90, 0.5 ), color: COLORS.text, whiteSpace: 'nowrap' }}>{card.value}</div>
        </div>
        <div style={{ ...TYPE.body, color: COLORS.text }}>{card.line}</div>
        <div style={{ height: 2, background: COLORS.rule }} />
        {card.note ? <div style={{ ...TYPE.note, color: COLORS.textSupport }}>{card.note}</div> : null}
        <div style={{ flex: 1 }} />
        {count > 1 ? (
          <div style={{ display: 'flex', gap: 12 }}>
            {Array.from( { length: count }, ( _, i ) => (
              <div key={i} style={{ width: i === index ? 48 : 16, height: 8, background: i === index ? COLORS.red : COLORS.rule }} />
            ) )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
