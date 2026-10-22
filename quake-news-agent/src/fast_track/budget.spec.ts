import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LLM_BOUNDS, publicationsOn, reserve, worstCaseEventUsd } from './budget.js';
import { loadFastTrackConfig } from './config.js';
import type { BudgetConfig } from './config.js';
import { emptyLedger, emptyLedgerEvent, isPaused, ledgerStore, updateLedgerEvent } from './ledger.js';

const budget = ( over: Partial<BudgetConfig> = {} ): BudgetConfig => ( {
  perEventUsd: 1, dailyUsd: 2, monthlyUsd: 3, anthropicInputUsdPerMTok: 3, anthropicOutputUsdPerMTok: 15,
  llmMaxInputTokensPerCall: 4000, elevenLabsUsdPer1kChars: 0.3, maxNarrationChars: 600, ...over
} );

const workflows = join( import.meta.dirname, '..', 'workflows', 'quake_news' );
const read = ( file: string ) => readFileSync( join( workflows, file ), 'utf8' );

describe( 'worst-case cost', () => {
  it( 'uses the same limits as the pipeline', () => {
    expect( read( 'prompts/news_draft@v1.prompt' ) ).toContain( `maxOutputTokens: ${LLM_BOUNDS.draftMaxOutputTokens}` );
    expect( read( 'prompts/draft_review@v1.prompt' ) ).toContain( `maxOutputTokens: ${LLM_BOUNDS.reviewMaxOutputTokens}` );
    const workflow = read( 'workflow.ts' );
    expect( workflow ).toContain( `MAX_DRAFT_ATTEMPTS = ${LLM_BOUNDS.draftAttempts}` );
    expect( workflow ).toMatch( new RegExp( `maximumAttempts: ${LLM_BOUNDS.activityAttempts}\\b` ) );
  } );

  it( 'relies on single requests: no SDK retries, no tools, no step-level retry overrides, one TTS call', () => {
    const root = join( import.meta.dirname, '..', '..' );
    expect( readFileSync( join( root, 'node_modules', '@outputai', 'llm', 'src', 'ai_sdk_options.js' ), 'utf8' ).match( /maxRetries: 0/g ) ).toHaveLength( 2 );
    for ( const prompt of [ 'news_draft@v1.prompt', 'draft_review@v1.prompt' ] ) {
      expect( read( `prompts/${prompt}` ).split( '---' )[1] ).not.toMatch( /tools|skills/ );
    }
    for ( const file of [ 'steps.ts', 'evaluators.ts' ] ) {
      expect( read( file ) ).not.toMatch( /maximumAttempts/ );
    }
    const videoSteps = readFileSync( join( root, 'src', 'workflows', 'quake_video', 'steps.ts' ), 'utf8' );
    expect( videoSteps ).toMatch( /name: 'generate_narration'[\s\S]*?maximumAttempts: 1 \}/ );
    const narrationCli = readFileSync( join( root, '..', 'video', 'scripts', 'generate-narration.ts' ), 'utf8' );
    expect( narrationCli.match( /await generateSpeech\(/g ) ).toHaveLength( 1 );
  } );

  it( 'adds every bounded call and the narration characters', () => {
    // 6 drafts of (4000 in, 2048 out) + 6 reviews of (4000 in, 1024 out) at $3/$15 per MTok, plus 600 chars at $0.30/1k
    const llm = 6 * ( 4000 * 3 + 2048 * 15 ) / 1e6 + 6 * ( 4000 * 3 + 1024 * 15 ) / 1e6;
    expect( worstCaseEventUsd( budget() ) ).toBeCloseTo( llm + 0.18, 6 );
  } );

  it( 'needs every price and limit configured', () => {
    const partial = loadFastTrackConfig( {
      FAST_TRACK_PER_EVENT_BUDGET_USD: '1', FAST_TRACK_DAILY_BUDGET_USD: '2', FAST_TRACK_MONTHLY_BUDGET_USD: '3',
      FAST_TRACK_ANTHROPIC_INPUT_USD_PER_MTOK: '3', FAST_TRACK_ANTHROPIC_OUTPUT_USD_PER_MTOK: '15', FAST_TRACK_LLM_MAX_INPUT_TOKENS_PER_CALL: '4000',
      FAST_TRACK_ELEVENLABS_USD_PER_1K_CHARS: '0', FAST_TRACK_MAX_NARRATION_CHARS: '600'
    } );
    expect( partial.budget ).toBeNull();
    expect( partial.budgetProblems ).toEqual( [ 'FAST_TRACK_ELEVENLABS_USD_PER_1K_CHARS must be a positive number (got "0")' ] );
  } );
} );

describe( 'reservations', () => {
  it( 'enforces the per-event, daily and monthly limits and charges an event once', () => {
    const ledger = emptyLedger();
    const b = budget();
    const cost = worstCaseEventUsd( b );
    expect( reserve( ledger, 'a', b, '2026-10-22T10:00:00Z' ) ).toEqual( { ok: true, usd: cost, existing: false } );
    expect( reserve( ledger, 'a', b, '2026-10-22T11:00:00Z' ) ).toEqual( { ok: true, usd: cost, existing: true } );
    const daily = budget( { dailyUsd: cost * 1.5 } );
    expect( reserve( ledger, 'b', daily, '2026-10-22T12:00:00Z' ) ).toMatchObject( { ok: false, reason: expect.stringContaining( 'daily limit' ) } );
    expect( reserve( ledger, 'b', daily, '2026-10-23T00:10:00Z' ).ok ).toBe( true );
    expect( reserve( ledger, 'c', budget( { monthlyUsd: cost * 2.5 } ), '2026-10-24T00:10:00Z' ) ).toMatchObject( { ok: false, reason: expect.stringContaining( 'monthly limit' ) } );
    expect( reserve( ledger, 'd', budget( { perEventUsd: cost / 2 } ), '2026-11-01T00:00:00Z' ) ).toMatchObject( { ok: false, reason: expect.stringContaining( 'per-event' ) } );
  } );

  it( 'counts publications per UTC day', () => {
    const ledger = emptyLedger();
    ledger.events.a = { ...emptyLedgerEvent(), publishedAtUtc: '2026-10-22T16:59:31Z' };
    ledger.events.b = { ...emptyLedgerEvent(), publishedAtUtc: null };
    expect( publicationsOn( ledger, '2026-10-22T23:00:00Z' ) ).toBe( 1 );
    expect( publicationsOn( ledger, '2026-10-23T00:00:00Z' ) ).toBe( 0 );
  } );
} );

describe( 'ledger store and pause', () => {
  it( 'round-trips, merges event patches and refuses a corrupt file', () => {
    const dir = mkdtempSync( join( tmpdir(), 'ft-' ) );
    const store = ledgerStore( dir );
    expect( store.load() ).toEqual( emptyLedger() );
    updateLedgerEvent( store, 'us1', { decision: 'published', videoId: 'v1' } );
    expect( updateLedgerEvent( store, 'us1', { verifiedAtUtc: 'now' } ) ).toMatchObject( { decision: 'published', videoId: 'v1', verifiedAtUtc: 'now' } );
    writeFileSync( join( dir, 'fast-track.json' ), '{' );
    expect( () => store.load() ).toThrow( 'not valid JSON' );
  } );

  it( 'is paused while the pause file exists', () => {
    const dir = mkdtempSync( join( tmpdir(), 'ft-' ) );
    const file = join( dir, 'PAUSE' );
    expect( isPaused( file ) ).toBe( false );
    writeFileSync( file, '' );
    expect( isPaused( file ) ).toBe( true );
  } );
} );
