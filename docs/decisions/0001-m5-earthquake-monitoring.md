# ADR 0001: Lightweight polling for automatic earthquake monitoring (M5)

- **Status:** Implemented in M5 as the Output.ai workflow `quake_monitor` (dry run by default; see the amendments below). Paid autonomous operation is not enabled.
- **Date:** 2026-10-15

## Context

M1 provides the Output.ai workflow `quake_news`. Given a USGS event ID, it fetches the event, drafts an article and a narration script with an LLM, and validates them. M5 should detect earthquakes automatically. Running the full workflow on every check would spend LLM calls and Temporal executions on events that are already handled or not newsworthy.

## Decision

Add a separate, lightweight **poller** in front of the news workflow:

1. **Poll every 5 minutes.** Fetch a USGS GeoJSON summary feed. The poller makes no LLM calls and does not start the news workflow just to check.
2. **Deduplicate by USGS event ID.** Also match the feature's `ids` list, because the same earthquake can be reported under several network IDs.
3. **Detect new or meaningfully updated events.** Compare each event against its last processed snapshot: `updated` timestamp, magnitude, review status, PAGER alert and tsunami flag. A newer `updated` alone is not enough; only changes to these fields count. Which changes count, and by how much, is to be decided in M5.
4. **Filter for eligibility before triggering.** Use the same rules as M1: event type `earthquake` and magnitude ≥ the configured threshold (default 5.5).
5. **Persist processing state** in a durable store keyed by event ID: last snapshot, last trigger time and outcome. A restart then neither re-triggers old events nor misses new ones.
6. **Trigger `quake_news` only for eligible events**, passing `{ "eventId": "<id>" }`. Use a deterministic workflow ID derived from the event ID and the triggering update, so a repeated poll cannot start a duplicate run.
7. **Keep human approval mandatory.** A generated draft is never published to YouTube automatically. A person must approve it first.

## Consequences

- The M1 workflow needs no changes; it already accepts `eventId`.
- Polling cost stays low: one HTTP request per interval, no LLM usage.
- M5 has to choose:
  - the feed, which must cover the 5-minute interval with overlap (for example a past-hour feed);
  - the state store;
  - how the poller is hosted (for example a Temporal schedule or a small standalone process);
  - the thresholds for a "meaningful" update.

## Amendments made in the M5 implementation

- **Hosting:** a long-lived Output.ai workflow (`quake_monitor`) that polls, sleeps and continues as new. It starts `quake_video` through the Output API with the workflow ID `quake_video-<eventId>`. The state store is `state/monitor.json`.
- **Eligibility:** M6.0 or more, or M5.5-5.9 with PAGER yellow or worse or USGS significance >= 600; origin age 2 minutes to 12 hours. Preliminary data is accepted. Ranking is by USGS significance, then magnitude. All values are `MONITOR_*` settings.
- **Updates:** an event is re-evaluated at every poll until a workflow has started for it. After a start it is never regenerated automatically; the stored snapshot (magnitude, status, PAGER, significance, update time) keeps that possible later.
- **Safeguards:** dry run by default, 2 starts per UTC day, one video at a time, no automatic restart of a failed video, the start is recorded before it is made, no backlog at the first start.
