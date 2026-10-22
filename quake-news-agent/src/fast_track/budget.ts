import type { BudgetConfig } from './config.js';
import type { Ledger } from './ledger.js';

/**
 * Worst-case cost of producing one event, from the configured provider prices. Every bound below mirrors the
 * pipeline's own limits (budget.spec.ts reads them back from the prompt files and workflow code, so a change there
 * fails the tests instead of silently breaking the bound):
 *   - quake_news: MAX_DRAFT_ATTEMPTS drafts, each followed by one review, each call retried up to ACTIVITY_ATTEMPTS times;
 *   - output tokens are capped by maxOutputTokens in news_draft@v1 and draft_review@v1;
 *   - input tokens per call are bounded by the configured, measured FAST_TRACK_LLM_MAX_INPUT_TOKENS_PER_CALL;
 *   - ElevenLabs: one request (single attempt, reused when the text is unchanged) of at most maxNarrationChars,
 *     enforced before the request.
 * The reservation is charged in full and never refunded, so the limits hold even if every call hits its bound.
 */
export const LLM_BOUNDS = { draftAttempts: 2, activityAttempts: 3, draftMaxOutputTokens: 2048, reviewMaxOutputTokens: 1024 };

export function worstCaseEventUsd( b: BudgetConfig ): number {
  const call = ( outputTokens: number ) =>
    ( b.llmMaxInputTokensPerCall * b.anthropicInputUsdPerMTok + outputTokens * b.anthropicOutputUsdPerMTok ) / 1e6;
  const perAttempt = call( LLM_BOUNDS.draftMaxOutputTokens ) + call( LLM_BOUNDS.reviewMaxOutputTokens );
  const llm = LLM_BOUNDS.draftAttempts * LLM_BOUNDS.activityAttempts * perAttempt;
  const tts = b.maxNarrationChars / 1000 * b.elevenLabsUsdPer1kChars;
  return Math.round( ( llm + tts ) * 1e6 ) / 1e6;
}

const day = ( iso: string ) => iso.slice( 0, 10 );
const month = ( iso: string ) => iso.slice( 0, 7 );
const sum = ( values: number[] ) => values.reduce( ( a, b ) => a + b, 0 );

export type Reservation = { ok: true; usd: number; existing: boolean } | { ok: false; reason: string };

/**
 * Checks and records the worst-case cost of one event against the per-event, daily and monthly limits. Idempotent:
 * an event that already holds a reservation is not charged again. Mutates `ledger`; the caller saves it before
 * starting the paid work.
 */
export function reserve( ledger: Ledger, eventId: string, b: BudgetConfig, nowIso: string ): Reservation {
  const existing = ledger.reservations[eventId];
  if ( existing ) {
    return { ok: true, usd: existing.usd, existing: true };
  }
  const usd = worstCaseEventUsd( b );
  const all = Object.values( ledger.reservations );
  const today = sum( all.filter( r => day( r.at ) === day( nowIso ) ).map( r => r.usd ) );
  const thisMonth = sum( all.filter( r => month( r.at ) === month( nowIso ) ).map( r => r.usd ) );
  if ( usd > b.perEventUsd ) {
    return { ok: false, reason: `worst-case cost $${usd.toFixed( 4 )} exceeds the per-event limit $${b.perEventUsd}` };
  }
  if ( today + usd > b.dailyUsd ) {
    return { ok: false, reason: `daily limit $${b.dailyUsd} reached ($${today.toFixed( 4 )} reserved today)` };
  }
  if ( thisMonth + usd > b.monthlyUsd ) {
    return { ok: false, reason: `monthly limit $${b.monthlyUsd} reached ($${thisMonth.toFixed( 4 )} reserved this month)` };
  }
  ledger.reservations[eventId] = { usd, at: nowIso };
  return { ok: true, usd, existing: false };
}

/** Fast-track publications already recorded on the UTC day of `nowIso`. */
export const publicationsOn = ( ledger: Ledger, nowIso: string ) =>
  Object.values( ledger.events ).filter( e => e.publishedAtUtc && day( e.publishedAtUtc ) === day( nowIso ) ).length;
