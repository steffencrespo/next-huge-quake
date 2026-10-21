# Project status

Snapshot of `master` at `4b373cc` (PR #33), **2026-10-21**. Taken from the code, publish manifests, `video/publish/state.json` and a public-visibility check of the listed videos. This is a maintained snapshot, not an authority: the code, the repository history and verified external service state (for example YouTube) take precedence, so where this file or a README disagrees with them, they win and the document should be corrected. Priorities live in [ROADMAP.md](ROADMAP.md); decisions in [DECISION_LOG.md](DECISION_LOG.md).

Last recorded test baseline (PR #33): `video` 243 tests, `quake-news-agent` 126, typecheck clean. Not re-run for this docs-only snapshot.

## 1. Layout

| Area | Path | Role |
| --- | --- | --- |
| 2017 website | `index.html`, `index.js`, `main.css` | Static USGS search app on GitHub Pages. Untouched |
| Output.ai workflows | `quake-news-agent/src/workflows/` | `quake_news`, `quake_video`, `quake_monitor`, on Temporal |
| Manual discovery | `quake-news-agent/src/discovery/`, `scripts/session.sh` | `npm run discover` (free), `npm run session -- produce <id>` (paid) |
| Remotion renderer | `video/src/` | News video, educational, historic, kids and Myth vs Fact Shorts, shared components |
| Publisher | `video/src/publisher/`, `video/scripts/youtube-publish.ts`, `video/publish/` | YouTube upload and scheduling, manifests, approval hashes |
| Decisions | `docs/decisions/0001..0003` | M5 monitoring, map rendering, VideoSpec (ADRs only) |

## 2. Workflows and integration status

**Only Breaking Quakes runs through Output.ai.** Every other format uses separate Remotion tooling in `video/`, run by hand. Publishing is outside Output.ai for all formats.

| Path | Orchestration | Notes |
| --- | --- | --- |
| Breaking news | Output.ai | `quake_news` (USGS, Claude draft, deterministic fact check as hard gate, advisory LLM review, one retry) then `quake_video` (spec, ElevenLabs narration and captions, terrain tiles, Remotion render). Stops at `ready_for_approval` |
| Monitoring | Output.ai | `quake_monitor`: implemented, tested, **dry run by default**; `state/monitor.json` baselined 2026-10-18. Discovery is manual today. Paid autonomous mode is off |
| Educational and historic | `video/scripts/edu-batch.ts` | Hand-scripted and hand-verified, no LLM. Shell `src/edu/EduShort.tsx`, narration library `src/edu/library.ts` so approved clips are never paid for twice. Commands: `plan` and `preview` and `final` (free), `generate` (paid, ledgered) |
| Kids | `video/scripts/render-kids.ts`, `generate-kids-narration.ts` | `src/kids/`; `madeForKids: true`, own playlist |
| Myth vs Fact | `edu-batch --series=myth` | `src/edu/ep06.tsx`, claims enforced by `ep06.spec.ts`. One episode; no framework, no workflow |
| Publishing | `youtube-publish.ts` | `preview, approve, upload, inspect, schedule, queue, publish-now, update-metadata, create-kids-playlist`. Approval is manual: `approved` text plus `contentHash`, invalidated by any later edit. Write actions need `--write` and `--confirm`. Tue/Thu/Sat 18:00 America/Sao_Paulo guard with 24 h lead; `publish-now` bypasses it |

The publisher appends the full terrain attribution block (where applicable), the episode `credits.txt` and the Output.ai "Production Technology" block. Playlists: historic, science, latest, kids (IDs in the manifests).

## 3. Published and scheduled content

Local `state.json` is not refreshed from YouTube. Public visibility below was checked on 2026-10-21 via YouTube's oEmbed endpoint (public means reachable; non-public videos are refused). It does not confirm schedule times.

| Content | Local state | Public today |
| --- | --- | --- |
| **Myth vs Fact: Will California Fall Into the Ocean?** (`myth-california-ocean`) | published 2026-10-21 via `publish-now`, science playlist | Yes: <https://youtu.be/8Zke9Kf1128>. Merged in PR #33 |
| Depth (`depth`), Predict (`predict-r2`) | `scheduled` for 2026-10-19 and 2026-10-20 | Yes. Slots have passed; local state is stale |
| Magnitude (`magnitude-r2`, 10-22), Ring of Fire (`ring-r2`, 10-24) | scheduled | Not public yet, as expected |
| Chile 1960 (10-27), Japan 2011 (10-29), San Francisco 1906 (10-31), all `-r2` | scheduled | Not public yet, as expected |
| Non-r2 historic uploads (`chile1960`, `japan2011`, `sanfrancisco1906`) | `playlisted`, superseded by r2 | Not public |
| Vanuatu M6.0 (`us6000u3bc`), Vanuatu M6.3, Panama M7.7 Quick Version | published | Yes (M6.0 and Panama D4 checked). M6.3 and Panama D4 manifests are in open PRs #31 and #32 |
| Kids: *Why Does the Earth Shake?* (V1, V2), *Drop, Cover, Hold On!*, short cut | published | V1 and V2 manifests on master; the rest are in PR #31 |
| Earlier by hand, no manifest | "Why Do Earthquakes Happen?" (ep 01), first Panama, Kamchatka | Published |

Next free regular slots: Tue 2026-11-03, Thu 11-05, Sat 11-07 (18:00 America/Sao_Paulo).

## 4. Open PRs and dependencies

- **#31** Kids ep 01 short version and ep 02, plus the Vanuatu M6.3 manifest and `state.json` records. Content is already live on YouTube.
- **#32** Panama M7.7 Quick Version (D4 pacing experiment) manifest and `state.json`. Stacked on #31; retarget to master after #31 merges. The pacing experiment code (`video/experiments/`) is untracked and not in any PR.
- Until both merge, `master` lacks manifests for videos that are already public. Merging #31 then #32 touches `state.json`, so expect conflicts with anything else that edits it.

## 5. Current experiments

- **Myth vs Fact:** one episode published; claims and sources in [experiments/myth-fact-california.md](experiments/myth-fact-california.md). Open: the closing CTA section (about 39 to 44 s) is visually sparse. No decision yet on a second episode or a workflow.
- **Pacing (Panama D4):** faster-paced re-cut published; baseline views 1,161, likes 8, comments 1. Analytics metrics were unavailable.
- **Hook opener (HookD):** local only, not integrated into `QuakeNews`.

## 6. Immediate next steps

1. Review and merge this docs PR, then #31 and #32 (in that order).
2. Reconcile `state.json` with YouTube using `inspect` (`depth` and `predict-r2` are stale).
3. Decide what to do about analytics: the OAuth token lacks the analytics scope.
4. Choose the next Myth vs Fact topic or hold, after reviewing audience data.

## 7. Known limitations and follow-ups

- **Fact checking:** automated only for `quake_news`, and it does not detect numbers written as words. Other formats rely on human review and, for Myth vs Fact, a claims spec.
- **Approval** is process-based in the publisher, not a workflow step.
- **ARCHIVE badge** has no suppression logic for recent events (`video/README.md`).
- **M2.2c map labels** exist but are paused and unused.
- **Music:** only `src/audio/music.ts` tracks. `out/edu/final/depth.credits.txt` still names the retired Kulakovka track; confirm which render is live and whether it needs the `-deified` re-render.
- **No analytics code**, no always-on monitor host, no website integration (M6).
- **ADRs missing** for production maps and publishing.
- `video/README.md` "Not here yet" lists M2.2 to M2.4 as outstanding but they are done; `video/docs/MVP_HANDOFF.md` is historical. The label "M3" is used both for editorial approval and for the first educational Short (see [ROADMAP.md](ROADMAP.md)).
