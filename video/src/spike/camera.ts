/**
 * Frame-driven camera. A pure function of (frame, event): no clocks, no randomness,
 * so every render of the same frame produces the same camera state.
 */
export const FPS = 30;
export const DURATION_FRAMES = 300;

/** Scene timing in frames (illustrative 10 s spike: hook, approach, epicenter hold). */
export const TIMING = {
  hookEnd: 30,
  rotateStart: 15,
  rotateEnd: 120,
  zoomStart: 45,
  zoomEnd: 180,
  ringsStart: 165
} as const;

export const ZOOM = { globe: 2.2, region: 6.2, holdEnd: 6.6 } as const;
const APPROACH_LONGITUDE_OFFSET = 75;
const APPROACH_LATITUDE_OFFSET = -18;
const END_PITCH = 30;
const START_BEARING = -12;

export type CameraTarget = { latitude: number; longitude: number; approachFrom: 'west' | 'east' };
export type CameraState = { center: [ number, number ]; zoom: number; bearing: number; pitch: number };

export const clamp01 = ( t: number ) => Math.min( 1, Math.max( 0, t ) );
export const progress = ( frame: number, start: number, end: number ) => clamp01( ( frame - start ) / ( end - start ) );
export const easeInOutCubic = ( t: number ) => t < 0.5 ? 4 * t * t * t : 1 - ( ( -2 * t + 2 ) ** 3 ) / 2;
export const easeOutCubic = ( t: number ) => 1 - ( 1 - t ) ** 3;
const lerp = ( a: number, b: number, t: number ) => a + ( b - a ) * t;

/** Wrap a longitude to [-180, 180). */
export const wrapLongitude = ( lon: number ) => ( ( ( lon + 180 ) % 360 ) + 360 ) % 360 - 180;

/** Interpolate along the shortest arc, so a path near the antimeridian never swings the long way round the globe. */
export function lerpLongitude( from: number, to: number, t: number ): number {
  if ( t >= 1 ) {
    return to;
  }
  const delta = ( ( ( to - from + 540 ) % 360 ) + 360 ) % 360 - 180;
  return wrapLongitude( from + delta * t );
}

export function startCenter( target: CameraTarget ): [ number, number ] {
  const offset = target.approachFrom === 'west' ? -APPROACH_LONGITUDE_OFFSET : APPROACH_LONGITUDE_OFFSET;
  return [ wrapLongitude( target.longitude + offset ), Math.max( -60, Math.min( 60, target.latitude + APPROACH_LATITUDE_OFFSET ) ) ];
}

export function cameraAt( frame: number, target: CameraTarget ): CameraState {
  const [ startLon, startLat ] = startCenter( target );
  const rotate = easeInOutCubic( progress( frame, TIMING.rotateStart, TIMING.rotateEnd ) );
  const zoomIn = easeInOutCubic( progress( frame, TIMING.zoomStart, TIMING.zoomEnd ) );
  const hold = progress( frame, TIMING.zoomEnd, DURATION_FRAMES - 1 );

  const zoom = frame <= TIMING.zoomEnd ?
    lerp( ZOOM.globe, ZOOM.region, zoomIn ) :
    lerp( ZOOM.region, ZOOM.holdEnd, hold );

  return {
    center: [ lerpLongitude( startLon, target.longitude, rotate ), rotate >= 1 ? target.latitude : lerp( startLat, target.latitude, rotate ) ],
    zoom,
    bearing: lerp( START_BEARING, 0, rotate ),
    pitch: lerp( 0, END_PITCH, easeInOutCubic( progress( frame, TIMING.zoomStart + 45, TIMING.zoomEnd + 30 ) ) )
  };
}
