import { Composition, registerRoot } from 'remotion';
import type { CalculateMetadataFunction } from 'remotion';
import type { Soundtrack } from '../../src/audio/soundtrack.js';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { Captions, SoundtrackAudio } from '../../src/audio/SoundtrackLayers.js';
import { Scrim } from '../../src/components/Scrim.js';
import { buildScreenCopy } from '../../src/copy/screenCopy.js';
import { COLORS } from '../../src/design/tokens.js';
import { useBundledFonts } from '../../src/design/useBundledFonts.js';
import { LiveMap } from '../../src/map/LiveMap.js';
import { RINGS_START } from '../../src/map/NewsMap.js';
import { newsCameraAt } from '../../src/map/newsCamera.js';
import { EpicenterOverlay } from '../../src/spike/EpicenterOverlay.js';
import { ClosingScene } from '../../src/scenes/ClosingScene.js';
import { ContextScene } from '../../src/scenes/ContextScene.js';
import { FactsScene } from '../../src/scenes/FactsScene.js';
import { HookScene, hookScrimStrength } from '../../src/scenes/HookScene.js';
import { sceneRanges } from '../../src/spec/timeline.js';
import { QuakeNewsView } from '../../src/compositions/QuakeNews.js';
import { productionMapStyle } from '../../src/map/productionMapStyle.js';
import type { VideoSpec } from '../../src/spec/schema.js';
import { totalFrames } from '../../src/spec/timeline.js';

/**
 * DISPOSABLE pacing experiment. Same QuakeNewsView as production, but the spec is not run through the 30 s minimum
 * duration check (the faster variants are shorter). Not part of the pipeline.
 */
type Props = { spec: VideoSpec; soundtrack: Soundtrack };

const metadata: CalculateMetadataFunction<Props> = ( { props } ) => ( {
  durationInFrames: totalFrames( props.spec ), fps: props.spec.format.fps, width: props.spec.format.width, height: props.spec.format.height
} );

const Pacing: React.FC<Props> = ( { spec, soundtrack } ) => <QuakeNewsView spec={spec} mapStyle={productionMapStyle} soundtrack={soundtrack} />;

/**
 * D2/D3: QuakeNewsView with two experiment-only knobs: the camera's slow push ends with the context scene
 * (`pushEnd`), and the closing card's entrance can be played faster (`closingSpeed`) for a shorter closing scene.
 */
type Props2 = Props & { pushEnd: number; closingSpeed: number };
const Slot: React.FC<{ kind: string; copy: ReturnType<typeof buildScreenCopy>; durationInFrames: number; closingSpeed: number }> = ( { kind, copy, durationInFrames, closingSpeed } ) => {
  const frame = useCurrentFrame();
  if ( kind === 'hook' ) return <HookScene copy={copy} frame={frame} />;
  if ( kind === 'facts' ) return <FactsScene copy={copy} frame={frame} durationInFrames={durationInFrames} />;
  if ( kind === 'context' ) return <ContextScene copy={copy} frame={frame} durationInFrames={durationInFrames} />;
  return <ClosingScene copy={copy} frame={frame * closingSpeed} />;
};
const Pacing2: React.FC<Props2> = ( { spec, soundtrack, pushEnd, closingSpeed } ) => {
  useBundledFonts();
  const frame = useCurrentFrame();
  const copy = buildScreenCopy( spec, { mapCredits: productionMapStyle.credits } );
  const { event, map } = spec;
  const target = { latitude: event.latitude, longitude: event.longitude, approachFrom: map.approachFrom };
  return (
    <AbsoluteFill style={{ background: COLORS.background }}>
      <LiveMap
        cameraAt={f => newsCameraAt( f, target, { pushEnd } )}
        epicenter={[ event.longitude, event.latitude ]}
        tiles="local"
        style={productionMapStyle.style}
        allowedHosts={productionMapStyle.allowedHosts}
        diagnostics={{ event: event.id, tiles: 'local', style: productionMapStyle.name }}
        background={COLORS.background}
        overlay={( marker, f ) => <EpicenterOverlay frame={f} x={marker.x} y={marker.y} start={RINGS_START} />}
      />
      <Scrim strength={hookScrimStrength( frame )} />
      {sceneRanges( spec ).map( range => (
        <Sequence key={range.kind} from={range.from} durationInFrames={range.durationInFrames} layout="none">
          <Slot kind={range.kind} copy={copy} durationInFrames={range.durationInFrames} closingSpeed={closingSpeed} />
        </Sequence>
      ) )}
      <Captions soundtrack={soundtrack} />
      <SoundtrackAudio soundtrack={soundtrack} />
    </AbsoluteFill>
  );
};
const metadata2: CalculateMetadataFunction<Props2> = ( { props } ) => metadata( { props } as never ) as never;

registerRoot( () => (
  <>
  <Composition id="PanamaPacing2" component={Pacing2} width={1080} height={1920} fps={30} durationInFrames={900}
    calculateMetadata={metadata2} defaultProps={{} as Props2} />
  <Composition id="PanamaPacing" component={Pacing} width={1080} height={1920} fps={30} durationInFrames={1050}
    calculateMetadata={metadata} defaultProps={{} as Props} />
  </>
) );
