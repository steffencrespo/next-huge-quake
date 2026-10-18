import { sleep, workflow, z } from '@outputai/core';
import { pollAndSelect } from './steps.js';
import { monitorInputSchema } from './types.js';

const FALLBACK_POLL_SECONDS = 60;

/**
 * Long-lived USGS monitor. Start it once with the fixed workflow ID `quake_monitor`. Each pass polls USGS, updates the
 * persistent state and, unless MONITOR_DRY_RUN is on, starts `quake_video` for the best eligible new event. It then
 * sleeps and continues as new, so the history stays small. A failing pass never ends the monitor. It never publishes:
 * `quake_video` stops at ready_for_approval.
 */
export default workflow( {
  name: 'quake_monitor',
  description: 'Poll USGS every few minutes and start quake_video for significant new earthquakes (dry run by default)',
  inputSchema: monitorInputSchema,
  outputSchema: z.string(),
  fn: async ( input, context ) => {
    let sleepSeconds = FALLBACK_POLL_SECONDS;
    try {
      sleepSeconds = ( await pollAndSelect( {} ) ).nextPollSeconds;
    } catch {
      // A crashed pass (for example a corrupt state file) is visible in the step's trace; keep monitoring.
    }
    await sleep( `${sleepSeconds}s` );
    return context.control.continueAsNew( input );
  }
} );
