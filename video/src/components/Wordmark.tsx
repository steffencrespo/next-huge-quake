import { BRAND } from '../design/brand.js';
import type { Brand } from '../design/brand.js';
import { COLORS, TYPE } from '../design/tokens.js';
import { SeismicGlyph } from './SeismicGlyph.js';

export type WordmarkPart = 'glyph' | 'name' | 'rule' | 'tagline';

/**
 * Channel wordmark: seismogram glyph, the brand name in the display face, a red rule and the tagline.
 * `partStyle` lets a scene stage the parts (e.g. entrance motion) without changing the layout.
 */
export const Wordmark: React.FC<{ brand?: Brand; fontSize?: number; partStyle?: ( part: WordmarkPart ) => React.CSSProperties | undefined }> = (
  { brand = BRAND, fontSize = 112, partStyle = () => undefined }
) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    {brand.showGlyph ? <div style={partStyle( 'glyph' )}><SeismicGlyph width={fontSize * 3.4} height={fontSize * 1.05} strokeWidth={fontSize * 0.075} /></div> : null}
    <div style={{ ...TYPE.wordmark, fontSize, color: COLORS.text, whiteSpace: 'nowrap', marginTop: fontSize * 0.3, ...partStyle( 'name' ) }}>{brand.name}</div>
    <div style={{ width: fontSize * 1.4, height: Math.max( 6, fontSize * 0.075 ), background: COLORS.red, marginTop: fontSize * 0.32, transformOrigin: 'center', ...partStyle( 'rule' ) }} />
    {brand.tagline ? <div style={{ ...TYPE.tagline, color: COLORS.text, marginTop: fontSize * 0.32, whiteSpace: 'nowrap', ...partStyle( 'tagline' ) }}>{brand.tagline}</div> : null}
  </div>
);
