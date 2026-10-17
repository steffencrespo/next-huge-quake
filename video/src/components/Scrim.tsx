import { AbsoluteFill } from 'remotion';
import { CANVAS, SAFE } from '../design/layout.js';

const SAFE_BOTTOM = CANVAS.height - SAFE.bottom;

/**
 * Darkens the top and the panel area so chrome and panels stay legible over the map. Below the safe area (the
 * platform-controls zone, where no content goes) it eases back so the map continues to the bottom edge instead of
 * ending in a flat black band.
 */
export const Scrim: React.FC<{ strength?: number }> = ( { strength = 1 } ) => {
  const a = ( alpha: number ) => `rgba(7,11,20,${alpha * strength})`;
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${a( 0.9 )} 0px, ${a( 0 )} 520px, ${a( 0 )} 840px, ${a( 0.88 )} 1180px, ${a( 0.88 )} ${SAFE_BOTTOM}px, ${a( 0.6 )} ${SAFE_BOTTOM + 160}px, ${a( 0.75 )} ${CANVAS.height}px)`
    }} />
  );
};
