import { z } from '@outputai/core';

export const monitorInputSchema = z.object( {} );

export const pollSummarySchema = z.object( {
  ok: z.boolean(),
  error: z.string().nullable(),
  decision: z.enum( [ 'none', 'dry_run_would_start', 'started', 'start_unconfirmed', 'capped', 'busy', 'attempts_exhausted', 'poll_failed' ] ),
  eventId: z.string().nullable(),
  dryRun: z.boolean(),
  fetched: z.number(),
  unusable: z.number(),
  newEvents: z.number(),
  eligible: z.number(),
  inFlight: z.number(),
  startsToday: z.number(),
  nextPollSeconds: z.number()
} );
