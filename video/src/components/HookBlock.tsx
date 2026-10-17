import type { ScreenCopy } from '../copy/screenCopy.js';
import { fitFontSize } from '../design/fit.js';
import { REGIONS, rectStyle } from '../design/layout.js';
import { COLORS, TYPE } from '../design/tokens.js';
import { SeismicGlyph } from './SeismicGlyph.js';

const SHADOW = '0 6px 40px rgba(0,0,0,0.85)';

/** Numeral center within the block, used as the transform origin when the hook compacts. */
export const HOOK_NUMERAL_CENTER_Y = 250;

/**
 * Opening lockup: MAGNITUDE kicker, hero numeral, seismic trace, place and origin time. Complete at frame 0.
 * `style` transforms the whole block; `secondaryStyle` applies to everything except the numeral (so the details
 * can fade first while the numeral moves).
 */
export const HookBlock: React.FC<{ hook: ScreenCopy['hook']; style?: React.CSSProperties; secondaryStyle?: React.CSSProperties }> = ( { hook, style, secondaryStyle } ) => (
  <div style={{ ...rectStyle( REGIONS.hook ), display: 'flex', flexDirection: 'column', alignItems: 'center', textShadow: SHADOW, transformOrigin: `50% ${HOOK_NUMERAL_CENTER_Y}px`, ...style }}>
    <div style={{ ...TYPE.kicker, fontSize: 48, letterSpacing: 16, color: COLORS.redText, ...secondaryStyle }}>{hook.kicker}</div>
    <div style={{ position: 'relative', marginTop: 10 }}>
      <div style={{ ...TYPE.magnitudeHero, color: COLORS.text }}>{hook.magnitude}</div>
      {hook.magType ? (
        <div style={{ ...TYPE.label, position: 'absolute', right: -8, bottom: -38, color: COLORS.textSecondary, ...secondaryStyle }}>{hook.magType}</div>
      ) : null}
    </div>
    <div style={{ marginTop: 36, ...secondaryStyle }}>
      <SeismicGlyph width={REGIONS.hook.width} height={64} strokeWidth={6} />
    </div>
    <div style={{ ...TYPE.headline, fontSize: fitFontSize( hook.place, REGIONS.hook.width, 84, 52 ), color: COLORS.text, marginTop: 22, whiteSpace: 'nowrap', ...secondaryStyle }}>{hook.place}</div>
    <div style={{ ...TYPE.body, fontWeight: 500, color: COLORS.textSecondary, marginTop: 14, ...secondaryStyle }}>{hook.when}</div>
  </div>
);
