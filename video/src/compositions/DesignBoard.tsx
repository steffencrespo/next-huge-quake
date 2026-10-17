/**
 * DesignBoard: still frames of the M2.1 identity for visual review (Gate B), built from the real components and
 * the real screen copy of each fixture. Static boards use the no-WebGL backdrop; 'facts-live' draws the same
 * layout over a frame of the live M2.0 map.
 */
import { AbsoluteFill } from 'remotion';
import { assertScreenText } from '../copy/guard.js';
import { allScreenText, buildScreenCopy } from '../copy/screenCopy.js';
import { ClosingCard } from '../components/ClosingCard.js';
import { Chrome, SourceFooter, TestDataWatermark } from '../components/Chrome.js';
import { ContextCard } from '../components/ContextCard.js';
import { DataPanel, factsRows } from '../components/DataPanel.js';
import { HookBlock } from '../components/HookBlock.js';
import { LowerThird } from '../components/LowerThird.js';
import { Scrim } from '../components/Scrim.js';
import { MAP_ZONE } from '../design/layout.js';
import { COLORS } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { DEMO_AS_OF_UTC, FIXTURES } from '../fixtures/index.js';
import type { FixtureKey } from '../fixtures/index.js';
import { StaticBackdrop } from '../map/StaticBackdrop.js';
import { buildVideoSpec } from '../spec/build.js';
import { EpicenterOverlay } from '../spike/EpicenterOverlay.js';
import { MapSpike } from '../spike/MapSpike.js';

export const BOARDS = [ 'hook', 'facts', 'context', 'closing', 'facts-live' ] as const;
export type Board = typeof BOARDS[number];
export type DesignBoardProps = { board: Board; fixture: FixtureKey; card: number };

/**
 * The live board is its own composition (DesignBoardLive) running the spike's 10 s camera; it is rendered as a still
 * at LIVE_FRAME, the regional hold with rings visible.
 */
export const LIVE_FRAME = 270;
/** The spike camera centers the epicenter at y=960; shift the map so it sits in the map zone (QuakeNews uses camera padding instead). */
const LIVE_SHIFT = MAP_ZONE.y + MAP_ZONE.height / 2 - 960;
const MARKER = { x: 540, y: MAP_ZONE.y + MAP_ZONE.height / 2 };
const RINGS_FRAME = 200;

const LiveMapFrame: React.FC<{ fixture: FixtureKey }> = ( { fixture } ) => (
  <AbsoluteFill style={{ background: COLORS.background }}>
    {/* Fade the shifted map's lower edge into the background (the board's stand-in for camera padding). */}
    <div style={{ position: 'absolute', left: 0, top: LIVE_SHIFT, width: 1080, height: 1920, WebkitMaskImage: 'linear-gradient(180deg, #000 82%, transparent 100%)' }}>
      <MapSpike event={fixture === 'noto' ? 'noto' : 'kamchatka'} tiles="local" overlays={false} />
    </div>
  </AbsoluteFill>
);

export const DesignBoard: React.FC<DesignBoardProps> = ( { board, fixture, card } ) => {
  useBundledFonts();
  const spec = buildVideoSpec( FIXTURES[fixture], { asOfUtc: DEMO_AS_OF_UTC, mapMode: board === 'facts-live' ? 'live' : 'static' } );
  const copy = buildScreenCopy( spec );
  assertScreenText( allScreenText( copy ), spec.event );
  const cards = copy.context.cards;
  const cardIndex = Math.min( card, cards.length - 1 );

  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      {board === 'facts-live' ? <LiveMapFrame fixture={fixture} /> : null}
      {board === 'hook' ? <StaticBackdrop variant="globe" /> : null}
      {board === 'facts' || board === 'context' ? (
        <>
          <StaticBackdrop variant="region" />
          <EpicenterOverlay frame={RINGS_FRAME} x={MARKER.x} y={MARKER.y} />
        </>
      ) : null}
      {board === 'context' ? <AbsoluteFill style={{ background: 'rgba(7,11,20,0.45)' }} /> : null}
      {board === 'closing' ? null : <Scrim strength={board === 'hook' ? 0.7 : 1} />}

      <Chrome chrome={copy.chrome} magnitude={board === 'hook' || board === 'closing' ? null : copy.hook.magnitude} />
      {board === 'hook' ? <HookBlock hook={copy.hook} /> : null}
      {board === 'facts' || board === 'facts-live' ? (
        <>
          <LowerThird copy={copy.facts.lowerThird} />
          <DataPanel rows={factsRows( copy )} />
        </>
      ) : null}
      {board === 'context' ? <ContextCard card={cards[cardIndex]} index={cardIndex} count={cards.length} /> : null}
      {board === 'closing' ? <ClosingCard closing={copy.closing} /> : null}
      {board === 'closing' ? null : <SourceFooter text={copy.chrome.source} />}
      {copy.chrome.testData ? <TestDataWatermark text={copy.chrome.testData} /> : null}
    </AbsoluteFill>
  );
};
