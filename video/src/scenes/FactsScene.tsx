/**
 * Facts scene (default 12 s). Presentational only. The lower third continues unchanged from the hook; the data
 * panel opens and its rows arrive one at a time (about one second apart), then everything holds so each fact can
 * be read. The panel and lower third fade out at the end to make room for the context cards.
 */
import { interpolate } from 'remotion';
import { Chrome, SourceFooter } from '../components/Chrome.js';
import { DataPanel, factsRows } from '../components/DataPanel.js';
import { LowerThird } from '../components/LowerThird.js';
import type { ScreenCopy } from '../copy/screenCopy.js';
import { slideUp, wipeIn } from '../design/motion.js';

export const FACTS_TIMING = {
  panelIn: 8,
  firstRow: 16,
  rowStagger: 30,
  /** Frames before the scene end when the panels start to fade out. */
  exit: 14
} as const;

/** Frame (scene-relative) at which row `index` starts to enter. */
export const factsRowStart = ( index: number ) => FACTS_TIMING.firstRow + index * FACTS_TIMING.rowStagger;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const FactsScene: React.FC<{ copy: ScreenCopy; frame: number; durationInFrames: number }> = ( { copy, frame, durationInFrames } ) => {
  const exitStart = durationInFrames - FACTS_TIMING.exit;
  const exit = { opacity: interpolate( frame, [ exitStart, exitStart + 12 ], [ 1, 0 ], clamp ) };
  return (
    <>
      <Chrome chrome={copy.chrome} magnitude={copy.hook.magnitude} />
      <LowerThird copy={copy.facts.lowerThird} style={exit} />
      <DataPanel
        rows={factsRows( copy )}
        style={{ ...wipeIn( frame, FACTS_TIMING.panelIn, 10 ), ...exit }}
        rowStyle={i => slideUp( frame, factsRowStart( i ), 24 )}
      />
      <SourceFooter text={copy.chrome.source} />
    </>
  );
};
