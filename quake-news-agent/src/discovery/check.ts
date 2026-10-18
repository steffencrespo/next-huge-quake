/**
 * Safety check run before a paid `quake_video`: the event must have no video, no monitor record that started it and no
 * Temporal workflow, under its own ID or any alias USGS lists for it. Anything unknown fails safe (refuse).
 */
export type CheckResult = { ok: true; ids: string[] } | { ok: false; reason: string };

export type CheckInput = {
  eventId: string;
  /** All IDs USGS lists for the event (looked up fresh), or null when USGS could not be reached or has no such event. */
  usgsIds: string[] | null;
  /** IDs with a video package, or that the monitor started (see loadProducedIds). */
  producedIds: ReadonlySet<string>;
  /** Whether a `quake_video-<id>` workflow exists in Temporal; throws when that cannot be determined. */
  workflowExists: ( id: string ) => Promise<boolean>;
};

export async function checkEventIsNew( { eventId, usgsIds, producedIds, workflowExists }: CheckInput ): Promise<CheckResult> {
  if ( usgsIds === null ) {
    return { ok: false, reason: `USGS could not confirm event ${eventId}; refusing because its aliases are unknown` };
  }
  const ids = [ ...new Set( [ eventId, ...usgsIds ] ) ];
  const produced = ids.find( id => producedIds.has( id ) );
  if ( produced ) {
    return { ok: false, reason: `a video was already made or started for this event (found under ${produced})` };
  }
  for ( const id of ids ) {
    let exists: boolean;
    try {
      exists = await workflowExists( id );
    } catch ( error ) {
      return { ok: false, reason: `could not check Temporal for quake_video-${id} (${error instanceof Error ? error.message : 'error'}); refusing` };
    }
    if ( exists ) {
      return { ok: false, reason: `workflow quake_video-${id} already exists in Temporal` };
    }
  }
  return { ok: true, ids };
}
