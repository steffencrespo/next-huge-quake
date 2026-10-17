import type { ScreenCopy } from '../copy/screenCopy.js';
import { fitFontSize } from '../design/fit.js';
import { REGIONS, rectStyle } from '../design/layout.js';
import { COLORS, TYPE } from '../design/tokens.js';

const ACCENT = 12;
const PAD = 28;

/** Breaking-news lower third: red kicker strip, place name, event reference. */
export const LowerThird: React.FC<{ copy: ScreenCopy['facts']['lowerThird']; style?: React.CSSProperties }> = ( { copy, style } ) => {
  const titleWidth = REGIONS.lowerThird.width - ACCENT - 2 * PAD;
  return (
    <div style={{ ...rectStyle( REGIONS.lowerThird ), display: 'flex', flexDirection: 'column', ...style }}>
      <div style={{ alignSelf: 'flex-start', height: 48, display: 'flex', alignItems: 'center', padding: '0 18px', background: COLORS.red }}>
        <span style={{ ...TYPE.label, color: COLORS.text }}>{copy.kicker}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', background: COLORS.panelTranslucent }}>
        <div style={{ width: ACCENT, background: COLORS.red }} />
        <div style={{ flex: 1, padding: `0 ${PAD}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
          <div style={{ ...TYPE.headline, fontSize: fitFontSize( copy.title, titleWidth, 84, 52 ), color: COLORS.text, whiteSpace: 'nowrap' }}>{copy.title}</div>
          <div style={{ ...TYPE.meta, color: COLORS.textSecondary }}>{copy.subtitle}</div>
        </div>
      </div>
    </div>
  );
};
