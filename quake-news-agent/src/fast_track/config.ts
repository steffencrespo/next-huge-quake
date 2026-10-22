/**
 * Breaking News Fast Track settings (FAST_TRACK_*). Off unless FAST_TRACK_ENABLED is exactly "true"; the final privacy is
 * private unless FAST_TRACK_FINAL_PRIVACY is exactly "public". Spending limits and provider prices have no defaults on
 * purpose: prices must come from the providers' published price lists or measured traces, and while any of them is
 * missing the fast track is unusable (fail closed) and every event takes the human approval path.
 */
export type FastTrackConfig = {
  enabled: boolean;
  finalPrivacy: 'private' | 'public';
  policyVersion: string;
  maxPublishPerDay: number;
  maxAgeHours: number;
  sequenceRadiusKm: number;
  sequenceHours: number;
  /** Before publication, these changes since production send the event to a human: the video shows the old values. */
  drift: { magnitude: number; distanceKm: number };
  pauseFile: string | null;
  notifyUrl: string | null;
  budget: BudgetConfig | null;
  /** Why `budget` is null (a missing or invalid setting), for the operator. */
  budgetProblems: string[];
};

export type BudgetConfig = {
  perEventUsd: number;
  dailyUsd: number;
  monthlyUsd: number;
  anthropicInputUsdPerMTok: number;
  anthropicOutputUsdPerMTok: number;
  /** Upper bound for the input of one Anthropic call (prompt + facts + feedback), from a measured trace. */
  llmMaxInputTokensPerCall: number;
  elevenLabsUsdPer1kChars: number;
  /** Narration longer than this is refused before the ElevenLabs request. */
  maxNarrationChars: number;
};

export const FAST_TRACK_POLICY = 'fast-track';
export const FAST_TRACK_POLICY_VERSION = 'fast-track@1';

/** Prefix of the error a guarded step throws when stopped, so the workflow can hand the event to a person. */
export const STOPPED = 'fast_track_stopped';

type Env = Record<string, string | undefined>;

const number = ( env: Env, name: string, fallback: number, min = 0 ): number => {
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

const BUDGET_KEYS = {
  perEventUsd: 'FAST_TRACK_PER_EVENT_BUDGET_USD',
  dailyUsd: 'FAST_TRACK_DAILY_BUDGET_USD',
  monthlyUsd: 'FAST_TRACK_MONTHLY_BUDGET_USD',
  anthropicInputUsdPerMTok: 'FAST_TRACK_ANTHROPIC_INPUT_USD_PER_MTOK',
  anthropicOutputUsdPerMTok: 'FAST_TRACK_ANTHROPIC_OUTPUT_USD_PER_MTOK',
  llmMaxInputTokensPerCall: 'FAST_TRACK_LLM_MAX_INPUT_TOKENS_PER_CALL',
  elevenLabsUsdPer1kChars: 'FAST_TRACK_ELEVENLABS_USD_PER_1K_CHARS',
  maxNarrationChars: 'FAST_TRACK_MAX_NARRATION_CHARS'
} as const satisfies Record<keyof BudgetConfig, string>;

/** Every budget setting is required and must be a positive number; otherwise null plus the reasons. */
function loadBudget( env: Env ): { budget: BudgetConfig | null; problems: string[] } {
  const problems: string[] = [];
  const values: Partial<BudgetConfig> = {};
  for ( const [ key, name ] of Object.entries( BUDGET_KEYS ) as [ keyof BudgetConfig, string ][] ) {
    const raw = env[name]?.trim();
    const value = Number( raw );
    if ( !raw ) {
      problems.push( `${name} is not set` );
    } else if ( !Number.isFinite( value ) || value <= 0 ) {
      problems.push( `${name} must be a positive number (got "${raw}")` );
    } else {
      values[key] = value;
    }
  }
  return problems.length ? { budget: null, problems } : { budget: values as BudgetConfig, problems };
}

export function loadFastTrackConfig( env: Env ): FastTrackConfig {
  const { budget, problems } = loadBudget( env );
  return {
    enabled: env.FAST_TRACK_ENABLED?.trim().toLowerCase() === 'true',
    finalPrivacy: env.FAST_TRACK_FINAL_PRIVACY?.trim().toLowerCase() === 'public' ? 'public' : 'private',
    policyVersion: FAST_TRACK_POLICY_VERSION,
    maxPublishPerDay: number( env, 'FAST_TRACK_MAX_PUBLISH_PER_DAY', 1 ),
    maxAgeHours: number( env, 'FAST_TRACK_MAX_AGE_HOURS', 6, 0.1 ),
    sequenceRadiusKm: number( env, 'FAST_TRACK_SEQUENCE_RADIUS_KM', 150, 1 ),
    sequenceHours: number( env, 'FAST_TRACK_SEQUENCE_HOURS', 72, 1 ),
    drift: { magnitude: number( env, 'FAST_TRACK_DRIFT_MAGNITUDE', 0.2, 0.05 ), distanceKm: number( env, 'FAST_TRACK_DRIFT_KM', 25, 1 ) },
    pauseFile: env.FAST_TRACK_PAUSE_FILE?.trim() || null,
    notifyUrl: env.FAST_TRACK_NOTIFY_URL?.trim() || null,
    budget,
    budgetProblems: problems
  };
}
