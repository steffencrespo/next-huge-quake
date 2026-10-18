export type MonitorConfig = {
  /** Lowest magnitude requested from USGS and accepted at all. */
  minMagnitude: number;
  /** At or above this magnitude an event is eligible on its own. */
  strongMagnitude: number;
  /** Between minMagnitude and strongMagnitude an event needs PAGER yellow or worse, or this USGS significance. */
  significanceFloor: number;
  minAgeMinutes: number;
  maxAgeHours: number;
  /** On the very first poll, events older than this are recorded as baseline and never started. */
  baselineGraceMinutes: number;
  maxStartsPerDay: number;
  /** Safe by default: only the literal value "false" turns real starts on. */
  dryRun: boolean;
  pollSeconds: number;
  /** A start that could not be confirmed is retried at most this many times. */
  maxStartAttempts: number;
};

const number = ( env: Record<string, string | undefined>, name: string, fallback: number, min = 0 ): number => {
  const raw = env[name];
  if ( raw === undefined || raw.trim() === '' ) {
    return fallback;
  }
  const value = Number( raw );
  if ( !Number.isFinite( value ) || value < min ) {
    throw new Error( `${name} must be a number >= ${min} (got "${raw}")` );
  }
  return value;
};

/** Reads the MONITOR_* settings; every value has a default and a bad value fails loudly. */
export function loadMonitorConfig( env: Record<string, string | undefined> ): MonitorConfig {
  return {
    minMagnitude: number( env, 'MONITOR_MIN_MAGNITUDE', 5.5 ),
    strongMagnitude: number( env, 'MONITOR_STRONG_MAGNITUDE', 6.0 ),
    significanceFloor: number( env, 'MONITOR_SIGNIFICANCE_FLOOR', 600 ),
    minAgeMinutes: number( env, 'MONITOR_MIN_AGE_MINUTES', 2 ),
    maxAgeHours: number( env, 'MONITOR_MAX_AGE_HOURS', 12, 0.1 ),
    baselineGraceMinutes: number( env, 'MONITOR_BASELINE_GRACE_MINUTES', 30 ),
    maxStartsPerDay: number( env, 'MONITOR_MAX_STARTS_PER_DAY', 2 ),
    dryRun: env.MONITOR_DRY_RUN?.trim().toLowerCase() !== 'false',
    pollSeconds: number( env, 'MONITOR_POLL_SECONDS', 300, 30 ),
    maxStartAttempts: number( env, 'MONITOR_MAX_START_ATTEMPTS', 3, 1 )
  };
}
