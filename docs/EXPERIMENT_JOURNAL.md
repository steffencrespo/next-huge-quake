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

**Publication preparation [repo]:** manifest `video/publish/six-seven-earthquake.json` (unapproved; approval, a slot and the upload are separate human steps). Approved render `video/out/edu/final/six-seven-v2.mp4`: 17.941 s, 1080x1920, 3,007,214 bytes, SHA-256 `765f8d17c7a183670da33f5d87dbbd009eec86b472999d0d11dc5e72518c29b3` (git-ignored, not re-rendered). The publisher's read-only preview passed (no duplicate title); blockers were the missing approval and slot. The queue had no free regular slot this week.

**Publication [repo]:** the render checksum was re-verified before upload; the publisher uploaded it privately, added it to Earthquake Science Explained and scheduled it with the `scheduleException` (24 h lead kept). `inspect` confirmed title, description with credits, tags, category, language, audience and playlist, and YouTube finished processing (18 s).

**Follow-up:** after publication, record Analytics against the other short-form experiments, separately from this entry's hypothesis.

---

## Open questions and measurements

- What measurable effect, if any, does `fast-beats` have on viewer retention versus natural pacing?
- Can a cold open and seamless loop increase replays or completion without frustrating viewers?
- Which YouTube Studio search phrases show meaningful demand and unmet Shorts coverage?
- Which topics justify urgent publication versus scheduled evergreen release?
- Can the production process remain fast without drifting into repeated, low-value content?
- When, if ever, do enough recurring tasks justify new Output.ai editorial workflows?

## Maintaining the journal

After each meaningful experiment, add a brief entry with date, hypothesis, evidence (PRs, video URLs, measurements, screenshots), observation, decision and next step. Keep subjective editorial judgments separate from measured audience response. Never invent analytics or retroactively mark a hypothesis proven. Store this file in Git alongside the project's roadmap and decision log. Routine commits and ordinary PRs do not need an entry; a decision goes in `docs/DECISION_LOG.md`, and an experiment's outcome goes here.
