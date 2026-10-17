/**
 * Hook scene (0-6 s). Presentational only: it receives the screen copy and draws over whatever map layer the
 * composition provides.
 *
 * - 0-66: the magnitude lockup is complete and dominant from frame 0, over the turning globe.
 * - 66-90: the lockup compacts. Kicker, trace, place and date fade; the numeral shrinks toward the compact
 *   "M 7.5" lockup in the top bar and is gone before the lockup fades in (no double image). The map zone is clear.
 * - 104-180: the lower third (place name) enters with the seismic tick and stays into the Facts scene.
 */
import { Easing, interpolate } from 'remotion';
import { Chrome, SourceFooter } from '../components/Chrome.js';
import { HOOK_NUMERAL_CENTER_Y, HookBlock } from '../components/HookBlock.js';
import { LowerThird } from '../components/LowerThird.js';
import type { ScreenCopy } from '../copy/screenCopy.js';
import { REGIONS } from '../design/layout.js';
import { fadeIn, seismicTick, wipeIn } from '../design/motion.js';
import { COLORS } from '../design/tokens.js';

export const HOOK_TIMING = {
  compactStart: 66,
  detailsGone: 80,
  numeralFadeStart: 76,
  numeralGone: 88,
  compactEnd: 90,
  lockupIn: 87,
  lowerThirdTick: 104,
  lowerThirdIn: 107
} as const;

/** Where the hero numeral travels to: the numerals of the compact lockup at the right end of the chrome's tag row. */
const COMPACT_TARGET = { x: 888, y: REGIONS.chrome.y + 9 };
const COMPACT_SCALE = 60 / 440;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const EASE = Easing.inOut( Easing.cubic );

/** Scrim strength over the map: lighter while the globe sits behind the hero, full once the layout compacts. */
export const hookScrimStrength = ( frame: number ) =>
  interpolate( frame, [ HOOK_TIMING.compactStart, HOOK_TIMING.compactEnd + 14 ], [ 0.7, 1 ], { ...clamp, easing: EASE } );

export const HookScene: React.FC<{ copy: ScreenCopy; frame: number }> = ( { copy, frame } ) => {
  const t = HOOK_TIMING;
  const move = interpolate( frame, [ t.compactStart, t.compactEnd ], [ 0, 1 ], { ...clamp, easing: EASE } );
  const origin = { x: REGIONS.hook.x + REGIONS.hook.width / 2, y: REGIONS.hook.y + HOOK_NUMERAL_CENTER_Y };
  const heroStyle: React.CSSProperties = {
    transform: `translate(${( COMPACT_TARGET.x - origin.x ) * move}px, ${( COMPACT_TARGET.y - origin.y ) * move}px) scale(${1 + ( COMPACT_SCALE - 1 ) * move})`,
    opacity: interpolate( frame, [ t.numeralFadeStart, t.numeralGone ], [ 1, 0 ], clamp )
  };
  const detailsStyle = { opacity: interpolate( frame, [ t.compactStart, t.detailsGone ], [ 1, 0 ], clamp ) };
  const tick = seismicTick( frame, t.lowerThirdTick );
  const heroVisible = frame < t.numeralGone;

  return (
    <>
      <Chrome chrome={copy.chrome} magnitude={copy.hook.magnitude} magnitudeStyle={fadeIn( frame, t.lockupIn, 10 )} />
      {heroVisible ? <HookBlock hook={copy.hook} style={heroStyle} secondaryStyle={detailsStyle} /> : null}
      {frame >= t.lowerThirdTick ? (
        <>
          <div style={{ position: 'absolute', left: REGIONS.lowerThird.x, top: REGIONS.lowerThird.y + 48, width: REGIONS.lowerThird.width, height: 8, background: COLORS.red, transformOrigin: 'left', transform: `scaleX(${tick.scaleX})`, opacity: tick.opacity }} />
          <LowerThird copy={copy.facts.lowerThird} style={wipeIn( frame, t.lowerThirdIn, 12 )} />
        </>
      ) : null}
      <SourceFooter text={copy.chrome.source} />
    </>
  );
};
