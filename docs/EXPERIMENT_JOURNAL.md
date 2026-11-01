# Next Huge Quake — Engineering & Experimentation Journal

*Started: 2026-10-21. Historical entries reconstructed from project conversations and GitHub milestones, then checked against the repository, PRs and implementation on 2026-10-21 (repository state: `origin/master` at `ea680e7`, PR #36). Updated 2026-10-28 against `origin/master` at `77f1b85` (PR #62), and 2026-10-29 after PR #68. This is an evidence-oriented log, not a claim of measured audience impact.*

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

**Status:** *Updated 2026-10-28.* Scheduled for Tue 2026-11-03 18:00 São Paulo (PRs [#54](https://github.com/steffencrespo/next-huge-quake/pull/54), [#55](https://github.com/steffencrespo/next-huge-quake/pull/55); `video/publish/state.json` records it as `scheduled`; not re-verified on YouTube). When first written this entry read: uploaded privately and unscheduled, no optimization implemented. Two of the three follow-ups have since been merged (see the update at the end of this entry).

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

**Update 2026-10-28 [repo]:**
- Follow-up 1 is merged for this one composition: PR [#56](https://github.com/steffencrespo/next-huge-quake/pull/56) passes `--gl=angle` only for `WhereWillTheNextBigOneHitFull`. Its controlled check, the same 60 frames (300–359), silent, was 18.4 s with the flag against 36.3 s without, about 2×. That is a smaller effect than the uncontrolled ~12× above, so the 35-minute render probably also reflects frame count, audio, captions and background load. The software-WebGL hypothesis is supported in direction, not proven in size. A full 1,440-frame re-render with the flag has not been recorded; the scheduled upload was rendered before #56.
- Follow-ups 2 and 3 are merged in PR [#57](https://github.com/steffencrespo/next-huge-quake/pull/57) (`93a92ec`): a preflight at 12 characters per second (about the 5th percentile of the 131 library clips at the time; it flags lines above roughly 108 characters, so it is conservative) and a `status: 'rejected'` ledger entry when audio comes back over the limit. Rejected audio is not kept (nothing is saved to the library), so the `rejected/` part of follow-up 3 is not implemented. HTTP failures and alignment mismatches are still not ledgered.
- The 127-character discarded request above was never added retroactively: `credit-ledger-nbo.json` still sums to 724.
- Other MapLibre render scripts set `--gl=angle` themselves (`render-news.ts` and the Vanuatu M6.0, weekly and October globe experiments). Render time still differs a lot by composition (a 1,050-frame news render with terrain took about 6.5 min, a 1,020-frame Vanuatu sequence render about 1 min 45 s), with no controlled comparison between them.

## 2026-10-22 to 2026-10-28 — ElevenLabs narration reliability: lost library, recovery, backup, rejected spend

**Status:** Library recovered and in use; rejected-spend accounting merged (PR #57, see the update in the 2026-10-23 entry above); backup and alignment gaps open.

**Hypothesis:** Paid, git-ignored narration is a single point of failure, and spend that fails validation is invisible to budget checks. Both are cheap to protect against.

**Implementation / evidence [repo]:** The library was lost when a tracked `video/assets` symlink replaced the real git-ignored folder on pull (PR [#49](https://github.com/steffencrespo/next-huge-quake/pull/49)). In the local library manifest, 119 of the 205 clips (7,056 characters) are tagged `recovered:<ElevenLabs history id> (alignment rebuilt locally)` and indexed with hashes in `recovered-index.json`; the other 86 were generated afterwards. A checksummed copy made at 2026-10-22 23:58, after the recovery, sits outside the repository at `~/Backups/next-huge-quake/assets-audio-20261022-235850/` (local files, not in Git).

**Observation (engineering):** The 86 clips generated since that copy have no external backup. Rebuilt alignments, which drive captions, were never compared with ElevenLabs' own alignment. None of the ten credit ledgers holds a `rejected` entry yet, so that path is covered by mocked tests but has not fired in production; the first run behind the preflight (Vanuatu M6.0, 10 lines, 558 characters) passed. Whether the recovery cost credits is not recorded in any ledger.

**Decision / learning:** Git-ignored does not mean safe, and paid spend should be recorded before its result is validated.

**Follow-up:** Refresh the backup; compare a rebuilt alignment with a native one on a clip that has both; read total credits since 2026-10-22 from the ElevenLabs dashboard, which is the authority.

## 2026-10-24 — Earthquakes This Week (M4.0+ weekly globe)

**Status:** Two local renders (V1, V2). Continuation approved editorially; no recurring workflow, manifest or publication record exists in the repository.

**Hypothesis:** A fixed-window, data-driven count of every M4.0+ earthquake, shown as red dots on a globe, can be a repeatable weekly format at low cost.

**Implementation / evidence [repo]:** `video/experiments/quakes-week/` (local, untracked, in no PR); USGS catalog, 2026-10-17 to 10-24 UTC. Counts and the region ranking are computed from the cached data, never typed. V1 has 182 events, V2 has 190; each render is about 63 to 64 s. Narration used 668 credits for V1 and 376 for V2's changed lines, with no rejected entries.

**Observation (engineering):** V1's query was capped at M5.5 while its on-screen subtitle said "MAGNITUDE 4.0+", so it silently dropped eight events (M5.7 to M7.0, including Tibet M7.0 and five Vanuatu events). V2 removed the cap, reconciles against the API count and requires every V1 event to be present. Lesson: derive on-screen labels from the query that produced the data.

**Decision [editorial; from project conversation, not repo-verified]:** The owner approved continuing the M4.0+ weekly format on 2026-10-24. The recurring workflow (tracked code, a schedule, a refresh rule for the cached data, a publication path) is not implemented.

**Follow-up:** Decide where weekly code lives and how data is refreshed (the fetch script reuses its cached file unless `--refresh`). Once Analytics is available, compare stayed-to-watch with videos of similar length, directionally.

## 2026-10-26 — Earthquakes in October 2026 (live-loop visualization)

**Status:** Local render, not published; its credits file says manual upload only.

**Hypothesis (untested):** A day-by-day replay of the month's M5+ earthquakes can work as a watchable, loopable data visualization.

**Implementation / evidence [repo]:** `video/experiments/quakes-october-live/` (local, untracked). USGS, 2026-10-01 to 10-25 UTC: 121 events above M5.0. The API returned 168 at M≥5.0; the 47 at exactly 5.0 are excluded because the script says "above magnitude five". Render 115 s; 973 narration credits.

**Observation:** No review notes and no audience data. The wording-driven filter changes the count by about 28%, so spoken text and query must stay consistent (the same class of problem as the weekly V1 label).

**Follow-up:** Editorial review, then decide whether 115 s suits a channel whose traffic is 90.9% Shorts feed [metric: 2026-10-22 baseline, `docs/YOUTUBE_ANALYTICS.md`].

## 2026-11-01 — Earthquakes in October 2026: FINAL landscape live loop

**Status:** Final render approved by the owner on 2026-11-01; not published (manual upload only). Experiment source, data snapshot, clip manifest and records are tracked in `video/experiments/quakes-october-live/` (`RECORD-final.md`, `CREDITS-final.txt`); the MP4 (`out/earthquakes-october-2026-live-final.mp4`) and the narration audio stay local and git-ignored.

**Implementation / evidence [repo]:** The vertical Oct 1–25 version was turned into a 1920×1080 loop (`QuakesOctoberFinal.tsx`, `script-final.ts`, `fetch-final.ts`, `audio-final.ts`, `render-final.ts`, `qa/`). USGS full month, 2026-10-01T00:00Z to 2026-11-01T00:00Z, M≥5.0, retrieved 2026-11-01 00:03 UTC: 216 events (195 M5, 19 M6, 2 M7), largest M7.7 near Pitaloza Arriba, Panama (Oct 9). No local magnitude filter: every label says "5.0 or greater". 118 s, 61.1 MB; 734 new narration credits (5 clips reused). `src/map/LiveMap.tsx` gained optional width/height props (default 1080×1920, so vertical compositions are unchanged).

**Observation (engineering):** The bundled ffmpeg lacks `volumedetect` and the `null` encoder but has the `pcm_s16le` encoder, the `wav` muxer and the `loudnorm` filter. Decoding to WAV and measuring in Node, plus `loudnorm` JSON, gives levels; AVFoundation through a Swift script gives frame decoding and black/frozen/seam checks on this Intel Mac. For a loop, cross-fading the music from offset = video length into offset 0 removes the silent dip at the seam. A tie for third strongest (two M6.9) was caught by a guard; both are shown.

**Follow-up:** Editorial review before any upload. The `yuvj420p` (full-range) tag on Remotion's output is worth checking if colour shifts appear on YouTube.

## 2026-10-28 — Monthly compilation (proposed concept, not implemented)

**Status:** Concept only. No code, script, manifest or render exists in the repository [repo: none found on `origin/master` at `77f1b85`]. The idea comes from project conversation [reported].

**Hypothesis (untested):** A longer monthly video combining previously published Shorts, possibly enriched with authentic event imagery, could give older Shorts a second life and give returning viewers a reason to stay. It is a different concept from the October live-loop above, which is built from raw USGS events.

**Open questions:** Which published Shorts qualify; where authentic imagery would come from (external assets need recorded provenance and licensing per `docs/DECISION_LOG.md`); how to avoid near-duplicate content; and how to measure it, since a long video is a different surface from Shorts-feed stayed-to-watch.

## 2026-10-24 and 2026-10-28 — Breaking news: Vanuatu M6.9 and the M6.0 sequence

**Status:** Both Shorts are recorded as published in `video/publish/state.json` (PRs [#58](https://github.com/steffencrespo/next-huge-quake/pull/58) and [#62](https://github.com/steffencrespo/next-huge-quake/pull/62)); public visibility not re-checked from YouTube. No audience data.

**Hypothesis:** (1) The proven manual news path can cover a sequence quickly while saying only what is known. (2) For a repeat event, a short "why does it keep happening" explainer adds more than another alert. The second is untested.

**Implementation / evidence [repo]:** M6.9 `us6000u4j2` (origin 2026-10-24 02:31 UTC): [youtu.be/h0GyKt2AaHA](https://youtu.be/h0GyKt2AaHA), approved at 04:36 UTC, about 2 h 05 min after origin (Tibet: about 2 h 26 min), reconstructed from manifest and state, not measured by the pipeline. Fast Track was not involved. Its narration cost is not recorded anywhere in the repo. M6.0 `us7000ttlm` (origin 2026-10-28 02:21 UTC): [youtu.be/5P7KuR1AZF4](https://youtu.be/5P7KuR1AZF4), published 23:13 UTC, about 21 h later, a deliberate sequence explainer and not a speed test. Experiment files and sourcing notes: `video/experiments/vanuatu-m60-us7000ttlm/`. Both descriptions keep modeled PAGER and the tsunami flag distinct from confirmed impact.

**Observation (engineering):** Verification removed two tempting lines from the M6.0 script: "no M6+ in this patch for four decades" (a USGS M6.8 on 2009-10-08 lies within 100 km, and the answer depends on the search radius) and an annual rate (6.4 a year in one box, 6.2 to 7.2 in neighbouring boxes). The script calls the events a "sequence" only, because USGS lists no aftershock product, and gives no depth or convergence rate. The volcanic-arc line rests on a USGS tectonic summary; the Smithsonian page was unreachable from the build machine on 2026-10-28 and its re-check is not recorded. The approved title is the owner's choice [editorial].

**Decision / learning:** For a sequence, discipline means saying less; two of the strongest-sounding lines failed verification.

**Follow-up:** Compare stayed-to-watch for the M6.9 alert and the M6.0 explainer once Analytics exists. Keep recording origin-to-public latency for every breaking item. The experiment's `CREDITS.md` still says "Not published", which is now outdated.

## 2026-10-27 to 2026-10-28 — AI cinematic visuals and synthetic-media disclosure

**Status:** In use. Chile 1960 cinematic is recorded as published 2026-10-27; Japan 2011, Northridge 1994 and Loma Prieta 1989 cinematic are scheduled for 11-01, 11-05 and 11-07; the Vanuatu M6.0 Short uses one generated image. The disclosure convention is recorded in `docs/DECISION_LOG.md` (row dated 2026-10-28, PR [#62](https://github.com/steffencrespo/next-huge-quake/pull/62)) and is not repeated here.

**Hypothesis (untested):** Generated establishing images add a cinematic feel to historic and news Shorts without misleading viewers, if they are disclosed in metadata, description and credits, with at most a discreet on-screen mark.

**Implementation / evidence [repo]:** Images and clips come from ElevenLabs-hosted generators and Seedance (see each experiment's `CREDITS.md`). `containsSyntheticMedia: true` is set in all five manifests; PR [#59](https://github.com/steffencrespo/next-huge-quake/pull/59) added it to the publisher. On-screen treatment differs: Chile carries a large "AI-GENERATED HISTORICAL RECONSTRUCTION" label; Northridge and Loma Prieta have none by design; Vanuatu M6.0 shows "AI VISUALIZATION" at 20 px and 50% opacity while the image is visible.

**Observation:** The convention arrived after Chile was public, so three treatments exist within two days. The stated reason for dropping the large label (it distracted and looked less polished) is [editorial; reported], not recorded in DECISION_LOG. Nothing has been measured about viewer comprehension or retention.

**Follow-up:** Read back the synthetic-content setting from YouTube for each video (manifests say true; no read-back yet). `chile1960-r2` still shows as scheduled for 2026-10-27 21:00 UTC in `state.json` although the cinematic Chile was approved and published minutes later (Japan: r2 on 10-29, cinematic on 11-01); whether r2 was withdrawn is not recorded and bears on the duplicate-content principle. Compare retention of cinematic and earlier historic Shorts directionally.

## 2026-10-28 — Fast Track pilot: bounded spending and safeguards, still unproven

**Status:** PR [#45](https://github.com/steffencrespo/next-huge-quake/pull/45) is open and unmerged, last pushed 2026-10-22; disabled by default. "Paused" is the owner's status [reported]; the repository shows only inactivity. No run is recorded (no `state/fast-track.json` in any local checkout).

**Hypothesis:** Policy-governed automation can shorten detection-to-public time for qualifying events without removing the human-authority gates, and cost can be capped by reserving worst-case spend before any paid call.

**Implementation / evidence [repo]:** Per the PR: ships disabled and private; eligibility tiers with fail-closed manual fallbacks (sequences, stale or revised facts, missing PAGER, daily cap); deterministic text through the M1 fact check; approval authority bound to the manifest hash; per-event, daily and monthly spend reserved before paid calls, with missing prices disabling it; kill switches re-read before approve, upload and publish; strict inspection and reconcile for retries. Tests: 172 (`quake-news-agent`) and 272 (`video`), including crash recovery against an in-memory YouTube. A read-only gate check on real USGS data sent Tibet and Vanuatu M6.3 to manual.

**Observation:** Unproven: any end-to-end or paid run, a real YouTube write, actual latency, spend bound against actual cost (prices not configured), and exactly-once delivery (the PR says it is not guaranteed). The manual path covered Vanuatu M6.9 in about 2 h 05 min, so a latency benefit is still a hypothesis.

**Decision:** Pending. The PR's own next step is one separately authorized private test.

**Follow-up:** A free read-only replay of the gate on `us6000u4j2` and `us7000ttlm`, recording the verdicts; if resumed, one private test measured against manual latency.

## 2026-10-28 — Smaller updates

- **Instagram Reels:** PR [#43](https://github.com/steffencrespo/next-huge-quake/pull/43) (open) carries its own California Reel entry; PR [#53](https://github.com/steffencrespo/next-huge-quake/pull/53) (draft, paused) has never run against Meta. Reels are posted by hand, music-free because no track is documented as cleared for Instagram. The first Reel (Magnitude 6 vs 7) was posted 2026-10-23 [reported]; no URL or metrics are in the repository.
- **Chile 1960 cinematic pacing:** fast-beats (45.3 s) and natural-pace (68.5 s) renders both exist; the published file is the fast-beats one (its size matches the manifest). The reason is not recorded and there is no retention data.
- **Analytics baseline:** `docs/YOUTUBE_ANALYTICS.md` (PR [#52](https://github.com/steffencrespo/next-huge-quake/pull/52)) holds the 2026-10-22 baseline. The 2026-10-29 checkpoint has not been captured. Videos recorded as published or scheduled since then include California loop (10-23), Vanuatu M6.9 (10-24), SIX SEVEN (10-25), Magnitude 10 (10-26), Chile cinematic (10-27), SIX SEVEN vs FOUR TWO and Vanuatu M6.0 (10-28); note which had changed openings.
- **Northridge research:** USGS pages disagree on deaths (33 to nearly 100), so the script says "dozens"; figures come from USGS sources and the stills are AI illustrations (see `CREDITS.md`). Loma Prieta handles a similar disagreement ("more than forty" for the Cypress viaduct). Scheduled for 11-05 and 11-07; no data.

## 2026-10-29 — Autonomous breaking news: Vanuatu M6.2 (deep), publish first, review after

**Status:** Succeeded and published; the owner reviewed it after publication and called it a success [reported]. [youtu.be/Orhq2djDOcM](https://youtu.be/Orhq2djDOcM), public and processed, 26 s, in Latest Earthquakes. Records in PR [#68](https://github.com/steffencrespo/next-huge-quake/pull/68). This led to the "publish first, review after" decision in `docs/DECISION_LOG.md` (2026-10-29). No audience data.

**Hypothesis:** The existing path (`discover --check`, `session produce`, publisher `approve` / `upload` / `publish-now`) can run end to end with no human checkpoint between production and publication. That requires the owner to authorize one specific event up front and the agent to run the fact, duplicate and quality gates instead of a reviewer.

**Scope of the authorization [reported]:** one event (`us7000tu4f`) and one Short. It allowed paid Anthropic and ElevenLabs calls up to an estimated US$1, public publication and a records PR. It ruled out monitoring, pipeline changes and any other video. This was a single authorized run, not a deployed unattended system: discovery was started by the owner's request, and the monitor stayed off.

**Implementation / evidence [repo]:**
- *Event:* USGS `us7000tu4f`, M6.2 Mww (reviewed), 142.8 km deep, 43 km ESE of Port-Olry, origin 2026-10-29 21:46:44 UTC. Green PAGER, ShakeMap maximum intensity IV, no tsunami flag, 2 DYFI reports. USGS data was fetched again just before approval and had not changed. A news search found no damage or casualty reports.
- *Duplicates:* `discover --check` found nothing under the ID or its alias `usauto7000tu4f`. There was no manifest, state or package record either. The event lies about 200 km from the shallow north-west sequence; the video and description make no claim about a link.
- *Production:* one `quake_video` run with one attempt and no retry. Stage times: `quake_news` 29.1 s, spec 1.0 s, narration 4.6 s, terrain 7.6 s (42 tiles fetched), render 212.2 s; 255 s in total. The render took 205.9 s of wall time for 766 frames, with peak memory of about 4.1 GB. Narration was paced with fast-beats from 27.9 s to 20.2 s; the MP4 is 25.5 s, 1080×1920 at 30 fps, 10.4 MB.
- *Timeline (UTC):* origin 21:46:44, workflow started 22:56:53, approval recorded 23:20:59, public 23:21:25. That is about 1 h 35 min from origin to public, and about 24.5 min from workflow start to public. The QA, the manifest and the speech-recognition detour below took most of those 24.5 minutes. Earlier manually approved breaking items: Tibet about 2 h 26 min, Vanuatu M6.9 about 2 h 05 min. Those were reconstructed differently, so the comparison is only directional.
- *Automated QA:*
  - frame analysis: no black frames and no hard cuts; the only static run is the closing card;
  - visual checks of representative frames: map position, magnitude, depth and the PAGER "not confirmed damage" wording;
  - voice about 10.9 dB above the music;
  - speech recognition on both the narration and the final mix: no pauses over 0.5 s, every number and "km" spoken correctly.
- *Metadata:* the manifest sets `containsSyntheticMedia: false` because there is no generated imagery, and the description discloses the AI narration voice.
- *Publisher:* the normal `approve` → private `upload` + playlist → `publish-now` sequence ran, with the content hash intact. The approval record was written by the agent under the owner's prior authorization; no approval was fabricated.

**Observation (engineering):**
- *Speech-recognition recovery:* the planned pronunciation check failed three times before it worked. Each failure was found and worked around without spending money or blocking the run:
  1. ElevenLabs speech-to-text returned "missing permission speech_to_text" for the project key (no charge);
  2. `pip install faster-whisper` failed because PyAV has no wheel for Python 3.14 on this Intel Mac;
  3. `brew install whisper-cpp` began compiling cmake from source and was abandoned after about 10 minutes.

  Vosk (pip wheel plus the `vosk-model-en-us-0.22-lgraph` model, in a scratch virtualenv) worked. Its limits: "Port-Olry" is not in its vocabulary, and "Vanuatu" was recognized only with a constrained grammar (confidence 0.89–1.0). Proper nouns were therefore only partly verified by machine.
- *Cost reporting:* the host worker keeps no local trace, and `output workflow cost` / `debug` could not find the run, so the Anthropic cost was not measured. The estimate is about US$0.02–0.03: two claude-sonnet-4-6 calls, a draft and a review, inferred from the worker's activity log. ElevenLabs was one request of 334 characters, about 334 credits at the configured model. The US$1 cap was respected by estimate, not by metering.
- *Synthetic-media verification:* `inspect` matched title, description, tags, category, language, audience, playlist, privacy and duration. `containsSyntheticMedia` reads back as undefined, so the value actually sent (false) cannot be confirmed through the API; only YouTube Studio shows it. This is the same gap as earlier Shorts that set it to true.

**Decision / learning:** For an explicitly authorized event, the gate between production and publication can be automated without losing the hard checks. The weak points are measurement: cost, pronunciation and the synthetic-media flag were each verified only partly. The resulting operating preference is recorded in `docs/DECISION_LOG.md`. It is not a deployed unattended system: the monitor stays a dry run, and nothing auto-publishes without a per-event (or later, a per-workflow) authorization.

**Follow-up improvements (not started):**
1. *Reliable local speech recognition:* a reproducible, pinned offline STT check in `video/` that runs on this machine without a source build. It should include a proper-noun check against the script, for example grammar-constrained matching of place names.
2. *Per-run Anthropic cost tracking:* record token usage and cost per LLM call in the `quake_video` result or a ledger, so the spending cap is metered, not estimated.
3. *Synthetic-media verification:* confirm the flag after upload, either through a supported API field or a recorded Studio check, and back-fill the check for the Shorts already published with `containsSyntheticMedia` set.

---

## 2026-10-31 — Breaking news: Japan M6.0 at 352 km, depth-led narration

**Status:** Published. [youtu.be/P1tpybP4CmU](https://youtu.be/P1tpybP4CmU), public and processed (28 s), in Latest Earthquakes. No audience data.

**Hypothesis:** For a low-impact event, an explanatory angle (here, why a 352 km deep M6.0 differs from a shallow one) makes a stronger Short than the standard facts readout. It can be added fast through the existing package revision path without weakening the fact check.

**Scope of the authorization [reported]:** one event (`us7000tuku`) and one Short. It allowed services, paid Anthropic and ElevenLabs calls, public publication with no checkpoint before it, records, a PR and a merge if checks passed. No AI images. The owner set the title and the opening hook.

**Implementation / evidence [repo]:**
- *Event:* USGS `us7000tuku`, M6.0 Mww (reviewed), 352.449 km deep, 58 km SSE of Shima, origin 2026-10-31 22:15:02 UTC (07:15 JST, November 1). Since the read-only assessment, PAGER went from null to green (automatic) and significance from 554 to 557. ShakeMap v1 maximum intensity was about III, ground failure green, no tsunami flag, 11 DYFI reports by the 22:55 UTC update. Data was fetched again before production and before the manifest, with no material change. A news search found no damage or casualty reports.
- *Duplicates:* the first `discover --check` refused because Temporal was down (fail-safe). After `session start` it passed for `us7000tuku` and `usauto7000tuku`. There was no package, manifest, state or monitor record, and the publisher's preview found no title match.
- *Production:* one `quake_video` run with no retry (`quake_news` 54.7 s, spec 1.3 s, narration 4.4 s, terrain 7.1 s with 46 tiles to fetch, render 264.3 s; 332 s in total). Its narration was a generic facts readout, so a revised package (`out/packages/us7000tuku-depth/`) replaced only the narration. It went through `build-from-package`, `generate-narration` and `render-package` into separate `-depth` output folders, leaving the original run intact. The revision was checked with the M1 `checkDraft` (compiled `dist/`) against the live USGS facts before any paid request. Each draft was corrected without spending: "most damaging earthquakes" was flagged as an unsupported impact claim, and "eleven people sent" was dropped because it counts people. Depth is spoken as "352 kilometers" (±1 km rule). The first passing draft (457 characters) was trimmed to 375 before the request: at the 12.9 characters per second measured on the first run's audio, it would have exceeded the 30.8 s audio limit.
- *Narration:* Daniel (`3WqHLnw80rOZqJzW9YRB`, `eleven_multilingual_v2`), one request of 375 characters, 30.72 s raw, just under the 30.8 s limit. Fast-beats paced it to 22.5 s; the MP4 is 27.8 s, 1080×1920 at 30 fps, 834 frames, 16.1 MB (SHA-256 `9fb0e769…fe65b0`). Music: "Deified" (YouTube Audio Library).
- *Timeline (UTC):* origin 22:15:02; workflow started about 23:03; public 23:19:35. That is about 1 h 04 min from origin to public, the fastest breaking item so far (Vanuatu M6.2 took about 1 h 35 min), including the narration revision and a second render of about 6 min.
- *QA:*
  - stills at nine timestamps: hook card, epicenter offshore SSE of Shima, depth card (352.4 km, USGS deep range 300–700 km), felt-reports card ("not of individual people"), and the end card with sources;
  - paced captions follow the script, with no gap over 0.5 s;
  - **not done:** a speech-recognition pronunciation check (no Vosk environment on this machine) and a measured voice-to-music level. The bundled ffmpeg has no PCM or `volumedetect` encoder, and no system ffmpeg is installed. The mix uses the same pipeline as earlier news Shorts.
- *Publisher:* `approve` (hash `50d8fe96…`, written by the agent under the owner's authorization) → private `upload` + playlist → `publish-now`. `inspect` matched everything except `containsSyntheticMedia` (false, not readable through the API; same gap as before). Anonymous oEmbed returned 200.
- *Cost:* ElevenLabs 375 (revision) + about 330 (`quake_video`'s own narration, unused) ≈ 705 credits, about US$0.06. Anthropic was not metered; estimated at about US$0.03 for two calls.

**Decision / learning:** The package revision path works as a fast editorial override after `quake_video`, provided the M1 `checkDraft` runs first. The paid narration from the standard run is wasted when a revision is already likely. A narration-angle option (for example "depth") in `quake_video` would avoid the second TTS request and render. Length is now the tightest constraint: a 62-word script reached 30.72 of 30.8 s.

**Follow-up (not started):** the three follow-ups from the Vanuatu M6.2 entry still apply. In addition, give `quake_video` a way to steer the narration angle before its single TTS request.

---

## Open questions and measurements

- What measurable effect, if any, does `fast-beats` have on viewer retention versus natural pacing?
- Can a cold open and seamless loop increase replays or completion without frustrating viewers?
- Which YouTube Studio search phrases show meaningful demand and unmet Shorts coverage?
- Which topics justify urgent publication versus scheduled evergreen release?
- Can the production process remain fast without drifting into repeated, low-value content?
- When, if ever, do enough recurring tasks justify new Output.ai editorial workflows?
- How can we minimize breaking-news time-to-publish while preserving factual accuracy, source attribution, budget limits, and bounded human editorial control? The first authorized autonomous run (Vanuatu M6.2, about 1 h 35 min from origin to public) suggests the remaining latency is in detection and QA tooling, not in the approval step.
- Does a data-driven weekly format (Earthquakes This Week) retain viewers as well as a one-off explainer, and where should its recurring code and data refresh live?
- Does a short sequence explainer (Vanuatu M6.0) beat a bare alert on stayed-to-watch, and does Fast Track ever beat the manual path on latency?
- Do cinematic AI-illustrated Shorts retain better than earlier map-only historic Shorts, and does the on-screen disclosure treatment change that?
- Is the narration library safe enough (backup refresh, alignment check), and what is the monthly compilation concept worth before anyone builds it?

## Maintaining the journal

After each meaningful experiment, add a brief entry with date, hypothesis, evidence (PRs, video URLs, measurements, screenshots), observation, decision and next step. Keep subjective editorial judgments separate from measured audience response. Never invent analytics or retroactively mark a hypothesis proven. Store this file in Git alongside the project's roadmap and decision log. Routine commits and ordinary PRs do not need an entry; a decision goes in `docs/DECISION_LOG.md`, and an experiment's outcome goes here.
