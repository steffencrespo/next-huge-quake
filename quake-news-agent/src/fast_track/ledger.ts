import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from '@outputai/core';
import { defaultStateDir } from '../workflows/quake_monitor/state.js';

/**
 * Fast-track ledger (state/fast-track.json, git-ignored, next to the monitor state): budget reservations and, per event,
 * the decision, the manifest it published under and the timestamps used for latency. Written atomically; a corrupt file
 * stops the fast track instead of being replaced (a lost ledger would reset the spending limits).
 */
const eventSchema = z.object( {
  manifestId: z.string().nullable(),
  tier: z.string().nullable(),
  decision: z.string(),
  reasons: z.array( z.string() ),
  originUtc: z.string().nullable(),
  detectedAtUtc: z.string().nullable(),
  productionStartedAtUtc: z.string().nullable(),
  renderCompletedAtUtc: z.string().nullable(),
  uploadedAtUtc: z.string().nullable(),
  publishedAtUtc: z.string().nullable(),
  verifiedAtUtc: z.string().nullable(),
  videoId: z.string().nullable()
} );

export const ledgerSchema = z.object( {
  version: z.literal( 1 ),
  reservations: z.record( z.string(), z.object( { usd: z.number().nonnegative(), at: z.string() } ) ),
  events: z.record( z.string(), eventSchema )
} );

export type Ledger = z.infer<typeof ledgerSchema>;
export type LedgerEvent = z.infer<typeof eventSchema>;

export const emptyLedger = (): Ledger => ( { version: 1, reservations: {}, events: {} } );

export const emptyLedgerEvent = (): LedgerEvent => ( {
  manifestId: null, tier: null, decision: 'pending', reasons: [], originUtc: null, detectedAtUtc: null, productionStartedAtUtc: null,
  renderCompletedAtUtc: null, uploadedAtUtc: null, publishedAtUtc: null, verifiedAtUtc: null, videoId: null
} );

export type LedgerStore = { load(): Ledger; save( ledger: Ledger ): void };

export function ledgerStore( dir: string = defaultStateDir() ): LedgerStore {
  const file = join( dir, 'fast-track.json' );
  return {
    load() {
      if ( !existsSync( file ) ) {
        return emptyLedger();
      }
      let raw: unknown;
      try {
        raw = JSON.parse( readFileSync( file, 'utf8' ) );
      } catch {
        throw new Error( `fast-track ledger is not valid JSON: ${file} (fix it; the fast track will not overwrite it)` );
      }
      const parsed = ledgerSchema.safeParse( raw );
      if ( !parsed.success ) {
        throw new Error( `fast-track ledger has an unexpected shape: ${file}` );
      }
      return parsed.data;
    },
    save( ledger ) {
      mkdirSync( dir, { recursive: true } );
      const temp = `${file}.tmp-${process.pid}`;
      writeFileSync( temp, `${JSON.stringify( ledger, null, 2 )}\n` );
      renameSync( temp, file );
    }
  };
}

/** Merges a patch into one event's record (load, patch, save). */
export function updateLedgerEvent( store: LedgerStore, eventId: string, patch: Partial<LedgerEvent> ): LedgerEvent {
  const ledger = store.load();
  const next = { ...emptyLedgerEvent(), ...ledger.events[eventId], ...patch };
  ledger.events[eventId] = next;
  store.save( ledger );
  return next;
}

/** The emergency pause: while this file exists nothing is produced as a fast-track candidate and nothing is published. */
export const pauseFilePath = ( configured: string | null ): string => configured ?? join( defaultStateDir(), 'FAST_TRACK_PAUSED' );
export const isPaused = ( configured: string | null ): boolean => existsSync( pauseFilePath( configured ) );

/** Why the fast track must not act right now (switch off or pause file present), or null. Read fresh on every call. */
export const stopReason = ( config: { enabled: boolean; pauseFile: string | null } ): string | null =>
  !config.enabled ? 'fast_track_disabled' : isPaused( config.pauseFile ) ? 'fast_track_paused' : null;

