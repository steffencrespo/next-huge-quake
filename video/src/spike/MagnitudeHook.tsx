import { interpolate } from 'remotion';
import { TIMING } from './camera.js';
import type { SpikeEvent } from './events.js';

/** Plain magnitude + place typography (spike only, not final branding). Fully visible from frame 0. */
export const MagnitudeHook: React.FC<{ frame: number; event: SpikeEvent }> = ( { frame, event } ) => {
  const settle = interpolate( frame, [ TIMING.hookEnd, TIMING.hookEnd + 45 ], [ 0, 1 ], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } );
  const scale = interpolate( settle, [ 0, 1 ], [ 1, 0.55 ] );
  const top = interpolate( settle, [ 0, 1 ], [ 640, 150 ] );

  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${scale})`, transformOrigin: 'top center', fontFamily: 'Helvetica Neue, Arial, sans-serif', color: '#fff', textShadow: '0 0 40px rgba(0,0,0,0.9)' }}>
      <div style={{ fontSize: 52, letterSpacing: 14, fontWeight: 700, color: '#ff3b30' }}>MAGNITUDE</div>
      <div style={{ fontSize: 330, lineHeight: 1, fontWeight: 900, letterSpacing: -8 }}>{event.magnitude.toFixed( 1 )}</div>
      <div style={{ fontSize: 56, fontWeight: 700, marginTop: 24, letterSpacing: 2, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{event.place}</div>
    </div>
  );
};
