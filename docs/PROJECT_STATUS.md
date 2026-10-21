# Project status

Snapshot taken **2026-10-21** on branch `feat/publish-panama-d4-pacing` (HEAD `d1a5cb1`), from the code, publish manifests and
`video/publish/state.json`. The READMEs are partly stale (see "Known documentation drift"). When this file and a README
disagree, check the code and `video/publish/`.

Baseline: `video` 239 tests pass and typecheck is clean; `quake-news-agent` 126 tests pass. No network, no paid calls.

## 1. Layout

| Area | Path | Role |
| --- | --- | --- |
| 2017 website | `index.html`, `index.js`, `main.css` | Static USGS search app on GitHub Pages. Untouched. |
| Output.ai workflows | `quake-news-agent/src/workflows/` | `quake_news`, `quake_video`, `quake_monitor` (below). Run on Temporal. |
| Manual discovery/session | `quake-news-agent/src/discovery/`, `scripts/session.sh` | `npm run discover` (free), `npm run session -- produce <id>` (paid). |
| Remotion renderer | `video/src/` | News video, educational, historic, kids Shorts, shared components. |
| Publisher | `video/src/publisher/`, `video/scripts/youtube-publish.ts`, `video/publish/*.json` | YouTube upload and scheduling with manifests and approval hashes. |
| Decisions | `docs/decisions/0001..0003` | M5 monitoring, map rendering, VideoSpec. No ADR for production maps or publishing. |

## 2. Implemented and in use

**News Shorts from USGS events** (the only path that uses Output.ai)
- `quake_news` (`workflows/quake_news/`): fetch USGS, Claude drafts (`prompts/news_draft@v1.prompt`), deterministic fact check
  (`validation.ts`, hard gate), LLM editorial review (advisory, cannot override), one retry. Emits a `videoPackage`.
- `quake_video` (`workflows/quake_video/`): runs `quake_news` as a child, then spec, ElevenLabs narration with captions,
  terrain tiles and the Remotion render, via `video/` CLIs on the host. Stops at `ready_for_approval`; publishes nothing.
- Terrain map (`video/src/map/`), `QuakeNews` composition, soundtrack/captions (`video/src/audio/`), credits in
  `video/src/copy/credits.ts`.
- Published through this path: Vanuatu M6.0 and M6.3, Panama M7.7 "Quick Version" (the D4 faster-pacing experiment, now the latest commit).

**Educational and historic Shorts** (hand-scripted, hand-verified; no Output.ai, no LLM)
- Shell `video/src/edu/EduShort.tsx` (`makeEduShort`): captions, CTA, ducked music, narration clips, SFX, series tag.
- Scripts and timing in `src/edu/episodes.ts` (predict, magnitude, ring), `ep05.tsx` (depth), `src/historic/episodes.ts` (Chile 1960, Japan 2011, San Francisco 1906).
- Narration library keyed by text/voice/model (`src/edu/library.ts`) so approved clips are never paid for twice.
- Batch CLI `video/scripts/edu-batch.ts`: `plan` (free), `preview` (free silent render), `generate` (paid, ledgered), `final` (free).
- Source notes for facts live in `video/README.md` ("Verified facts") and each episode's `credits.txt`; they are prose, not machine-checked.

**Kids series** (`video/src/kids/`): *Why Does the Earth Shake?* (V1, V2, Short) and *Drop, Cover, Hold On!* (full and Short). `madeForKids: true`, playlist `PLZRNSXEHIr_A`.

**Publisher** (`video/src/publisher/`, `video/scripts/youtube-publish.ts`): commands `preview | approve | upload | inspect | schedule | queue | publish-now | update-metadata | create-kids-playlist`.
- Manifest holds `generated` vs human-reviewed `approved` text; `approval.contentHash` is invalidated by any later edit.
- Credits file is appended verbatim; Output.ai "Production Technology" block is appended.
- Cadence guard: Tue/Thu/Sat 18:00 America/Sao_Paulo, 24 h minimum lead. Write actions need `youtube:connect -- --write` and `--confirm`.
- Playlists: historic `PLKnoffH2oH5s`, science `PLDquHuxZZySw`, latest `PLPsR74lIhWgI`, kids `PLZRNSXEHIr_A`.

## 3. Catalog (from `video/publish/*.json` and `state.json`)

State values are as recorded locally; `state.json` is not refreshed from YouTube, so it can lag reality.

| Series | Title | State |
| --- | --- | --- |
| Science | Why Does Earthquake Depth Matter? (`depth`) | `scheduled` for 2026-10-19 (date has passed; state not reconciled) |
| Science | Why Can't We Predict Earthquakes? (`predict-r2`) | scheduled 2026-10-20 18:00 |
| Science | Magnitude 6 vs 7: How Much Stronger? (`magnitude-r2`) | scheduled 2026-10-22 |
| Science | What Is the Pacific Ring of Fire? (`ring-r2`) | scheduled 2026-10-24 |
| Historic | Chile 1960 (`chile1960-r2`) | scheduled 2026-10-27 |
| Historic | Japan 2011 (`japan2011-r2`) | scheduled 2026-10-29 |
| Historic | San Francisco 1906 (`sanfrancisco1906-r2`) | scheduled 2026-10-31 |
| Historic | `chile1960`, `japan2011`, `sanfrancisco1906` (non-r2) | `playlisted` (superseded by the r2 re-renders; same slots) |
| Latest | M6.0 Vanuatu `us6000u3bc`, M6.3 Vanuatu `us6000u3jl`, M7.7 Panama `us6000u18k` (D4) | published |
| Kids | Why Does the Earth Shake? (v1, v2, Short), Drop, Cover, Hold On! | published |
| Science | Will California Fall Into the Ocean? Myth vs Fact #shorts (`myth-california-ocean`) | **published 2026-10-21** via `publish-now` (<https://youtu.be/8Zke9Kf1128>), science playlist; outside the Tue/Thu/Sat cadence as an approved editorial experiment |
| Not in manifests | "Why Do Earthquakes Happen?" (`WhyEarthquakes`, ep 01, 60 s), the first Panama and the Kamchatka Short | uploaded earlier by hand per README; no manifest |

Note: this snapshot was taken on a working tree that also held the work of open PRs #31 (kids Shorts, Vanuatu M6.3) and #32 (Panama D4). On `master` before they merge, the manifests and `state.json` records for those videos are absent; they are already live on YouTube.

Next free editorial slots: Tue 2026-11-03, Thu 11-05, Sat 11-07 (18:00 America/Sao_Paulo).
Remotion compositions registered in `video/src/Root.tsx`: WhyEarthquakes, WhyCantWePredict, RingOfFire, MagnitudeSixVsSeven, EarthquakeDepth, KidsWhyEarthShakes (V1/V2/Short), KidsDropCoverHold, HistoricChile1960/Japan2011/SanFrancisco1906, QuakeNews, DesignBoard, spikes.

## 4. Partially implemented

- **`quake_monitor` (M5):** implemented and tested, **dry run by default**; `state/monitor.json` is empty (baselined 2026-10-18). Discovery is manual (`npm run discover`).
- **Approval gate:** human, but process-based (manifest `approve` + hash, `--confirm`). There is no workflow-level approval step (README milestone M3 "Planned" is only partly true).
- **Hook experiment** (`video/experiments/hooks`, untracked): HookD opener, not integrated into QuakeNews. `video/experiments/pacing` produced the published Panama D4.
- **Fact checking:** strong only for the `quake_news` path. Known gap: numbers written as words are not checked, so narration/captions need human review. Edu/historic/kids facts have no automated check.
- **ARCHIVE badge:** has no suppression logic for recent events (see `video/README.md`).
- **M2.2c map labels:** code and tests exist, paused and unused by QuakeNews.

## 5. Planned / not started

- Website integration of news and videos (M6); an always-on host for the monitor; paid autonomous mode.
- ADR for production maps/publishing; stats or audience feedback loop (no analytics code exists).
- Any Myth vs Fact format: no code, copy or mention exists in the repo (searched `video/`, `quake-news-agent/`, `docs/`).

## 6. Hard constraints to preserve

- Human approval before anything public; a passing LLM review never overrides a failed fact check.
- Every published terrain video carries the full attribution block (`fullCredits('terrain')`) plus the Output.ai production-technology block. The edu path appends its own `credits.txt`.
- Music only from `src/audio/music.ts` (YouTube Audio Library). The Pixabay "Legendary" track (Kulakovka) is retired after a Content ID block; a test keeps renderers off it. Check any manifest still pointing at a non-`-deified` render (e.g. `depth.credits.txt` still names Kulakovka).
- Paid calls (Anthropic, ElevenLabs) only when the user types the command; `edu-batch generate` is ledgered. Monitoring, not prediction: no forecast claims.
- On-screen illustrations must be labelled schematic when not to scale.

## 7. Known documentation drift

- `README.md` says publishing to YouTube is "Planned" and the monitor/publishing milestones M3/M4 are not done; the publisher (M1, M2) is implemented and 17 videos have manifests.
- `README.md` mentions only two manually published Shorts; the manifests show many more.
- `video/README.md` "Not here yet" lists M2.2-M2.4 as outstanding; they are done. `video/docs/MVP_HANDOFF.md` (2026-10-17) is historical: the branches it describes were merged.
- `video/experiments/` is untracked.

## 8. Experiment: Myth vs Fact 06, "Will California Fall Into the Ocean?"

**Status (2026-10-21): published** at <https://youtu.be/8Zke9Kf1128> (public, 44 s as processed by YouTube, playlist Earthquake Science Explained `PLDquHuxZZySw`).
Claims, script, change log and open scientific points: `docs/experiments/myth-fact-california.md`.

- Final: `video/out/edu/final/california-deified.mp4` (43.0 s, 447 ElevenLabs credits spent on 8 new clips; `edu-batch final --series=myth`, free from cache). Silent preview: `video/out/edu/preview/california.mp4`.
- v2 adds a dynamic MYTH/FACT hook, a second FACT ("LA is moving in with San Francisco ... in about 15 million years", USGS Fantasy page),
  a zooming California map, a compact closing CTA, and corrected wording ("moves", relative-to-North-America rate, no "sink").
- Code: `video/src/edu/ep06.tsx`, `ep06claims.ts`, `ep06.spec.ts`; composition `MythCaliforniaOcean` in `Root.tsx`; `myth` series in
  `scripts/edu-batch.ts`; small opt-in hooks in shared code: `StrikeSlip` exported from `src/historic/sanfrancisco1906.tsx`,
  `EpisodeDefinition.Cta` in `EduShort.tsx`, `EpisodeMeta.tailSeconds` in `episodes.ts`. Tests: video 243, agent 126, typecheck clean.
- Sources: two USGS pages; a spec fails if any script line lacks a USGS claim or if the corrected wording regresses.
- Deliberately not built: a generic Myth vs Fact framework, an Output.ai workflow.
- Publication: manifest `video/publish/myth-california-ocean.json` (approved, hash `9eafcd97bddf...`), `upload` (private + playlist) then `publish-now` (immediate, explicitly approved editorial experiment). The Tue/Thu/Sat guard was not touched: `publish-now` never goes through it, and no existing video was changed. `inspect` confirmed title, description, tags, category, language, audience and playlist, and public status.
- Open: the CTA section (about 39-44 s) is visually sparse; evaluate audience data before deciding whether to rework it. Decide whether the format earns a second episode or a `myth_fact` workflow. Decide after review whether the format earns a `myth_fact` workflow.

## 9. Separate follow-up (out of scope for the experiment)

- `depth` is still `scheduled` for 2026-10-19 in `state.json` (date passed): reconcile with YouTube via the publisher's `inspect`.
- `out/edu/final/depth.credits.txt` names the retired Kulakovka track; confirm which render is live and whether it needs the `-deified` re-render.
