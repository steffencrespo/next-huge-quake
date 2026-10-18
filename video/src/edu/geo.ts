/**
 * Educational Short "Why Do Earthquakes Happen?": timeline and the pure geological model.
 *
 * Everything is a pure function of time in seconds (no randomness except seeded generators), so a frame always
 * renders the same. World coordinates are pixels at zoom 1: x to the right, y down, the ground surface at y = 0.
 *
 * The model is a schematic cross-section of a dipping fault (dip-slip). The hanging wall (above the fault) and the
 * footwall (below it) slide past each other along the fault plane. While the fault is free, the blocks slip steadily.
 * The central patch of the fault then locks: the blocks far from it keep moving, so the rock next to the patch is
 * dragged and bends (elastic strain, the slip deficit `delta` grows). When the stress exceeds friction the patch
 * slips: the rupture spreads along the fault, the bent rock springs back (elastic rebound) and P and S waves leave
 * the focus. Fault displacement uses the standard interseismic profile u = (s / pi) * atan(distance / width).
 */

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const sec = ( s: number ) => Math.round( s * FPS );

/** Scene boundaries in seconds (provisional; they follow the approved storyboard). */
export const SCENES = [
  { id: 'hook', from: 0, to: 5 },
  { id: 'plates', from: 5, to: 17 },
  { id: 'pressure', from: 17, to: 31 },
  { id: 'rupture', from: 31, to: 43 },
  { id: 'earthquake', from: 43, to: 52 },
  { id: 'cta', from: 52, to: 60 }
] as const;
export const TOTAL_FRAMES = sec( 60 );

export const EVENTS = {
  platesStart: 5,
  lockStart: 17.2,
  lockedAt: 18.2,
  rupture: 32.3
} as const;

const DIP = ( 35 * Math.PI ) / 180;
/** Unit vector along the fault, pointing down-dip. */
export const D = { x: Math.cos( DIP ), y: Math.sin( DIP ) };
/** Unit normal, pointing to the hanging wall side (up and to the right). */
export const N = { x: Math.sin( DIP ), y: -Math.cos( DIP ) };
export const FOCUS = { x: 0, y: 520 };
/** Fault extent along the fault coordinate `a` (px from the focus). The fault tip stays 150 px below the surface: no surface rupture. */
export const FAULT = { top: -645, bottom: 836, lockedHalf: 260, taper: 120 } as const;
export const faultPoint = ( a: number ) => ( { x: FOCUS.x + D.x * a, y: FOCUS.y + D.y * a } );

const W_FREE = 7;
const W_LOCKED = 150;
/** Plate relative slip rate, px per second. */
const PLATE_RATE = 8;
export const DELTA_MAX = PLATE_RATE * ( EVENTS.rupture - EVENTS.lockedAt );
const RUPTURE_SPEED = 300;
const RUPTURE_EDGE = 50;
export const RUPTURE_SECONDS = ( FAULT.lockedHalf + FAULT.taper ) / RUPTURE_SPEED + RUPTURE_EDGE / RUPTURE_SPEED;

/** P speed in px/s (S = P / sqrt(3), the Poisson-solid ratio). Chosen so P reaches the surface at ~41 s and S at ~47 s. */
export const VP = 59.7;
export const VS = VP / Math.sqrt( 3 );

const clamp = ( x: number, lo = 0, hi = 1 ) => Math.min( hi, Math.max( lo, x ) );
export const lerp = ( a: number, b: number, t: number ) => a + ( b - a ) * t;
export const smooth = ( x: number ) => {
  const t = clamp( x );
  return t * t * ( 3 - 2 * t );
};
/** Window opacity: ramps in at t0, out at t1. */
export const win = ( t: number, t0: number, t1: number, fade = 0.45 ) =>
  clamp( ( t - t0 ) / fade ) * clamp( ( t1 - t ) / fade );

export type FaultState = { plate: number; locked: number; delta: number; stress: number; ruptureFront: number };

export function faultState( t: number ): FaultState {
  const plate = PLATE_RATE * clamp( t - EVENTS.platesStart, 0, EVENTS.rupture - EVENTS.platesStart );
  const locked = PLATE_RATE * clamp( t - EVENTS.platesStart, 0, EVENTS.lockedAt - EVENTS.platesStart );
  const delta = plate - locked;
  const ruptureFront = t > EVENTS.rupture ? ( t - EVENTS.rupture ) * RUPTURE_SPEED : -1;
  const released = smooth( ( t - EVENTS.rupture ) / RUPTURE_SECONDS );
  return { plate, locked, delta, stress: clamp( delta / DELTA_MAX ) * ( 1 - released ), ruptureFront };
}

const gs = ( dist: number, width: number ) => ( 2 / Math.PI ) * Math.atan( dist / width );

export function faultDisplacement( px: number, py: number, t: number ): { x: number; y: number } {
  const { locked, delta, ruptureFront } = faultState( t );
  if ( locked === 0 && delta === 0 ) {
    return { x: 0, y: 0 };
  }
  const rx = px - FOCUS.x;
  const ry = py - FOCUS.y;
  const dist = N.x * rx + N.y * ry;
  const a = D.x * rx + D.y * ry;
  // Beyond the fault ends the offset fades out smoothly, so the surface above the fault tip bends instead of breaking.
  const beyond = a < FAULT.top ? FAULT.top - a : a > FAULT.bottom ? a - FAULT.bottom : 0;
  const width = W_FREE + beyond * 0.8;
  const aa = Math.abs( a );
  let lockedWidth = aa <= FAULT.lockedHalf ? W_LOCKED : lerp( W_LOCKED, W_FREE, smooth( ( aa - FAULT.lockedHalf ) / FAULT.taper ) );
  lockedWidth = Math.max( lockedWidth, width );
  if ( ruptureFront >= 0 ) {
    lockedWidth = lerp( lockedWidth, width, smooth( ( ruptureFront - aa ) / RUPTURE_EDGE + 0.5 ) );
  }
  const s = -( locked / 2 ) * gs( dist, width ) - ( delta / 2 ) * gs( dist, lockedWidth );
  return { x: D.x * s, y: D.y * s };
}

const envelope = ( tau: number, decay: number ) => ( tau < 0 ? 0 : Math.min( 1, tau / 0.12 ) * Math.exp( -tau / decay ) );

/** Seismic wave displacement: P pushes along the direction of travel, S shakes across it; both strongest at the surface. */
export function waveDisplacement( px: number, py: number, t: number ): { x: number; y: number } {
  const tw = t - EVENTS.rupture;
  if ( tw <= 0 ) {
    return { x: 0, y: 0 };
  }
  const rx = px - FOCUS.x;
  const ry = py - FOCUS.y;
  const r = Math.max( 1, Math.hypot( rx, ry ) );
  const ux = rx / r;
  const uy = ry / r;
  const gain = ( 1 / ( 1 + r / 400 ) ) * ( 1 + 2 * Math.exp( -Math.max( py, 0 ) / 160 ) );
  const p = 8 * gain * envelope( tw - r / VP, 1.6 ) * Math.sin( 2 * Math.PI * 3.6 * ( tw - r / VP ) );
  const s = 17 * gain * envelope( tw - r / VS, 4.5 ) * Math.sin( 2 * Math.PI * 2.4 * ( tw - r / VS ) + 1 );
  return { x: ux * p - uy * s, y: uy * p + ux * s };
}

/** The opening tremor: only the surface layer shakes, first hard, then settling. */
export function hookShake( px: number, py: number, t: number ): { x: number; y: number } {
  const env = smooth( ( t - 0.3 ) / 0.6 ) * ( 1 - smooth( ( t - 3 ) / 1.6 ) );
  if ( env === 0 ) {
    return { x: 0, y: 0 };
  }
  const depth = Math.exp( -Math.max( py, 0 ) / 220 );
  return { x: 13 * env * depth * Math.sin( 2 * Math.PI * 3.1 * t + 1 ), y: 9 * env * depth * Math.sin( 2 * Math.PI * 4.3 * t ) };
}

/** Where a rock at (x, y) in the undeformed cross-section is at time t. */
export function mapPoint( x: number, y: number, t: number ): [ number, number ] {
  const f = faultDisplacement( x, y, t );
  const w = waveDisplacement( x, y, t );
  const h = hookShake( x, y, t );
  return [ x + f.x + w.x + h.x, y + f.y + w.y + h.y ];
}

/** Time (s) a wave of speed `v` from the focus reaches the surface point `x`. */
export const arrival = ( x: number, v: number ) => EVENTS.rupture + Math.hypot( x - FOCUS.x, FOCUS.y ) / v;

// ---------- camera ----------

export type Camera = { cx: number; cy: number; z: number };
const KEYS: [ number, number, number, number ][] = [
  [ 0, 0, -300, 1.0 ],
  [ 2.2, 0, -300, 1.0 ],
  [ 5.0, 0, 330, 0.9 ],
  [ 16.5, 0, 380, 0.82 ],
  [ 20.5, 0, 470, 1.1 ],
  [ 31, 0, 500, 1.18 ],
  [ 34.5, 0, 470, 0.95 ],
  [ 38, 0, 330, 0.9 ],
  [ 43, 0, -120, 1.0 ],
  [ 52, 0, -100, 1.04 ],
  [ 60, 0, -100, 1.04 ]
];

export function cameraAt( t: number ): Camera {
  let i = 0;
  while ( i < KEYS.length - 2 && t > KEYS[i + 1][0] ) {
    i++;
  }
  const [ t0, x0, y0, z0 ] = KEYS[i];
  const [ t1, x1, y1, z1 ] = KEYS[i + 1];
  const k = smooth( ( t - t0 ) / ( t1 - t0 ) );
  return { cx: lerp( x0, x1, k ), cy: lerp( y0, y1, k ), z: lerp( z0, z1, k ) };
}

/** World point to screen pixels. */
export const project = ( cam: Camera, x: number, y: number ): [ number, number ] =>
  [ WIDTH / 2 + ( x - cam.cx ) * cam.z, HEIGHT / 2 + ( y - cam.cy ) * cam.z ];

/** Small camera rumble at the moment of rupture, px. */
export function rumble( t: number ): [ number, number ] {
  const tw = t - EVENTS.rupture;
  if ( tw < 0 || tw > 2 ) {
    return [ 0, 0 ];
  }
  const e = Math.exp( -tw / 0.6 );
  return [ 9 * e * Math.sin( 2 * Math.PI * 11 * tw ), 7 * e * Math.sin( 2 * Math.PI * 13 * tw + 1 ) ];
}

// ---------- placeholder narration (timed on-screen text; replaced by approved narration later) ----------

export const CAPTIONS: { text: string; start: number; end: number }[] = [
  { text: 'Why does the ground suddenly start shaking?', start: 0.8, end: 4.6 },
  { text: 'Earth’s outer shell is broken into massive tectonic plates.', start: 5.6, end: 10.8 },
  { text: 'And they’re constantly moving.', start: 11.4, end: 15.6 },
  { text: 'But along a fault, rocks can get stuck.', start: 17.4, end: 22 },
  { text: 'As the surrounding crust keeps moving, stress builds up.', start: 22.6, end: 29.6 },
  { text: 'Eventually, the stress overcomes friction.', start: 31.2, end: 33.4 },
  { text: 'The rocks suddenly slip, releasing energy as seismic waves.', start: 33.8, end: 40 },
  { text: 'Those waves travel through the Earth', start: 43.4, end: 46.4 },
  { text: 'and shake the surface. That’s an earthquake.', start: 46.8, end: 51.2 },
  { text: 'The Earth never stops moving.', start: 52.4, end: 54.6 },
  { text: 'Like and subscribe to Next Huge Quake', start: 55, end: 57.3 },
  { text: 'for more earthquake science.', start: 57.4, end: 59.5 }
];

// ---------- seeded generator for textures ----------

export function mulberry32( seed: number ): () => number {
  let a = seed >>> 0;
  return () => {
    a = ( a + 0x6d2b79f5 ) >>> 0;
    let t = Math.imul( a ^ ( a >>> 15 ), 1 | a );
    t = ( t + Math.imul( t ^ ( t >>> 7 ), 61 | t ) ) ^ t;
    return ( ( t ^ ( t >>> 14 ) ) >>> 0 ) / 4294967296;
  };
}
