import { Composition, Still } from 'remotion';
import { DesignBoard } from './compositions/DesignBoard.js';
import type { DesignBoardProps } from './compositions/DesignBoard.js';
import { QuakeNews, calculateQuakeNewsMetadata, quakeNewsSchema } from './compositions/QuakeNews.js';
import { DEMO_AS_OF_UTC, FIXTURES } from './fixtures/index.js';
import { buildVideoSpec } from './spec/build.js';
import { totalFrames } from './spec/timeline.js';
import { DURATION_FRAMES, FPS } from './spike/camera.js';
import { MapSpike } from './spike/MapSpike.js';
import type { MapSpikeProps } from './spike/MapSpike.js';

/** Studio default; renders pass their own spec with --props (see scripts/render-news.ts). */
const defaultSpec = buildVideoSpec( FIXTURES.noto, { asOfUtc: DEMO_AS_OF_UTC } );

export const Root: React.FC = () => (
  <>
    <Composition
      id="QuakeNews"
      component={QuakeNews}
      schema={quakeNewsSchema}
      calculateMetadata={calculateQuakeNewsMetadata}
      width={defaultSpec.format.width}
      height={defaultSpec.format.height}
      fps={defaultSpec.format.fps}
      durationInFrames={totalFrames( defaultSpec )}
      defaultProps={{ spec: defaultSpec }}
    />
    <Composition
      id="MapSpike"
      component={MapSpike}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={DURATION_FRAMES}
      defaultProps={{ event: 'noto', tiles: 'local' } satisfies MapSpikeProps}
    />
    <Still
      id="DesignBoard"
      component={DesignBoard}
      width={1080}
      height={1920}
      defaultProps={{ board: 'hook', fixture: 'noto', card: 0 } satisfies DesignBoardProps}
    />
    <Composition
      id="DesignBoardLive"
      component={DesignBoard}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={DURATION_FRAMES}
      defaultProps={{ board: 'facts-live', fixture: 'noto', card: 0 } satisfies DesignBoardProps}
    />
  </>
);
