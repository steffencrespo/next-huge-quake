import type { ScreenCopy } from '../copy/screenCopy.js';
import { REGIONS, rectStyle } from '../design/layout.js';
import { COLORS, TYPE } from '../design/tokens.js';
import { SeismicGlyph } from './SeismicGlyph.js';

const ROW_HEIGHT = 64;

const Block: React.FC<{ background: string; border?: string; children: React.ReactNode }> = ( { background, border, children } ) => (
  <div style={{ height: ROW_HEIGHT, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', background, boxSizing: 'border-box', border: border ? `3px solid ${border}` : undefined }}>
    {children}
  </div>
);

/** Red EARTHQUAKE tag with the seismic glyph. */
export const BreakingTag: React.FC<{ text: string }> = ( { text } ) => (
  <Block background={COLORS.red}>
    <SeismicGlyph width={64} height={30} color={COLORS.text} strokeWidth={4} />
    <span style={{ ...TYPE.tag, color: COLORS.text }}>{text}</span>
  </Block>
);

export const ArchiveChip: React.FC<{ text: string }> = ( { text } ) => (
  <Block background={COLORS.charcoal} border={COLORS.textSecondary}>
    <span style={{ ...TYPE.tag, color: COLORS.text }}>{text}</span>
  </Block>
);

/** Compact magnitude lockup, shown once the hook numeral has left the screen. */
export const CompactMagnitude: React.FC<{ magnitude: string }> = ( { magnitude } ) => (
  <Block background={COLORS.panel}>
    <span style={{ ...TYPE.magnitudeCompact, color: COLORS.redText }}>M</span>
    <span style={{ ...TYPE.magnitudeCompact, color: COLORS.text }}>{magnitude}</span>
  </Block>
);

export const PreliminaryBadge: React.FC<{ badge: string; detail: string }> = ( { badge, detail } ) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, height: 52, padding: '0 18px', background: COLORS.amber, color: COLORS.onAmber, alignSelf: 'flex-start' }}>
    <span style={{ ...TYPE.tag, fontSize: 38, letterSpacing: 4 }}>{badge}</span>
    <span style={{ ...TYPE.fine, fontWeight: 600 }}>{detail}</span>
  </div>
);

/**
 * Persistent top chrome: tag row (EARTHQUAKE, ARCHIVE, compact magnitude), archive date, USGS update time and
 * the preliminary badge. Everything stays inside REGIONS.chrome.
 */
export const Chrome: React.FC<{ chrome: ScreenCopy['chrome']; magnitude?: string | null; magnitudeStyle?: React.CSSProperties; style?: React.CSSProperties }> = (
  { chrome, magnitude = null, magnitudeStyle, style }
) => (
  <div style={{ ...rectStyle( REGIONS.chrome ), display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <BreakingTag text={chrome.tag} />
      {chrome.archive ? <ArchiveChip text={chrome.archive.badge} /> : null}
      <div style={{ flex: 1 }} />
      {magnitude ? <div style={magnitudeStyle}><CompactMagnitude magnitude={magnitude} /></div> : null}
    </div>
    {chrome.archive ? <div style={{ ...TYPE.meta, fontWeight: 600, color: COLORS.text, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>{chrome.archive.detail}</div> : null}
    <div style={{ ...TYPE.meta, color: COLORS.textSupport, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>{chrome.updated}</div>
    {chrome.preliminary ? <PreliminaryBadge badge={chrome.preliminary.badge} detail={chrome.preliminary.detail} /> : null}
  </div>
);

export const SourceFooter: React.FC<{ text: string }> = ( { text } ) => (
  <div style={{ ...rectStyle( REGIONS.footer ), display: 'flex', alignItems: 'center', gap: 14 }}>
    <div style={{ width: 12, height: 12, background: COLORS.red, flexShrink: 0 }} />
    <span style={{ ...TYPE.meta, color: COLORS.textSupport, textShadow: '0 2px 12px rgba(0,0,0,0.9)' }}>{text}</span>
  </div>
);

/** Permanent diagonal watermark for synthetic-test data. */
export const TestDataWatermark: React.FC<{ text: string }> = ( { text } ) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 360 }}>
    {[ 0, 1, 2 ].map( i => (
      <div key={i} style={{ ...TYPE.headline, fontSize: 76, color: 'rgba(255, 90, 95, 0.16)', transform: 'rotate(-24deg)', whiteSpace: 'nowrap', WebkitTextStroke: '2px rgba(255, 90, 95, 0.4)' }}>
        {text}
      </div>
    ) )}
  </div>
);
