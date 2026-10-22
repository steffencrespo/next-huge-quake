# quake-news-agent

An [Output.ai](https://docs.output.ai/) workflow that turns USGS earthquake data into a validated English news draft. It produces a short article and a 15–30 second narration script for a future video.

This is milestone M1. Video generation, uploads, scheduling and deployment are not part of it.

## How it works

The workflow `quake_news` (`src/workflows/quake_news/`) runs these steps:

```
fetch_earthquake ──► write_news_draft ──► fact_check_draft ──► review_news_draft
   (USGS API)          (LLM, prompt         (deterministic,       (LLM-as-judge,
                        news_draft@v1)        hard gate)            advisory)
                             ▲                                          │
                             └──────── one retry with feedback ◄────────┘
```

1. **`fetch_earthquake`** queries the [USGS FDSN event service](https://earthquake.usgs.gov/fdsnws/event/1/), either by `eventId` or for the strongest earthquake ≥ `minMagnitude` in the last `days`. It normalizes the response into `QuakeFacts`. Missing optional USGS fields (depth, PAGER alert, tsunami flag, felt reports, review status, last update) become `null`.
2. **`write_news_draft`** has Claude write a headline, a dek, a 100–150 word article and a 40–80 word narration script. Claude is instructed to use only the USGS facts.
3. **`fact_check_draft`** checks the draft against the facts with deterministic code (rules below).
4. **`review_news_draft`** is an LLM-as-judge editorial review. It checks for English, neutral tone, clarity, grounding, and narration that can be spoken.
5. If either check fails, the draft is regenerated once with the combined feedback (2 attempts at most).

`validation.passed` is `factCheck.passed && review.passed`. A passing LLM review can never override a deterministic failure.

## Results

The workflow returns one of two shapes:

```jsonc
// An earthquake was found
{
  "status": "draft",
  "facts": { "id": "us6000m0xl", "magnitude": 7.5, "place": "...", "timeUtc": "...", "status": "reviewed", "updatedUtc": "...", ... },
  "draft": { "headline": "...", "dek": "...", "article": "...", "narration": "..." },
  "validation": {
    "passed": true,
    "factCheck": { "passed": true, "contradictions": [], "unsupportedClaims": [], "missing": [], "shapeIssues": [], "wordCounts": { ... } },
    "review": { "passed": true, "confidence": 0.9, "reasoning": "...", "feedback": [] }
  },
  "attempts": [ { "attempt": 1, "passed": true, "factCheckPassed": true, "reviewPassed": true } ]
}

// No earthquake matched: a normal result, not an execution failure
{ "status": "no_candidate", "criteria": { "minMagnitude": 9.5, "startTimeUtc": "...", ... }, "reason": "..." }
```

Errors are reserved for real failures. HTTP 5xx and network errors are retried by Temporal. Malformed USGS payloads fail with a non-retryable `ValidationError`. An unknown `eventId` (USGS 404) returns `no_candidate`.

## Fact-check rules

These live in `validation.ts`. They check the headline, dek, article and narration.

| Category | Examples |
| --- | --- |
| **Contradictions** (a stated value conflicts with USGS) | Wrong magnitude (±0.05); wrong depth (±1 km; miles are converted); a date more than ±1 day from the UTC origin date (the USGS last-updated date is also accepted); a wrong weekday; a wrong `HH:MM UTC` time; a wrong PAGER color; a qualifier on the exact felt-report count ("nearly 1,911") |
| **Unsupported claims** (not in the USGS data) | Deaths, injuries, damage, losses, evacuations or rescues outside a PAGER sentence; PAGER impact stated as an outcome instead of a model estimate, or as both casualties and damage (the level reflects estimated fatalities *or* economic losses, whichever is higher); the felt count presented as people (it counts submitted reports); aftershock forecasts; claims that a tsunami or tsunami warning occurred; any tsunami mention when the USGS flag is not set; any number that can't be traced to a fact |
| **Missing** | Magnitude and location in both the article and the narration; the date and USGS attribution in the article; a "preliminary" caveat when the USGS status is not `reviewed` |
| **Shape** | Article 90–165 words (target 100–150); narration 40–80 words; headline ≤ 100 characters; dek ≤ 200 characters; narration contains no URLs or markup; text reads as English |

Equivalent formats are accepted:

- magnitude: `M7.5`, `magnitude 7.5`, `7.5-magnitude`
- dates: `Jan. 1`, `1 January 2024`, `2024-01-01`
- distance and depth: `10 km`, `10 kilometers`, `6 miles`
- place names: any case, with or without accents

Distances such as `35 km NE of Wajima` are not treated as depth.

## Setup

Prerequisites: Node.js ≥ 24.15 and Docker Desktop.

```bash
npm install
```

Set your Anthropic API key in one of two ways:

- Edit `.env`, which is git-ignored, and replace the `ANTHROPIC_API_KEY=credential:anthropic.api_key` line with `ANTHROPIC_API_KEY=<your key>`.
- Or keep that line and store the key in the encrypted credentials file with `npx output credentials edit`, under `anthropic.api_key`. `config/credentials.key` is git-ignored.

## Commands

```bash
npm test                     # unit tests (no network, no LLM calls)
npm run typecheck            # type-check sources and tests
npm run output:worker:build  # compile to dist/
npm run output:worker:check  # bundle-check the workflow for Temporal
npm run output:dev           # start local Temporal, Redis, Postgres, API, worker and UI
```

With the dev stack running:

```bash
npx output workflow run quake_news by_event_id         # 2024 Noto Peninsula, Japan (us6000m0xl)
npx output workflow run quake_news latest_significant  # strongest M5.5+ in the last 7 days
npx output workflow run quake_news no_candidate        # M9.5+ in the last day → no_candidate
npx output workflow debug <workflow-id>                # trace tree (add --format json for full detail)
```

### `quake_video` (M2.4d): event to rendered video

`quake_video` runs `quake_news` as a child workflow and, only if its validation passed, builds the video with the `video/` CLIs: spec, ElevenLabs narration with captions (one attempt; existing audio for the same text is reused), missing terrain tiles, and the MP4 with its credits. It stops with the video ready for human approval and publishes nothing. A failed validation, a deleted event or no candidate stops before any video stage.

Rendering needs the host (Chrome/GPU, `video/` files and `video/.env.local`), so the worker runs on the host and only the supporting services run in Docker:

```bash
C=node_modules/@outputai/cli/dist/assets/docker/docker-compose-dev.yml
docker compose -f $C --project-directory . --env-file .env up -d redis postgresql temporal temporal-ui
docker compose -f $C --project-directory . --env-file .env up -d --no-deps api
npm run output:worker:host    # worker on the host, one activity at a time (renders are serial)
```

Run it (this spends Anthropic and ElevenLabs credits). Use the deterministic workflow ID `quake_video-<eventId>`: Temporal rejects a second start while that run is in progress. A repeat after it finishes starts a new run, which asks Anthropic again but reuses the existing narration (no second ElevenLabs charge). A later USGS update to the same event needs a new video version and a new ID:

```bash
curl -s localhost:3001/workflow/start -H 'content-type: application/json' -d '{
  "workflowName": "quake_video", "workflowId": "quake_video-us6000u18k",
  "input": { "eventId": "us6000u18k", "asOfUtc": "2026-10-18T18:00:00.000Z" } }'
npx output workflow result quake_video-us6000u18k
npx output workflow run quake_video no_candidate   # free check: M9.5+ in the last day
```

The result has the event ID, `status` (`ready_for_approval`, `no_candidate`, `rejected` or `failed`), the output paths under `video/out/`, the validated text for the editor, and per-stage durations. `VIDEO_DIR` overrides the location of `video/` (default: the `video/` folder next to `quake-news-agent/`).

Status of `quake_video`: one fully real, unattended run has succeeded (Pakistan M5.7, `us6000u2y1`): real Anthropic, one ElevenLabs request, real terrain preparation and a real render, entirely through Temporal, ending `ready_for_approval` in about 4.3 minutes. Earlier Temporal checks of the rejection path, the single TTS attempt and serial execution used mocked Anthropic and stubbed video scripts. One successful run is not a track record: failure paths with real services (for example a narration over the length limit) have not been exercised.

### Manual operation (no always-on monitor)

For now nothing runs in the background: discovery and production are started by hand, once or twice a day, and the services are stopped when you finish. The continuous `quake_monitor` below stays in the repository for later hosting.

```bash
# 1. Discover (free: one USGS request; needs no Docker, Temporal or worker)
npm run discover                 # last 48 h; add  -- --hours 168  for a wider look
```
It lists M5.5+ earthquakes ranked by USGS significance with the monitor's own eligibility rules (M6.0+, or M5.5-5.9 with PAGER yellow or worse or significance >= 600; at least 2 minutes old; thresholds are the `MONITOR_*` settings). Events that already have a video (a package under `video/out/packages/` or a monitor record, matched by ID and aliases) are shown as `produced` and never recommended. The best few (at most `MONITOR_MAX_STARTS_PER_DAY`, default 2) are marked `SHORTLIST`. That number is only the shortlist size: it is a suggestion, not a spending cap, and nothing counts or enforces it. It starts nothing.

```bash
# 2. Approve a candidate yourself, then bring up the services (Docker Desktop must be open)
npm run session -- start         # Temporal, Postgres, Redis, UI and API in Docker
npm run session -- worker        # in its own terminal; Ctrl-C stops it; refuses a second worker

# 3. Produce the approved event (SPENDS: Anthropic requests and one ElevenLabs request; about 4-5 minutes)
npm run session -- produce us6000xxxx
npm run session -- result us6000xxxx    # paths, stage durations and the validated text; nothing is published

# 4. When finished
npm run session -- stop          # stops the worker and this project's Docker services (data is kept)
```
`produce` is the only step that spends money, and it only runs when you type it: there is no daily quota, so the discipline is yours. Before any paid work it makes a free check and refuses (spending nothing) if the event, under its own ID **or any alias USGS lists for it**, already has a video package, was started or finished by the monitor (`state/monitor.json`), or already has a `quake_video-<id>` workflow in Temporal; it also refuses when USGS or Temporal cannot be checked. You can run the check alone with `npm run discover -- --check <eventId>`. It then runs the existing `quake_video` workflow with the workflow ID `quake_video-<eventId>`. Review the video, then upload it by hand, with `credits.txt` and the production-technology credit in the description. `npm run session -- status` shows the services and the worker.

### `quake_monitor` (M5): automatic discovery

A long-lived workflow polls USGS every 5 minutes for M5.5+ earthquakes and, when enabled, starts `quake_video` for the best eligible new event. It never publishes. **It is a dry run by default** (`MONITOR_DRY_RUN` is on unless set to exactly `false`): it records what it would start and starts nothing.

Selection (all thresholds are `MONITOR_*` settings, see `.env.example`):
- eligible: M6.0 or more, or M5.5-5.9 with PAGER yellow/orange/red or USGS significance >= 600; origin between 2 minutes and 12 hours ago; preliminary data is accepted (M1 labels it and still validates the text);
- the best event of a poll is the one with the highest USGS significance, then magnitude;
- an event that is not eligible yet (no PAGER, too young) is re-evaluated at every poll while no workflow has started for it;
- once a workflow has started for an event, it is never started again automatically, whatever USGS updates, and a failed workflow is not restarted;
- on the very first poll, events older than 30 minutes are recorded as baseline and never started (no backlog);
- at most `MONITOR_MAX_STARTS_PER_DAY` (default 2) starts per UTC day and one `quake_video` at a time (the worker also runs one activity at a time, so renders never overlap).

State is `state/monitor.json` (git-ignored, atomic writes, a corrupt file stops the poll instead of being replaced). Each event is `observed`, `baseline`, `would_start`, `starting`, `started`, `ready_for_approval`, `rejected`, `no_candidate` or `failed`. A start is written to the state file before the workflow is started, and an unclear start response is checked against Temporal before anything is retried. Dry-run observations (`would_start`) stay startable when real mode is switched on.

```bash
# start (with the host worker running, see above); stop with terminate
curl -s localhost:3001/workflow/start -H 'content-type: application/json' \
  -d '{"workflowName":"quake_monitor","workflowId":"quake_monitor","input":{}}'
npx output workflow terminate quake_monitor
cat state/monitor.json        # what was seen, selected, started and the outcomes
```

Polling pauses while a video renders, because the worker runs one activity at a time. Paid autonomous operation has **not** been enabled: the monitor is a dry run until it is explicitly switched on with `MONITOR_DRY_RUN=false`, ideally after watching dry-run output on real data.

Traces are written to `logs/runs/quake_news/`. The Temporal UI is at http://localhost:8080.

### `quake_publish`: Breaking News Fast Track (off by default)

Publishes routine eligible breaking news without a person in the loop, under a versioned policy (`fast-track@1`). Off unless `FAST_TRACK_ENABLED=true`, and private unless `FAST_TRACK_FINAL_PRIVACY=public`. Events it refuses end at `ready_for_approval` exactly as before.

- **Start:** the monitor (real mode) starts `quake_video` with `fastTrack` for M6.0+ candidates that are not PAGER red, after reserving the worst-case cost (`src/fast_track/budget.ts`) against the per-event, daily and monthly limits. A spent limit means no start at all. Missing prices or limits disable the fast track.
- **Gate (after the render, on fresh USGS data):** tier A is M7.0+ with an impact signal; tier B is M6.0-6.9 with PAGER yellow/orange, significance >= 600 or >= 10,000 people at intensity VI+; tier C (the M5.5-5.9 populated-area rule) is recognized but manual in v1. Always manual: PAGER red, no PAGER yet, a published event within 150 km and 72 h, facts revised since production, older than 6 h, the daily publication cap.
- **Publication:** a deterministic title, description and tags (fact-checked with the M1 rules; PAGER is described only as a model estimate and no confirmed impact is claimed), then `approve --authority=fast-track@1` (content hash plus the facts snapshot), `reconcile`, private `upload`, `inspect --strict --expect=private`, a pause check, `publish-now`, `inspect --strict --expect=public`.
- **Stops:** `FAST_TRACK_ENABLED`, the pause file (`state/FAST_TRACK_PAUSED`, re-checked right before publication) and `MONITOR_DRY_RUN`.
- **Records:** `state/fast-track.json` (reservations, decision, video, timestamps); the workflow output has the latency from origin to public. Manifests and `video/publish/state.json` change in the worker's checkout and are committed afterwards, outside the publication path.

A controlled test without the monitor: start `quake_video` for a chosen event with `"fastTrack": { "detectedAtUtc": null }` in the input, and `FAST_TRACK_ENABLED=true` with `FAST_TRACK_FINAL_PRIVACY=private`. This spends Anthropic and ElevenLabs credits and uploads a private video.

## Tests

All tests run offline:

- USGS responses come from real API responses saved in `src/workflows/quake_news/__fixtures__/`. There is one single-event response, one search result, one empty search, and a variant with optional fields removed.
- HTTP is mocked through `@outputai/http`.
- The workflow test mocks the steps and the evaluator. It checks that a passing LLM review cannot rescue a failed fact check, and that exactly one retry happens.
