import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { LiveMap } from '../map/LiveMap.js';
import { cameraAt } from './camera.js';
import { EpicenterOverlay } from './EpicenterOverlay.js';
import { EVENTS } from './events.js';
import type { EventKey } from './events.js';
import { MagnitudeHook } from './MagnitudeHook.js';
import { ATTRIBUTION } from './styles.js';
import type { TileMode } from './styles.js';

/** `overlays: false` hides the spike's placeholder text (hook, attribution) so other layouts can draw over the map. */
export type MapSpikeProps = { event: EventKey; tiles: TileMode; overlays?: boolean };

/** The M2.0 spike composition, now built on the extracted LiveMap (same camera, gate, overlay and diagnostics). */
export const MapSpike: React.FC<MapSpikeProps> = ( { event: eventKey, tiles, overlays = true } ) => {
  const frame = useCurrentFrame();
  const event = EVENTS[eventKey];

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <LiveMap
        cameraAt={f => cameraAt( f, event )}
        epicenter={[ event.longitude, event.latitude ]}
        tiles={tiles}
        diagnostics={{ event: eventKey, tiles }}
        overlay={( marker, f ) => <EpicenterOverlay frame={f} x={marker.x} y={marker.y} />}
      >
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)' }} />
      </LiveMap>
      {overlays ? <MagnitudeHook frame={frame} event={event} /> : null}
      {overlays ? (
        <div style={{ position: 'absolute', left: 40, bottom: 48, fontFamily: 'Helvetica Neue, Arial, sans-serif', fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
          {ATTRIBUTION[tiles]}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
