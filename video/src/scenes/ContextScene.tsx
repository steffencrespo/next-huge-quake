/**
 * Context scene (default 12 s). Presentational only. The map dims slightly and the context cards appear one at a
 * time, each for an equal share of the scene: one card holds the whole scene, three cards get 4 s each.
 * Only one card is ever on screen, so each stays short enough to read on a phone.
 */
import { AbsoluteFill, interpolate } from 'remotion';
import { Chrome, SourceFooter } from '../components/Chrome.js';
import { ContextCard } from '../components/ContextCard.js';
import type { ScreenCopy } from '../copy/screenCopy.js';
import { slideUp } from '../design/motion.js';

export const CONTEXT_TIMING = { enterDelay: 4, exit: 8, mapDim: 0.45 } as const;

export type Segment = { start: number; end: number };

/** Equal, contiguous segments covering the scene, one per card. */
export function contextSegments( durationInFrames: number, count: number ): Segment[] {
  const length = Math.floor( durationInFrames / count );
  return Array.from( { length: count }, ( _, i ) => ( { start: i * length, end: i === count - 1 ? durationInFrames : ( i + 1 ) * length } ) );
}

/** Index of the card on screen at a scene-relative frame. */
export const cardIndexAt = ( frame: number, segments: Segment[] ) =>
  Math.max( 0, segments.findIndex( s => frame >= s.start && frame < s.end ) );

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const ContextScene: React.FC<{ copy: ScreenCopy; frame: number; durationInFrames: number }> = ( { copy, frame, durationInFrames } ) => {
  const cards = copy.context.cards;
  const segments = contextSegments( durationInFrames, cards.length );
  const index = cardIndexAt( frame, segments );
  const { start, end } = segments[index];
  // Every card, the last one included, fades out at the end of its segment, so the closing starts from a clean map.
  const exit = interpolate( frame, [ end - CONTEXT_TIMING.exit, end ], [ 1, 0 ], clamp );
  const enter = slideUp( frame, start + CONTEXT_TIMING.enterDelay, 30 );

  return (
    <>
      <AbsoluteFill style={{ background: `rgba(7,11,20,${CONTEXT_TIMING.mapDim * interpolate( frame, [ 0, 12 ], [ 0, 1 ], clamp )})` }} />
      <Chrome chrome={copy.chrome} magnitude={copy.hook.magnitude} />
      <ContextCard card={cards[index]} index={index} count={cards.length} style={{ ...enter, opacity: Number( enter.opacity ) * exit }} />
      <SourceFooter text={copy.chrome.source} />
    </>
  );
};
