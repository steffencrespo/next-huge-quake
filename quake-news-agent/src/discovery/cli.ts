import { join } from 'node:path';
import { USGS_QUERY_URL, buildUsgsListUrl } from '../clients/usgs.js';
import { videoDir } from '../shared/run_cli.js';
import { loadMonitorConfig } from '../workflows/quake_monitor/config.js';
import { defaultStateDir } from '../workflows/quake_monitor/state.js';
import { checkEventIsNew } from './check.js';
import { discover, formatReport, loadProducedIds } from './discover.js';

/**
 * npm run discover [-- --hours 48]
 * One USGS request (free). The thresholds are the monitor's MONITOR_* settings; only the window differs (48 h here).
 * Starts nothing and makes no paid request.
 *
 * npm run discover -- --check <eventId>
 * Used by `session produce` before any paid work: exit 0 only if the event (under any USGS alias) has no video, no
 * monitor record that started it and no Temporal workflow. Free; fails safe when USGS or the API cannot be reached.
 */
const checkFlag = process.argv.indexOf( '--check' );
if ( checkFlag >= 0 ) {
  const eventId = process.argv[checkFlag + 1] ?? '';
  const api = ( process.env.OUTPUT_API_URL ?? 'http://localhost:3001' ).replace( /\/$/, '' );
  const lookup = async (): Promise<string[] | null> => {
    const response = await fetch( `${USGS_QUERY_URL}?format=geojson&eventid=${encodeURIComponent( eventId )}`, { signal: AbortSignal.timeout( 30_000 ) } );
    if ( !response.ok ) {
      return null;
    }
    const ids = ( await response.json() as { properties?: { ids?: string } } ).properties?.ids;
    return typeof ids === 'string' ? ids.split( ',' ).map( id => id.trim() ).filter( Boolean ) : [];
  };
  const workflowExists = async ( id: string ): Promise<boolean> => {
    const response = await fetch( `${api}/workflow/quake_video-${encodeURIComponent( id )}/status`, { signal: AbortSignal.timeout( 15_000 ) } );
    await response.body?.cancel();
    if ( response.status === 404 ) {
      return false;
    }
    if ( response.ok ) {
      return true;
    }
    throw new Error( `HTTP ${response.status}` );
  };
  try {
    const result = await checkEventIsNew( {
      eventId,
      usgsIds: await lookup().catch( () => null ),
      producedIds: loadProducedIds( { videoOutDir: join( videoDir(), 'out' ), stateFile: join( defaultStateDir(), 'monitor.json' ) } ),
      workflowExists
    } );
    if ( !result.ok ) {
      console.error( `refusing to produce ${eventId}: ${result.reason}` );
      process.exit( 1 );
    }
    console.log( `${eventId} is new (checked ${result.ids.join( ', ' )})` );
    process.exit( 0 );
  } catch ( error ) {
    console.error( `refusing to produce ${eventId}: ${error instanceof Error ? error.message : String( error )}` );
    process.exit( 1 );
  }
}

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
