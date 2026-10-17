import type { QuakeEvent, VideoSpec } from '../spec/schema.js';

/** Sample event data for renders and tests, with a record of where it came from. */
export type Fixture = {
  provenance: VideoSpec['provenance'];
  /** The M1 USGS fixture file the facts were taken from (quake-news-agent/src/workflows/quake_news/__fixtures__/). */
  source: string;
  approachFrom: VideoSpec['map']['approachFrom'];
  event: QuakeEvent;
};
