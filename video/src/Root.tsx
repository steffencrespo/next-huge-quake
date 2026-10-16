import { Composition } from 'remotion';
import { DURATION_FRAMES, FPS } from './spike/camera.js';
import { MapSpike } from './spike/MapSpike.js';
import type { MapSpikeProps } from './spike/MapSpike.js';

export const Root: React.FC = () => (
  <Composition
    id="MapSpike"
    component={MapSpike}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={DURATION_FRAMES}
    defaultProps={{ event: 'noto', tiles: 'local' } satisfies MapSpikeProps}
  />
);
