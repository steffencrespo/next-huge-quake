import { join } from 'node:path';
import { buildUsgsListUrl } from '../clients/usgs.js';
import { videoDir } from '../shared/run_cli.js';
import { loadMonitorConfig } from '../workflows/quake_monitor/config.js';
import { defaultStateDir } from '../workflows/quake_monitor/state.js';
import { discover, formatReport, loadProducedIds } from './discover.js';

/**
 * npm run discover [-- --hours 48]
 * One USGS request (free). The thresholds are the monitor's MONITOR_* settings; only the window differs (48 h here).
 * Starts nothing and makes no paid request.
 */
const hoursFlag = process.argv.indexOf( '--hours' );
const hours = hoursFlag >= 0 ? process.argv[hoursFlag + 1] : '48';

try {
  const config = loadMonitorConfig( { ...process.env, MONITOR_MAX_AGE_HOURS: hours } );
  const nowMs = Date.now();
  const response = await fetch( buildUsgsListUrl( { startTimeUtc: new Date( nowMs - config.maxAgeHours * 3_600_000 ).toISOString(), minMagnitude: config.minMagnitude } ), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout( 30_000 )
  } );
  if ( !response.ok && response.status !== 204 ) {
    throw new Error( `USGS request failed with HTTP ${response.status}` );
  }
  const body = response.status === 204 ? { features: [] } : await response.json() as { features?: unknown[] };
  const produced = loadProducedIds( { videoOutDir: join( videoDir(), 'out' ), stateFile: join( defaultStateDir(), 'monitor.json' ) } );
  console.log( formatReport( discover( body.features ?? [], produced, config, nowMs ), config, nowMs ) );
} catch ( error ) {
  console.error( `discovery failed: ${error instanceof Error ? error.message : String( error )}` );
  process.exit( 1 );
}
