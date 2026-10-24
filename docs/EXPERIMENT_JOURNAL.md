# Next Huge Quake — Engineering & Experimentation Journal

*Started: 2026-10-21. Historical entries reconstructed from project conversations and GitHub milestones, then checked against the repository, PRs and implementation on 2026-10-21 (repository state: `origin/master` at `ea680e7`, PR #36). This is an evidence-oriented log, not a claim of measured audience impact.*

## Purpose

Capture what we attempted, why we attempted it, the actual observations, decisions and what remains unknown. Use this material both to improve Next Huge Quake and as source material for future engineering write-ups about Output.ai, agentic development and experiment-driven publishing.

### Evidence labels

- **[repo]** verifiable in Git, a PR or a manifest.
- **[editorial]** a human's subjective review or preference. Not audience data.
- **[reported]** stated in project conversations or from screenshots; not verifiable from the repository.
- **[metric]** a measured YouTube number, with its source and date. Retention figures need YouTube Analytics, which is not available yet.

### Lightweight entry format

- **Date / experiment / status**
- **Hypothesis:** what we thought might improve
- **Implementation / evidence:** what actually ran; relevant PRs, videos, source artifacts
- **Observation:** engineering measurements or human editorial review; distinguish them from viewer metrics
- **Decision:** approved, rejected or pending
- **Next measurement / follow-up**

---

## 2026-10-21 — Establish a durable source of truth

**Status:** Implemented.

**Hypothesis:** Product direction and implementation context will be easier to retain across ChatGPT and Claude Code sessions if decisions and project status live in Git rather than relying on conversation memory.

**Implementation / evidence [repo]:** PR [#34](https://github.com/steffencrespo/next-huge-quake/pull/34), squash merge `d39cbe6`, created `docs/ROADMAP.md`, `docs/DECISION_LOG.md`, refreshed `docs/PROJECT_STATUS.md` and README (the human-authority and documentation-precedence refinements were made in the same PR before merge). PR [#35](https://github.com/steffencrespo/next-huge-quake/pull/35), merge `2db66cb`, refreshed the status snapshot after the publication-record PRs [#31](https://github.com/steffencrespo/next-huge-quake/pull/31) (merge `5bf5885`) and [#32](https://github.com/steffencrespo/next-huge-quake/pull/32) (merge `bb0596d`).

**Observation:** The documentation distinguishes approved decisions, operating practice and proposals; the code, Git history and verified external service state remain authoritative when documentation is stale.

**Decision:** Keep documentation lightweight. Use ROADMAP for direction, DECISION_LOG for decisions, PROJECT_STATUS for snapshot and this journal for experiments and learning.

**Follow-up:** Update journal when there is a meaningful experiment or surprise, not for every code change.

## 2026-10-21 — Myth vs Fact: California proof of format

**Status:** Published; format remains experimental.

**Hypothesis:** A surprising misconception paired with a clear scientific correction can make a compelling educational Short.

**Implementation / evidence [repo]:** *Will California Fall Into the Ocean?* [published video](https://youtu.be/8Zke9Kf1128) (published 2026-10-21 with the publisher's `publish-now`, outside the regular schedule as an approved experiment); code, claims spec and experiment notes (`docs/experiments/myth-fact-california.md`) merged via PR [#33](https://github.com/steffencrespo/next-huge-quake/pull/33), merge `4b373cc`. Every script line maps to a USGS claim and a spec fails otherwise. The published natural-pacing version is 43.0 s (44 s as processed by YouTube). An earlier draft of the episode was reworked before publication: a stronger MYTH/FACT hook, a second FACT, a compact closing card and corrected wording.

**Observation:** The episode was produced, checked and published [repo]. Human review found the narration relatively slow compared with the approved Panama D4 pacing [editorial]. No viewer metrics have been recorded for it; no retention conclusions are available [metric: none].

**Decision:** Keep the existing published video unchanged; use it as a reference for pacing and potential alternative-storytelling experiments.

**Follow-up:** Compare audience metrics when available. Prototype a meaningful *cold open + seamless loop* reinterpretation, with publication only after human approval.

## 2026-10-21 — Panama D4 narration pacing adapted for future Shorts

**Status:** Implemented and merged (PR [#36](https://github.com/steffencrespo/next-huge-quake/pull/36), `ea680e7`); effect on audience behavior not measured.

**Hypothesis:** A faster narration pace can make Shorts feel more engaging without making the voice unnatural.

**Implementation / evidence [repo]:** Reverse-engineered the Panama D4 local pacing experiment (`video/experiments/pacing/build.mts`, untracked; D4 raised an earlier 1.1x variant to 1.2x). D4 itself was published as the Panama M7.7 Quick Version ([video](https://youtu.be/38gs3cb4JgM), record via PR [#32](https://github.com/steffencrespo/next-huge-quake/pull/32)). Parameters recovered: ffmpeg `atempo=1.2` (pitch preserved); silence threshold −35 dB for at least 0.2 seconds; target pauses 0.1 s after sentence ends, 0.2 s after colons, 0.15 s at other phrase breaks. Captions are retimed along the audio transformation. The California original was ~43 s; the initial fast render ~28 s; a *fast-beats* render preserving scripted dramatic pauses ~30 s. Beyond the experiment, PR #36 made the preset the default for news and the educational tooling (`--pace=natural` restores the old behavior), shortened news videos to end 3.77 s after the voice (a Panama render went from 29.7 s of narration and a 35 s video to 22.6 s and 27.9 s), lowered the minimum spec duration from 30 s to 24 s, and gave each Context card 3.1 s, the D4 reading time, after a review found 2.8 s. Port check: caption times matched the D4 experiment within about 4 ms.

**Observation:** The user approved the faster voice but preferred preserving intentional dramatic pauses (MYTH→FACT, scientific reveal, punchline) [editorial]. A fully tightened version (`fast`, ~28 s) was therefore not adopted; `fast-beats` keeps the pauses the script declares. Engineering checks [repo]: median pitch of a test clip 136.8 Hz before and 137.3 Hz after, no clipped samples, captions within about 14 ms of the one speech onset checked acoustically. No independent speech-recognition alignment was run. Only a baseline for the original Panama video exists [metric]: 1,161 views, 8 likes and 1 comment at the time of the PR #32 capture, with Analytics metrics unavailable. None of this measures retention gains.

**Decision:** Adopt `fast-beats` (1.2×, pitch preserved, shorter natural silences, scripted beats retained) as the default direction for new news, educational, historic and Myth vs Fact Shorts. Do not retroactively change published or scheduled videos. Kids format remains outside the initial implementation.

**Follow-up:** Compare retention when analytics is available; avoid claiming the preset improves performance without data. Not covered: the kids series, and D4's compressed 45-frame closing scene.

## 2026-10-21 — Experiment-Driven Publishing

**Status:** Editorial strategy approved 2026-10-21 and recorded in `docs/DECISION_LOG.md` and `docs/ROADMAP.md` (PR #36). Cold opens and seamless loops are not implemented.

**Hypothesis:** Early-stage channel growth benefits from frequent, inexpensive, genuinely differentiated storytelling experiments and feedback from real audiences rather than intuition alone.

**Implementation / evidence:** Proposed variations include fast-paced narration, red/high-contrast hooks, *cold opens*, *in medias res* storytelling and seamless loops [reported]. In the repository, fast-paced narration is implemented (above), and an opening-hook experiment exists locally: Hooks A to D were prototyped, C was discarded and the hybrid D (red, urgent, "EARTHQUAKE REPORTED" framing) was approved but is not in production and not validated with audience metrics (`video/experiments/hooks/README.md`, untracked) [repo, editorial]. California's hook was also reworked into a red MYTH/FACT opener before publication. California's existing assets and narration can support a low-cost alternative edit. A new version should test a distinct editorial hypothesis, not merely duplicate an existing upload.

**Observation [editorial]:** The user explicitly prefers publishing high-quality approved experiments instead of limiting them to private previews. Existing publishing baseline remains Tuesday/Thursday/Saturday at 18:00 São Paulo time, with separately approved special or urgent publications permitted outside regular slots.

**Decision:** Prototype rapidly; publish materially distinct approved variations; measure *Stayed to watch*, average percentage viewed, average view duration and engagement when available. Treat across-time comparisons as directional, not controlled A/B tests. Preserve explicit human approval before publication.

**Follow-up:** Produce and review California *cold open + seamless loop*, then decide publication. Log the hypothesis and later actual analytics separately.

## 2026-10-21 — Audience-demand discovery without scraping

**Status:** First manual exploration; backlog selection pending.

**Hypothesis:** Editorial ideas should be prioritized using observable interest and content gaps rather than solely the team's preferences.

**Implementation / evidence [reported]:** User inspected YouTube Studio Trends and shared screenshots for `earthquake`, `san andreas fault` and `tsunami`. Initial signals included interest in real earthquake footage/alerts, San Andreas simulations and the search phrase `biggest tsunami in the world`. One historically successful tsunami video had approximately 65.5 million cumulative views over about two years; this is not evidence of recent breakout growth. These figures come from the screenshots as relayed in conversation; they are not in the repository and were not independently verified.

**Observation:** YouTube Studio Trends and Content Gaps are valuable but do not, to our knowledge, have a documented public API offering those exact insights (the project's OAuth token does not yet include the Analytics scope either). The user rejected authenticated scraping or approaches that could violate platform policies. Instead, user shares Studio screenshots and ChatGPT helps interpret demand, urgency, competition and topic duplication; Claude Code produces only approved topics.

**Decision:** Human-assisted, platform-compliant research first; no YouTube Studio crawler. A future Output.ai workflow may organize supplied evidence when actually justified.

**Follow-up:** Resume the three screenshot analyses after fast-beats and the cold-open experiment; check publication catalog before proposing episodes. Hold *Can Animals Sense Earthquakes?* and *What Is a Tsunami?* as future backlog ideas (not recorded elsewhere in the repository) unless demand and editorial priority warrant reconsideration.

## 2026-10-21 — Human authority over consequential actions

**Status:** Approved and documented.

**Hypothesis:** AI autonomy creates value in investigation and execution, but unsupervised external actions can carry social, reputational, commercial or safety consequences.

**Implementation / evidence [repo]:** Added to `docs/DECISION_LOG.md` ("Accuracy and approval") through PR #34; present on `master`. Agents may research, inspect code, generate artifacts, test and make recommendations. External communication, disclosure, publication, modification of shared systems and acting in someone's name require explicit authorization within a defined scope.

**Observation:** The distinction is not just technical correctness; human context matters when choosing how and to whom information is disclosed.

**Decision:** Delegate work, not blanket authority. Bounded workflows may receive explicit authorization. This journal does not itself authorize any external action.

**Follow-up:** Preserve approval gates in new workflows and review integrations for least-privilege permissions.

## 2026-10-21 — California cold open + seamless loop (prototype)

**Status:** v2 editorially approved and scheduled: [youtu.be/rVSj_PvFPmE](https://youtu.be/rVSj_PvFPmE), going public Friday 2026-10-23 18:00 America/Sao_Paulo (a separately approved experiment release outside the Tue/Thu/Sat cadence). Package merged in PR [#38](https://github.com/steffencrespo/next-huge-quake/pull/38) (`156e3f4`). No audience data yet.

**Hypothesis:** Opening on the Los Angeles / San Francisco reveal, building the context, and ending on a state that matches the first frame may improve retention and encourage replays compared with the published natural-order episode. Untested.

**Implementation / evidence [repo]:** `video/src/edu/ep06loop.tsx` and `video/scripts/render-california-loop.ts`; the published episode's map, cards, cached narration and music are reused, with fast-beats pacing. No new narration was generated (no paid calls). The order is: cold open (the reveal, then the conditional "well… in about fifteen million years") → MYTH → nowhere to fall → plates → slide → rate → "Southwestern California is moving north." → loop. The spoken lead-ins "Fact two:" and "Fact one:" were cut from the cached clips at the word boundaries the alignment gives, so the reordered lines read naturally, and the spoken call to action was dropped; a compact on-screen brand/like/subscribe row was included in v1. The 15-million-year line stays conditional in the visuals ("If today's plate motion simply continued · schematic", plus the existing schematic/accelerated label). The body ends with the map in the state the cold open starts from, so a replay continues the motion. First render (v1): 23.3 s, against 43.0 s for the published version (local render `video/out/edu/final/california-loop.mp4`, git-ignored). The published video, manifests and state are unchanged.

**Observation:** Engineering checks only, from stills: the last frame and the first frame match on the map and labels; the card, caption and brand row were crowded in the cold open. No audience data yet [metric: none].

**Decision:** Pending human review. If approved for publication it would be a separately approved experiment outside the regular schedule, with its credits and manifest prepared first.

**Editorial feedback on v1 [editorial, subjective; not audience data]:** The cold open and the circular storytelling worked very well in the reviewer's judgment, but at 23.3 s the experience felt too rushed. The early Like/Subscribe row competed with the story.

**Iteration v2 [repo]:** Same cold open, storyline, claims, visuals and loop. Longer scripted pauses between the narrative sections and before the reveals (the speech is unchanged fast-beats; the global preset is not modified), a re-laid-out opening card with a readable conditional qualifier clear of the caption, the map footnote faded out so it no longer overlaps the "accelerated" label, the Like/Subscribe row removed, and a steady music bed with no opening swell or closing fade so the loop is continuous in sound. Duration: 28.54 s (v1: 23.3 s). The v2 pauses were chosen by feel for the viewing experience, not derived from data. 

**Editorial assessment of v2 [editorial, subjective; not audience data]:** The reviewer approved v2 for publication as a new, distinct storytelling experiment. This is a judgment about the viewing experience, not evidence of better retention.

**Publication preparation [repo]:** at the preparation stage (PR #38), the manifest `video/publish/california-loop.json` was unapproved, and the publisher's `approve`, a slot and the upload were separate human steps; it has since been approved and scheduled (see Publication below) and credits generated by `scripts/render-california-loop.ts --credits-only`. Approved render: `video/out/edu/final/california-loop.mp4`, 28.544 s, 1080x1920, 4,132,770 bytes, SHA-256 `4281c6c708234c7e16398692906d2448381a6ff53f0b1c28fcf611c2040db1e0` (git-ignored; not regenerated after approval). The publisher's read-only preview passed: authorized channel, playlist ownership, no duplicate title; blockers were only the missing approval and slot. Every narration line is a published-episode line backed by a USGS claim (`ep06claims.ts`, checked by `ep06loop.spec.ts`).

**Publication [repo]:** the render checksum was re-verified before upload; the publisher uploaded it privately, added it to Earthquake Science Explained, scheduled it, and `inspect` confirmed title, description with credits, tags, category, language, audience and playlist. The description keeps the reference to the original Myth vs Fact video. The scheduling used the publisher's `scheduleException` (24 h lead kept) for the Friday slot.

**Follow-up:** After publication, record Analytics for both videos here, separately from this entry's hypothesis. Once published, compare Analytics against the original California Short as a directional comparison and not a controlled test; record the result here separately. The music still restarts from its first bar at the loop point; with a steady low bed this is subtle but not a musically seamless loop.

## 2026-10-22 — SIX SEVEN: Earthquake Edition (meme hook, acquisition test)

**Status:** v2 editorially approved and scheduled: [youtu.be/i8mfyBetegY](https://youtu.be/i8mfyBetegY), going public Sunday 2026-10-25 18:00 America/Sao_Paulo (a separately approved experiment release outside the Tue/Thu/Sat cadence). Package merged in PR [#41](https://github.com/steffencrespo/next-huge-quake/pull/41) (`1106c43`). No audience data yet.

**Hypothesis (untested):** a recognizable meme used as an immediate hook, followed by an unexpected, accurate piece of earthquake science, may attract viewers who would not normally watch earthquake content, potentially improving Stayed to watch and introducing the channel to a broader audience. Acquisition and Stayed to watch are the metrics to compare once Analytics is available, directionally and not as a controlled test.

**Implementation / evidence [repo]:** `video/src/edu/sixseven.tsx`, `sixsevenScript.ts`, `video/scripts/six-seven-narration.ts` (paid, one attempt per line, budget-capped) and `render-six-seven.ts`; sources and notes in `docs/experiments/six-seven-earthquake-edition.md`. A bouncing "6 7" opener merges into a magnitude 6.7, then a clearly marked switch to the real 1994 Northridge earthquake: a hidden fault, and the Santa Susana Mountains rising by as much as 70 cm (USGS). The meme section carries a "not a real earthquake" label and the diagram is labelled schematic. Original synthesized effects and YouTube Audio Library music; no meme audio. The topic was chosen to differ from the scheduled "Magnitude 6 vs 7" (scale and shallow-versus-deep damage).

**Cost [repo]:** v1 had no voice and cost nothing. For v2, Daniel narration used 249 ElevenLabs credits (characters billed per the ledger, 7 requests, no retries) against 270 authorized.

**Editorial assessment [editorial, subjective; not audience data]:** the v1 hook and visual concept were liked, but the middle relied too heavily on reading text and lost some of the opening's energy; v2 added narration, a simpler uplift diagram and a comic pause before "Seventy!", and was approved for publication. This says nothing about audience response.

**Publication preparation [repo]:** manifest `video/publish/six-seven-earthquake.json`, which was unapproved during preparation (PR #41), with approval, a slot and the upload as separate human steps; it has since been approved, uploaded privately and scheduled (see Publication below). Approved render `video/out/edu/final/six-seven-v2.mp4`: 17.941 s, 1080x1920, 3,007,214 bytes, SHA-256 `765f8d17c7a183670da33f5d87dbbd009eec86b472999d0d11dc5e72518c29b3` (git-ignored, not re-rendered). The publisher's read-only preview passed (no duplicate title); blockers were the missing approval and slot. The queue had no free regular slot this week.

**Publication [repo]:** the render checksum was re-verified before upload; the publisher uploaded it privately, added it to Earthquake Science Explained and scheduled it with the `scheduleException` (24 h lead kept). `inspect` confirmed title, description with credits, tags, category, language, audience and playlist, and YouTube finished processing (18 s).

**Follow-up:** after publication, record Analytics against the other short-form experiments, separately from this entry's hypothesis.

## 2026-10-22 — Breaking news: time-to-publish vs. safety (Tibet M7.0)

**Status:** Both Shorts published. No audience data yet.

**Hypothesis:** Our existing pipelines can carry a breaking story from USGS-only facts to confirmed impacts quickly, without new tooling.

**Implementation / evidence [repo]:** The initial USGS-only Short for `us6000u43g` ([youtu.be/4ZrrJfRGJRQ](https://youtu.be/4ZrrJfRGJRQ)) was produced by `quake_video` and published with `publish-now` (record merged in PR [#44](https://github.com/steffencrespo/next-huge-quake/pull/44)). Chinese authorities later reported at least 16 deaths, 32 injuries (11 serious) and at least 339 collapsed homes [reported: AP via NBC, 4:58 PM EDT; AFP via CBS, citing Xinhua]. The confirmed-impact follow-up ([youtu.be/d2v2iFsGi7w](https://youtu.be/d2v2iFsGi7w), record in PR [#47](https://github.com/steffencrespo/next-huge-quake/pull/47)) was produced with the existing news package tools (`build-from-package`, `generate-narration`, `render-package`): one ElevenLabs request of 384 characters (about $0.03 at the published $0.08 per 1,000 characters), no paid Anthropic calls, a 27.5 s fast-beats render reusing the cached Tibet terrain.

**Observation:** Timestamps [repo; the AP time is reported]:

| Interval | Duration |
|---|---|
| USGS origin (14:33 UTC) to the first Short going public (16:59 UTC) | about 2 h 26 min |
| AP report (about 20:58 UTC) to the follow-up going public (about 22:25 UTC) | about 1 h 27 min |
| Follow-up production, from narration to verified public | under 15 min |

These were reconstructed afterwards from manifests, state records and article times, not measured by the pipeline. Most of the elapsed time went to investigating technical alternatives (including the Fast Track design and implementation in PR [#45](https://github.com/steffencrespo/next-huge-quake/pull/45)), coordinating PRs and obtaining execution approvals, not to production [editorial].

**Decision / learning:** Editorial and execution latency, not production, was the bottleneck. Urgent coverage should use a proven production path rather than wait for new features.

**Follow-up:** Start measuring detection-to-publication and confirmed-impact-to-publication latency for every breaking-news event (the unmerged PR #45 would record them for fast-track runs; confirmed-impact latency is not captured anywhere yet).

## 2026-10-22 — Verified impact updates and pipeline safeguards

**Status:** Observation; no change to the safeguards.

**Hypothesis:** A follow-up with confirmed casualties can be produced without weakening the safeguards that keep the automated path USGS-only.

**Implementation / evidence [repo]:** The automated validation (`quake-news-agent/src/workflows/quake_news/validation.ts`) rejects casualty or damage claims unless they describe the PAGER model estimate. The on-screen copy guard (`video/src/copy/guard.ts`) bans casualty wording on the standard USGS facts cards. Deduplication (`session produce`, `discover --check`, and the fast-track gate's `already_published` in PR #45) prevents re-producing an already published event. The follow-up went through the package CLIs directly, which apply the copy guard to on-screen text but do not check narration, and none of these safeguards was changed: the verified casualty figures appear in the narration, captions, title and description, attributed to Chinese authorities as cited by AP and AFP, but not as on-screen cards.

**Observation [editorial]:** The original and follow-up openings look similar because they reuse the same opener and map. PAGER (a modeled estimate) and the reported impacts (actual counts from authorities) are separate kinds of information and were presented separately in the description.

**Decision / learning:** Keep modeled USGS PAGER risk clearly distinct from actual impacts corroborated by authoritative reporting.

**Follow-up:** Investigate a human-approved, source-verified impact-update workflow with attribution and follow-up-aware deduplication (an impact update for an already published event is not a duplicate). Not to be implemented now.

## 2026-10-22 — Published news metadata corrections

**Status:** Correction applied and verified on YouTube; record in PR [#46](https://github.com/steffencrespo/next-huge-quake/pull/46).

**Hypothesis:** A published breaking-news Short's description can be kept accurate after publication without touching the video.

**Implementation / evidence [repo]:** The original Tibet Short's description was accurate when published: no casualties or damage had been confirmed. Once casualties were confirmed, that statement was outdated. The description was updated with the publisher's `update-metadata` (description only, dry run reviewed first): a dated, attributed update was added at the top, and the earlier sentence now states that it described the situation at publication. A YouTube read-back with `inspect` confirmed the description, and the title, tags, category, language, audience, playlist, credits, privacy and video content were preserved. PR #46 records the description update and PR #47 the follow-up publication. Both change `video/publish/state.json` in adjacent lines, so the second to merge may need a small reconciliation.

**Observation:** The correction was applied about 1 h 13 min after the AP report (about 22:11 UTC) [repo; the AP time is reported].

**Decision / learning:** Breaking-news publishing includes keeping published metadata accurate after publication, not only producing the initial video.

**Follow-up:** Measure the time between significant factual updates and the corresponding metadata corrections.

## 2026-10-23 — MapLibre educational Short: render time and an unrecorded narration failure ("Where Will the Next Big One Hit?")

**Status:** The Short is uploaded privately and unscheduled (see `video/publish/where-next-big-one.json`); the findings below are recorded here, and no optimization has been implemented.

**Hypothesis:** The approved MapLibre globe look can be used for an educational Short through the existing `edu-batch` workflow (`--series=nbo`) without changing the pipeline.

**Observed measurements [repo/logs]:**
- The final render of 1,440 frames (48 s, `edu-batch.ts final`, which does not pass `--gl`) took about 35 minutes (props written 21:49, MP4 written 22:24 local time). Chrome's GPU process was observed at about 700% CPU for the whole render.
- The comparable accelerated prototype (the 62 s, 1,860-frame silent version, rendered with `--gl=angle --concurrency=4`) took 3 min 45 s; the 12 s V2 clip (360 frames) took 1 min 45 s.
- Per frame that is about 1.5 s (35 min / 1,440) against about 0.12 s (3 min 45 s / 1,860), roughly 12 times slower. This is not a controlled A/B: the runs differ in frame count, audio, captions and background load.
- One narration line (127 characters, the Bay Area statistic) came back as 9.87 s of audio, over the 9 s `MAX_CLIP_SECONDS` limit. `generateSpeech` threw after the paid request, before the clip was saved to the library or written to the credit ledger. The ledger holds 724 credits for 12 clips; the discarded request adds about 127 (the characters sent), so about 851 credits were consumed in total. The ElevenLabs dashboard is the authority on the exact figure.
- Replacing the line with two shorter ones (60 and 92 characters, 4.3 s and 6.5 s) succeeded.

**Hypotheses (not verified):**
- The 35-minute render is slow because without `--gl=angle` Chrome falls back to a software WebGL path (the `edu-batch.ts` render does not set it; the other MapLibre render scripts, `render-news.ts` and `render-terrain-spike.ts`, do). The high GPU-process CPU is consistent with that but does not prove it.
- Speech duration is predictable enough from character count to catch most overruns: the 12 recorded clips ran at about 12.1 to 15.8 characters per second (observed from the ledger and clip durations), and the discarded clip, at about 12.9 characters per second for 127 characters, was simply the longest line. A cap near 100 to 110 characters per clip would have flagged it.

**Decision / learning:** Treat the render time and the unrecorded spend as pipeline findings, not one-off bad luck.

**Follow-up (proposals, not implemented):**
1. Investigate passing `--gl=angle` through `edu-batch.ts` `render()` (a flag or a default for MapLibre compositions), then re-measure the same composition for a controlled comparison.
2. Add a lightweight duration preflight to `edu-batch.ts plan` and `generate`: estimate each new line from its characters at a conservative rate and warn or stop before any request when it may exceed the limit (the plan already prints characters and credits).
3. Track failed paid generations: write the ledger entry before or regardless of validation, and keep rejected audio in a `rejected/` folder so a clip that is paid for but over the limit can be inspected or reused instead of lost.

---

## 2026-10-22 — First cross-platform distribution: California Myth vs Fact on Instagram Reels

**Status:** Editorially approved; publication on Instagram pending (owner publishes manually). Account: [@nexthugequake](https://www.instagram.com/nexthugequake/). Instagram URL: _to be added_.

**Hypothesis (untested):** an approved educational Short can reach an additional audience when re-cut as an Instagram Reel, with only the changes cross-platform publishing requires.

**Implementation / evidence [repo]:** the published YouTube Short ([youtu.be/8Zke9Kf1128](https://youtu.be/8Zke9Kf1128)) re-rendered from its cached narration, with the YouTube like/subscribe closing removed and no music, because no available track is documented as cleared for Instagram (YouTube Audio Library terms are per track and the repo holds no receipts). Narration and the 8 claim-carrying clips are identical to the original; +3 dB audio gain; 38.0 s vs 43.0 s. Workflow: `video/experiments/instagram/`; notes: `docs/experiments/instagram-california-reel.md`. The YouTube video and its publication state are unchanged.

**Observation [editorial]:** the music-free version was reviewed and approved by the owner. The owner confirmed the ElevenLabs narration was generated under a paid subscription. No audience data yet.

**Decision:** narration plus original synthesized sound effects, AI-narration disclosure in the caption plus Instagram's AI label; no API publishing.

**Follow-up:** add the Instagram URL, then compare views, completion and replays against the YouTube version as directional data only (different platforms and audiences).

---

## Open questions and measurements

- What measurable effect, if any, does `fast-beats` have on viewer retention versus natural pacing?
- Can a cold open and seamless loop increase replays or completion without frustrating viewers?
- Which YouTube Studio search phrases show meaningful demand and unmet Shorts coverage?
- Which topics justify urgent publication versus scheduled evergreen release?
- Can the production process remain fast without drifting into repeated, low-value content?
- When, if ever, do enough recurring tasks justify new Output.ai editorial workflows?
- How can we minimize breaking-news time-to-publish while preserving factual accuracy, source attribution, budget limits, and bounded human editorial control?

## Maintaining the journal

After each meaningful experiment, add a brief entry with date, hypothesis, evidence (PRs, video URLs, measurements, screenshots), observation, decision and next step. Keep subjective editorial judgments separate from measured audience response. Never invent analytics or retroactively mark a hypothesis proven. Store this file in Git alongside the project's roadmap and decision log. Routine commits and ordinary PRs do not need an entry; a decision goes in `docs/DECISION_LOG.md`, and an experiment's outcome goes here.
