/**
 * Camera for the news video: the M2.0 globe-to-epicenter move, retimed for the 35 s timeline and framed for the
 * news layout. A pure function of (frame, target), built from the spike's tested helpers (shortest-arc longitude,
 * easing, approach side), so it keeps the same guarantees: deterministic, no jumps, antimeridian-safe.
 *
 * - Hook (0-180): the globe turns toward the event and zooms in; the epicenter is centered by ~4.4 s.
 * - While the hook magnitude compacts (frames 66-110), camera padding moves the epicenter from the screen center
 *   up into the map zone, above the lower third and data panel.
 * - Facts and Context: a slow push-in. Closing: hold.
 */
import { CANVAS, MAP_ZONE } from '../design/layout.js';
import { easeInOutCubic, lerpLongitude, progress, startCenter } from '../spike/camera.js';
import type { CameraTarget } from '../spike/camera.js';
import type { MapCamera } from './LiveMap.js';

export const NEWS_TIMING = {
  rotateStart: 12,
  rotateEnd: 132,
  zoomStart: 40,
  zoomEnd: 165,
  pitchStart: 100,
  pitchEnd: 190,
  framingStart: 66,
  framingEnd: 110,
  /** End of the slow push (end of the context scene); the camera holds after it. */
  pushEnd: 900
} as const;

export const NEWS_ZOOM = { globe: 2.2, region: 6.2, pushEnd: 6.8 } as const;
const END_PITCH = 30;
const START_BEARING = -12;

/** Bottom padding that puts the camera center (the epicenter, after arrival) at the middle of the map zone. */
export const FRAMED_PADDING_BOTTOM = CANVAS.height - 2 * ( MAP_ZONE.y + MAP_ZONE.height / 2 );

const lerp = ( a: number, b: number, t: number ) => a + ( b - a ) * t;

export function newsCameraAt( frame: number, target: CameraTarget ): MapCamera {
  const t = NEWS_TIMING;
  const [ startLon, startLat ] = startCenter( target );
  const rotate = easeInOutCubic( progress( frame, t.rotateStart, t.rotateEnd ) );
  const zoomIn = easeInOutCubic( progress( frame, t.zoomStart, t.zoomEnd ) );
  const push = progress( frame, t.zoomEnd, t.pushEnd );
  const framing = easeInOutCubic( progress( frame, t.framingStart, t.framingEnd ) );

  return {
    center: [ lerpLongitude( startLon, target.longitude, rotate ), rotate >= 1 ? target.latitude : lerp( startLat, target.latitude, rotate ) ],
    zoom: frame <= t.zoomEnd ? lerp( NEWS_ZOOM.globe, NEWS_ZOOM.region, zoomIn ) : lerp( NEWS_ZOOM.region, NEWS_ZOOM.pushEnd, push ),
    bearing: lerp( START_BEARING, 0, rotate ),
    pitch: lerp( 0, END_PITCH, easeInOutCubic( progress( frame, t.pitchStart, t.pitchEnd ) ) ),
    padding: { top: 0, bottom: Math.round( FRAMED_PADDING_BOTTOM * framing ), left: 0, right: 0 }
  };
}
