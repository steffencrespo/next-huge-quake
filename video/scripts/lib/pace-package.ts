/**
 * Paced inputs for a news render: applies a pacing preset to the narration, re-times the captions and sets the scene
 * lengths to the faster voice (src/spec/pacedTiming.ts). Writes spec.paced.json, soundtrack.paced.json and
 * narration.paced.mp3 into `outDir`; the originals are not touched. Makes no network request.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PacingPreset } from '../../src/audio/pacing.js';
import { soundtrackSchema } from '../../src/audio/soundtrack.js';
import { pacedSpec } from '../../src/spec/pacedTiming.js';
import { videoSpecSchema } from '../../src/spec/schema.js';
import { paceNarration } from './pace-audio.js';

export type PacedInputs = { specFile: string; soundtrackFile: string; narrationFile: string; sourceSeconds: number; narrationSeconds: number; videoSeconds: number };

export function pacePackage( { root, specFile, soundtrackFile, narrationFile, outDir, preset }: {
  root: string; specFile: string; soundtrackFile: string; narrationFile?: string; outDir: string; preset: PacingPreset;
} ): PacedInputs {
  const spec = videoSpecSchema.parse( JSON.parse( readFileSync( specFile, 'utf8' ) ) );
  const soundtrack = soundtrackSchema.parse( JSON.parse( readFileSync( soundtrackFile, 'utf8' ) ) );
  mkdirSync( outDir, { recursive: true } );
  const mp3 = join( outDir, 'narration.paced.mp3' );
  const paced = paceNarration( { root, source: narrationFile ?? join( dirname( soundtrackFile ), 'narration.mp3' ), captions: soundtrack.captions, preset, outMp3: mp3 } );
  const timed = pacedSpec( spec, soundtrack.narrationStart, paced.duration );
  const out = { spec: join( outDir, 'spec.paced.json' ), soundtrack: join( outDir, 'soundtrack.paced.json' ) };
  writeFileSync( out.spec, `${ JSON.stringify( timed, null, 2 ) }\n` );
  writeFileSync( out.soundtrack, `${ JSON.stringify( soundtrackSchema.parse( { ...soundtrack, narrationDuration: paced.duration, captions: paced.captions } ), null, 2 ) }\n` );
  const frames = timed.scenes.reduce( ( n, s ) => n + s.frames, 0 );
  return { specFile: out.spec, soundtrackFile: out.soundtrack, narrationFile: mp3, sourceSeconds: paced.sourceDuration, narrationSeconds: paced.duration, videoSeconds: frames / timed.format.fps };
}
