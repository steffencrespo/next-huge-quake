import { kamchatka } from './kamchatka.js';
import { noto } from './noto.js';
import { panama } from './panama.js';
import { preliminaryTest } from './preliminary-test.js';

/** Fixed production time for the demonstration renders, so their output never depends on the clock. */
export const DEMO_AS_OF_UTC = '2026-10-16T00:00:00.000Z';

export const FIXTURES = { noto, kamchatka, panama, preliminaryTest };
export type FixtureKey = keyof typeof FIXTURES;
export type { Fixture } from './types.js';
