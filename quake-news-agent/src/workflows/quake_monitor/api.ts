import { outputFetch } from '@outputai/http';
import type { Inspection, Outcome, PollDeps } from './poll.js';

const baseUrl = () => ( process.env.OUTPUT_API_URL ?? 'http://localhost:3001' ).replace( /\/$/, '' );
const OUTCOMES: readonly Outcome[] = [ 'ready_for_approval', 'rejected', 'no_candidate', 'failed' ];

const json = async ( response: Response ): Promise<Record<string, unknown>> => {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
};

/** Starts quake_video through the Output API with a deterministic workflow ID (Temporal rejects a duplicate while it runs). */
export async function startQuakeVideo( workflowId: string, input: { eventId: string; asOfUtc: string } ): Promise<void> {
  const response = await outputFetch( `${baseUrl()}/workflow/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify( { workflowName: 'quake_video', workflowId, input } ),
    signal: AbortSignal.timeout( 30_000 )
  } );
  const body = await json( response );
  if ( response.ok || body.error === 'WorkflowExecutionAlreadyStartedError' ) {
    return;
  }
  throw new Error( `Output API returned HTTP ${response.status}${typeof body.error === 'string' ? ` (${body.error})` : ''}` );
}

/** Current state of a workflow by ID: not found, running, or finished with quake_video's own status. */
export async function inspectWorkflow( workflowId: string ): Promise<Inspection> {
  const status = await outputFetch( `${baseUrl()}/workflow/${encodeURIComponent( workflowId )}/status`, { signal: AbortSignal.timeout( 30_000 ) } );
  if ( status.status === 404 ) {
    await status.body?.cancel();
    return { found: false };
  }
  if ( !status.ok ) {
    await status.body?.cancel();
    throw new Error( `Output API returned HTTP ${status.status}` );
  }
  const { status: state } = await json( status );
  if ( state === 'running' ) {
    return { found: true, running: true, outcome: null };
  }
  if ( state !== 'completed' ) {
    return { found: true, running: false, outcome: 'failed' };
  }
  const result = await outputFetch( `${baseUrl()}/workflow/${encodeURIComponent( workflowId )}/result`, { signal: AbortSignal.timeout( 30_000 ) } );
  const output = ( await json( result ) ).output as { status?: string } | undefined;
  const outcome = OUTCOMES.find( o => o === output?.status ) ?? 'failed';
  return { found: true, running: false, outcome };
}

export const outputApi: PollDeps['api'] = { inspect: inspectWorkflow, start: startQuakeVideo };
