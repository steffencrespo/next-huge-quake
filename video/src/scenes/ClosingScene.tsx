/**
 * Closing scene (default 5 s). Presentational only. The map fades to navy behind a staged end card: the glyph
 * draws on, then the wordmark, rule and tagline arrive, followed by the USGS source block and the disclaimers.
 * Everything is on screen by about 2 s and holds to the end. The compact magnitude and the source footer fade out,
 * because the end card carries the full source block. ARCHIVE, update time and the preliminary badge stay.
 */
import { AbsoluteFill, interpolate } from 'remotion';
import { Chrome, SourceFooter } from '../components/Chrome.js';
import { ClosingCard } from '../components/ClosingCard.js';
import type { ClosingPart } from '../components/ClosingCard.js';
import type { ScreenCopy } from '../copy/screenCopy.js';
import { fadeIn, progressAt, slideUp, wipeIn } from '../design/motion.js';
import { COLORS } from '../design/tokens.js';

export const CLOSING_TIMING = {
  mapOut: 18,
  glyph: 10,
  name: 18,
  rule: 26,
  tagline: 32,
  source: 42,
  disclaimers: 52
} as const;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Frame by which every part of the end card has finished entering. */
export const CLOSING_SETTLED = CLOSING_TIMING.disclaimers + 12;

export const ClosingScene: React.FC<{ copy: ScreenCopy; frame: number }> = ( { copy, frame } ) => {
  const t = CLOSING_TIMING;
  const outgoing = { opacity: interpolate( frame, [ 0, 12 ], [ 1, 0 ], clamp ) };
  const part = ( p: ClosingPart ): React.CSSProperties => {
    switch ( p ) {
      case 'glyph':
        return wipeIn( frame, t.glyph, 14 );
      case 'name':
        return slideUp( frame, t.name, 30 );
      case 'rule':
        return { transform: `scaleX(${progressAt( frame, t.rule, 10 )})` };
      case 'tagline':
        return slideUp( frame, t.tagline, 20 );
      case 'source':
        return fadeIn( frame, t.source );
      case 'disclaimers':
        return fadeIn( frame, t.disclaimers );
    }
  };

  return (
    <>
      <AbsoluteFill style={{ background: COLORS.background, opacity: interpolate( frame, [ 0, t.mapOut ], [ 0, 1 ], clamp ) }} />
      <Chrome chrome={copy.chrome} magnitude={copy.hook.magnitude} magnitudeStyle={outgoing} />
      <ClosingCard closing={copy.closing} partStyle={part} />
      <div style={outgoing}><SourceFooter text={copy.chrome.source} /></div>
    </>
  );
};
