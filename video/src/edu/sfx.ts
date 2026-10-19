/**
 * Synthesized earthquake sound effects (no licensed material, no network): a low rumble bed and a deep impact.
 * Deterministic: seeded noise, so the same bytes every time. Mono 16-bit PCM WAV at 44.1 kHz.
 */
import { mulberry32 } from './geo.js';

const RATE = 44100;

function normalize( samples: Float32Array, peak: number ): Float32Array {
  let max = 1e-9;
  for ( const s of samples ) {
    max = Math.max( max, Math.abs( s ) );
  }
  return samples.map( s => ( s / max ) * peak );
}

function lowpassedNoise( n: number, seed: number, coefficient: number ): Float32Array {
  const rand = mulberry32( seed );
  const out = new Float32Array( n );
  let y = 0;
  for ( let i = 0; i < n; i++ ) {
    y += coefficient * ( rand() * 2 - 1 - y );
    out[i] = y;
  }
  return normalize( out, 1 );
}

/** About 12 s of low rumble, faded at both ends. */
export function rumble( seconds = 12 ): Float32Array {
  const n = Math.round( seconds * RATE );
  const noise = lowpassedNoise( n, 11, 0.012 );
  const out = new Float32Array( n );
  for ( let i = 0; i < n; i++ ) {
    const t = i / RATE;
    const swell = 0.75 + 0.25 * Math.sin( 2 * Math.PI * 0.7 * t );
    const tone = 0.35 * Math.sin( 2 * Math.PI * 36 * t ) + 0.2 * Math.sin( 2 * Math.PI * 52 * t + 1 );
    const fade = Math.min( 1, t / 0.4, ( seconds - t ) / 0.4 );
    out[i] = ( noise[i] * 0.8 + tone ) * swell * fade;
  }
  return normalize( out, 0.85 );
}

/** About 3 s deep impact: a falling sine with a low noise burst. */
export function boom( seconds = 3 ): Float32Array {
  const n = Math.round( seconds * RATE );
  const noise = lowpassedNoise( n, 23, 0.05 );
  const out = new Float32Array( n );
  let phase = 0;
  for ( let i = 0; i < n; i++ ) {
    const t = i / RATE;
    phase += ( 2 * Math.PI * ( 28 + 60 * Math.exp( -t / 0.25 ) ) ) / RATE;
    const attack = Math.min( 1, t / 0.005 );
    out[i] = attack * ( Math.sin( phase ) * Math.exp( -t / 0.7 ) + noise[i] * 0.6 * Math.exp( -t / 0.25 ) );
  }
  return normalize( out, 0.9 );
}

export function wavBytes( samples: Float32Array ): Buffer {
  const data = Buffer.alloc( samples.length * 2 );
  samples.forEach( ( s, i ) => data.writeInt16LE( Math.round( Math.max( -1, Math.min( 1, s ) ) * 32767 ), i * 2 ) );
  const header = Buffer.alloc( 44 );
  header.write( 'RIFF', 0 );
  header.writeUInt32LE( 36 + data.length, 4 );
  header.write( 'WAVEfmt ', 8 );
  header.writeUInt32LE( 16, 16 );
  header.writeUInt16LE( 1, 20 );
  header.writeUInt16LE( 1, 22 );
  header.writeUInt32LE( RATE, 24 );
  header.writeUInt32LE( RATE * 2, 28 );
  header.writeUInt16LE( 2, 32 );
  header.writeUInt16LE( 16, 34 );
  header.write( 'data', 36 );
  header.writeUInt32LE( data.length, 40 );
  return Buffer.concat( [ header, data ] );
}

export const SFX_FILES = { rumble: 'audio/edu/rumble.wav', boom: 'audio/edu/boom.wav' } as const;

/** A short soft seismograph tick (0.25 s) for counters and reveals. */
export function tick(): Float32Array {
  const n = Math.round( 0.25 * RATE );
  const out = new Float32Array( n );
  for ( let i = 0; i < n; i++ ) {
    const t = i / RATE;
    out[i] = Math.sin( 2 * Math.PI * 880 * t ) * Math.exp( -t / 0.04 ) * Math.min( 1, t / 0.002 );
  }
  return normalize( out, 0.6 );
}

/** About 1.4 s whoosh: low-passed noise that swells and falls, for sweeps and transitions. */
export function whoosh(): Float32Array {
  const seconds = 1.4;
  const n = Math.round( seconds * RATE );
  const noise = lowpassedNoise( n, 41, 0.18 );
  const out = new Float32Array( n );
  for ( let i = 0; i < n; i++ ) {
    const t = i / seconds / RATE;
    out[i] = noise[i] * Math.sin( Math.PI * t ) ** 2;
  }
  return normalize( out, 0.7 );
}

/** About 2 s riser: a rising tone under noise, for tension before a reveal. */
export function riser(): Float32Array {
  const seconds = 2.2;
  const n = Math.round( seconds * RATE );
  const noise = lowpassedNoise( n, 57, 0.08 );
  const out = new Float32Array( n );
  let phase = 0;
  for ( let i = 0; i < n; i++ ) {
    const t = i / RATE;
    const k = t / seconds;
    phase += ( 2 * Math.PI * ( 70 + 380 * k * k ) ) / RATE;
    out[i] = ( Math.sin( phase ) * 0.6 + noise[i] * 0.5 ) * k * k;
  }
  return normalize( out, 0.7 );
}

export const EXTRA_SFX = {
  tick: { file: 'audio/edu/tick.wav', make: tick },
  whoosh: { file: 'audio/edu/whoosh.wav', make: whoosh },
  riser: { file: 'audio/edu/riser.wav', make: riser }
} as const;
