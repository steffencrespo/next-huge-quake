/**
 * QuakeNews: the full earthquake news video, driven only by a VideoSpec.
 *
 * Layers: the live news map (M2.0 LiveMap + news camera), a scrim, the four scenes in sequence (Hook, Facts,
 * Context, Closing; frame ranges from the spec), and the TEST DATA watermark for synthetic-test data.
 * `calculateMetadata` re-parses the spec, derives the duration from its scenes and runs the copy guard, so an
 * invalid spec or a failed template check fails the render before frame 0.
 */
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { z } from 'zod';
import { TestDataWatermark } from '../components/Chrome.js';
import { Scrim } from '../components/Scrim.js';
import { buildScreenCopy } from '../copy/screenCopy.js';
import type { ScreenCopy } from '../copy/screenCopy.js';
import { COLORS } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { NewsMap } from '../map/NewsMap.js';
import { ClosingScene } from '../scenes/ClosingScene.js';
import { ContextScene } from '../scenes/ContextScene.js';
import { FactsScene } from '../scenes/FactsScene.js';
import { HookScene, hookScrimStrength } from '../scenes/HookScene.js';
import { videoSpecSchema } from '../spec/schema.js';
import type { SceneKind } from '../spec/schema.js';
import { sceneRanges } from '../spec/timeline.js';
import { resolveQuakeNewsMetadata } from './quakeNewsMetadata.js';

export const quakeNewsSchema = z.object( { spec: videoSpecSchema } );
export type QuakeNewsProps = z.infer<typeof quakeNewsSchema>;

export const calculateQuakeNewsMetadata: CalculateMetadataFunction<QuakeNewsProps> = ( { props } ) => {
  const { spec, ...metadata } = resolveQuakeNewsMetadata( props.spec );
  return { ...metadata, props: { spec } };
};

/** One scene with its scene-relative frame (inside a Sequence, useCurrentFrame is relative). */
const SceneSlot: React.FC<{ kind: SceneKind; copy: ScreenCopy; durationInFrames: number }> = ( { kind, copy, durationInFrames } ) => {
  const frame = useCurrentFrame();
  switch ( kind ) {
    case 'hook':
      return <HookScene copy={copy} frame={frame} />;
    case 'facts':
      return <FactsScene copy={copy} frame={frame} durationInFrames={durationInFrames} />;
    case 'context':
      return <ContextScene copy={copy} frame={frame} durationInFrames={durationInFrames} />;
    case 'closing':
      return <ClosingScene copy={copy} frame={frame} />;
  }
};

export const QuakeNews: React.FC<QuakeNewsProps> = ( { spec } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const copy = buildScreenCopy( spec );

  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <NewsMap spec={spec} />
      <Scrim strength={hookScrimStrength( frame )} />
      {sceneRanges( spec ).map( range => (
        <Sequence key={range.kind} from={range.from} durationInFrames={range.durationInFrames} layout="none">
          <SceneSlot kind={range.kind} copy={copy} durationInFrames={range.durationInFrames} />
        </Sequence>
      ) )}
      {copy.chrome.testData ? <TestDataWatermark text={copy.chrome.testData} /> : null}
    </AbsoluteFill>
  );
};
