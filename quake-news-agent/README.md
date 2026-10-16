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

Traces are written to `logs/runs/quake_news/`. The Temporal UI is at http://localhost:8080.

## Tests

All tests run offline:

- USGS responses come from real API responses saved in `src/workflows/quake_news/__fixtures__/`. There is one single-event response, one search result, one empty search, and a variant with optional fields removed.
- HTTP is mocked through `@outputai/http`.
- The workflow test mocks the steps and the evaluator. It checks that a passing LLM review cannot rescue a failed fact check, and that exactly one retry happens.
