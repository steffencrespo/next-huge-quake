import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MAP_ZONE } from '../design/layout.js';
import { COLORS } from '../design/tokens.js';
import type { VideoSpec } from '../spec/schema.js';
import { EpicenterOverlay } from '../spike/EpicenterOverlay.js';
import { LiveMap } from './LiveMap.js';
import { newsCameraAt } from './newsCamera.js';
import { StaticBackdrop } from './StaticBackdrop.js';

/**
 * Marker and decorative rings fade in from frame 105 as the camera arrives (fixed timing and size, never scaled to
 * the event).
 */
export const RINGS_START = 135;

/**
 * The map layer of the news video. Live mode: the M2.0 LiveMap (readiness gate, diagnostics) driven by the news
 * camera. Static mode: the no-WebGL backdrop, for design iteration only.
 */
export const NewsMap: React.FC<{ spec: VideoSpec }> = ( { spec } ) => {
  const frame = useCurrentFrame();
  const { event, map } = spec;
  const target = { latitude: event.latitude, longitude: event.longitude, approachFrom: map.approachFrom };

  if ( map.mode === 'static' ) {
    return (
      <AbsoluteFill>
        <StaticBackdrop variant={frame < RINGS_START - 30 ? 'globe' : 'region'} />
        <EpicenterOverlay frame={frame} x={540} y={MAP_ZONE.y + MAP_ZONE.height / 2} start={RINGS_START} />
      </AbsoluteFill>
    );
  }
  return (
    <LiveMap
      cameraAt={f => newsCameraAt( f, target )}
      epicenter={[ event.longitude, event.latitude ]}
      tiles="local"
      diagnostics={{ event: event.id, tiles: 'local' }}
      background={COLORS.background}
      overlay={( marker, f ) => <EpicenterOverlay frame={f} x={marker.x} y={marker.y} start={RINGS_START} />}
    />
  );
};
