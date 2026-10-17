/**
 * QuakeNews: the full earthquake news video, driven only by a VideoSpec.
 *
 * Layers: the live news map (M2.0 LiveMap + news camera), a scrim, the four scenes in sequence (Hook, Facts,
 * Context, Closing; frame ranges from the spec), and the TEST DATA watermark for synthetic-test data.
 * `calculateMetadata` re-parses the spec, derives the duration from its scenes and runs the copy guard, so an
 * invalid spec or a failed template check fails the render before frame 0.
 */
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import { z } from 'zod';
import { TestDataWatermark } from '../components/Chrome.js';
import { Scrim } from '../components/Scrim.js';
import { buildScreenCopy } from '../copy/screenCopy.js';
import type { ScreenCopy } from '../copy/screenCopy.js';
import { COLORS } from '../design/tokens.js';
import { useBundledFonts } from '../design/useBundledFonts.js';
import { NewsMap } from '../map/NewsMap.js';
import type { NewsMapStyle } from '../map/NewsMap.js';
import { productionMapStyle } from '../map/productionMapStyle.js';
import { assertTerrainAvailable, needsTerrain } from '../map/terrainPreflight.js';
import { ClosingScene } from '../scenes/ClosingScene.js';
import { ContextScene } from '../scenes/ContextScene.js';
import { FactsScene } from '../scenes/FactsScene.js';
import { HookScene, hookScrimStrength } from '../scenes/HookScene.js';
import { videoSpecSchema } from '../spec/schema.js';
import type { SceneKind, VideoSpec } from '../spec/schema.js';
import { sceneRanges } from '../spec/timeline.js';
import { resolveQuakeNewsMetadata } from './quakeNewsMetadata.js';

export const quakeNewsSchema = z.object( { spec: videoSpecSchema } );
export type QuakeNewsProps = z.infer<typeof quakeNewsSchema>;

/** Fails before frame 0 when the spec is invalid or the terrain tiles its camera path needs are not prepared. */
export const calculateQuakeNewsMetadata: CalculateMetadataFunction<QuakeNewsProps> = async ( { props } ) => {
  const { spec, ...metadata } = resolveQuakeNewsMetadata( props.spec );
  if ( needsTerrain( spec ) ) {
    const response = await fetch( staticFile( 'terrain/manifest.json' ) );
    if ( !response.ok ) {
      throw new Error( `terrain manifest missing (HTTP ${response.status}) for ${spec.event.id}; run: npm run prepare:terrain -- <path to spec JSON>` );
    }
    assertTerrainAvailable( spec, await response.json() );
  }
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

/**
 * The video body. `mapStyle` selects the map drawn; the footer and closing credits match it (default: the M2.1 map).
 * Production (QuakeNews) passes the b1-cool terrain.
 */
export const QuakeNewsView: React.FC<{ spec: VideoSpec; mapStyle?: NewsMapStyle }> = ( { spec, mapStyle } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const copy = buildScreenCopy( spec, { mapCredits: mapStyle?.credits } );

  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <NewsMap spec={spec} mapStyle={mapStyle} />
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

export const QuakeNews: React.FC<QuakeNewsProps> = ( { spec } ) => <QuakeNewsView spec={spec} mapStyle={productionMapStyle} />;
