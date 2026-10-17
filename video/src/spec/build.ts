import type { Fixture } from '../fixtures/types.js';
import { FPS, HEIGHT, MAX_CONTEXT_ITEMS, SPEC_VERSION, WIDTH, contextItemSupported, videoSpecSchema } from './schema.js';
import type { ContextItem, VideoSpec } from './schema.js';

/**
 * Default scene lengths: 6 s + 12 s + 12 s + 5 s = 35 s. Context gets 12 s so each of three cards holds for 4 s,
 * long enough to read its caveat; Facts still keeps about 7 s with every row on screen.
 */
export const DEFAULT_SCENE_FRAMES = { hook: 6 * FPS, facts: 12 * FPS, context: 12 * FPS, closing: 5 * FPS } as const;

/**
 * Context cards in a fixed priority order; the first MAX_CONTEXT_ITEMS supported by the facts are used.
 * The tsunami flag comes after felt reports: it says the least, and is the easiest to misread.
 */
export const CONTEXT_PRIORITY: readonly ContextItem[] = [ 'depth-class', 'pager', 'felt-reports', 'tsunami-flag', 'review-status' ];

export type BuildOptions = { asOfUtc: string; mapMode?: VideoSpec['map']['mode'] };

/** Builds and validates the VideoSpec for an event. Deterministic: the same input always gives the same spec. */
export function buildVideoSpec( { provenance, approachFrom, event }: Fixture, { asOfUtc, mapMode = 'live' }: BuildOptions ): VideoSpec {
  const items = CONTEXT_PRIORITY.filter( item => contextItemSupported( item, event ) ).slice( 0, MAX_CONTEXT_ITEMS );
  return videoSpecSchema.parse( {
    specVersion: SPEC_VERSION,
    format: { width: WIDTH, height: HEIGHT, fps: FPS },
    locale: 'en',
    provenance,
    asOfUtc,
    event,
    map: { mode: mapMode, approachFrom },
    scenes: [
      { kind: 'hook', frames: DEFAULT_SCENE_FRAMES.hook },
      { kind: 'facts', frames: DEFAULT_SCENE_FRAMES.facts },
      { kind: 'context', frames: DEFAULT_SCENE_FRAMES.context, items },
      { kind: 'closing', frames: DEFAULT_SCENE_FRAMES.closing }
    ]
  } );
}
