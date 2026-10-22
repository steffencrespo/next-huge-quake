import { step, z } from '@outputai/core';
import { queryUsgsList } from '../../clients/usgs.js';
import { loadFastTrackConfig } from '../../fast_track/config.js';
import { isPaused, ledgerStore } from '../../fast_track/ledger.js';
import { fastTrackStart } from '../../fast_track/start.js';
import { outputApi } from './api.js';
import { loadMonitorConfig } from './config.js';
import { runPoll } from './poll.js';
import { fileStore } from './state.js';
import { pollSummarySchema } from './types.js';

/**
 * One monitoring pass. A single attempt: the poll is repeated every few minutes anyway, and a retry must never be
 * able to start a second paid workflow. Failures of USGS or the Output API come back as `ok: false` (state untouched).
 */
export const pollAndSelect = step( {
  name: 'poll_and_select',
  description: 'Poll USGS, update the monitor state and, when enabled, start quake_video for the best eligible new event',
  inputSchema: z.object( {} ),
  outputSchema: pollSummarySchema,
  fn: async () => {
    const config = loadMonitorConfig( process.env );
    return runPoll( {
      now: () => Date.now(),
      fetchFeed: startTimeUtc => queryUsgsList( { startTimeUtc, minMagnitude: config.minMagnitude } ),
      store: fileStore(),
      api: outputApi,
      fastTrack: ( obs, record, nowMs ) => {
        const fast = loadFastTrackConfig( process.env );
        return fastTrackStart( obs, record, nowMs, fast, isPaused( fast.pauseFile ), ledgerStore() );
      }
    }, config );
  },
  options: { activityOptions: { startToCloseTimeout: '3m', retry: { maximumAttempts: 1 } } }
} );
