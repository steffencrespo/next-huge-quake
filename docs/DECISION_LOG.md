# Decision log

Product and editorial decisions. Technical architecture decisions live in [decisions/](decisions/) as ADRs and are only linked here. Status vocabulary:

- **Approved:** an explicit decision, in an ADR, a recorded review gate or a PR.
- **Operating practice:** how the project works today; the date of the decision was not recorded.
- **Proposed:** not decided or not validated. Do not treat as a commitment.

Dates are given only where the repository or PR history establishes them. "Not recorded" means no date could be established.

## Workflow and production

| Decision | Status | Date | Notes |
| --- | --- | --- | --- |
| Output.ai on Temporal stays the primary workflow orchestration infrastructure | Approved | Not recorded | Used for `quake_news`, `quake_video`, `quake_monitor`. See [ADR 0001](decisions/0001-m5-earthquake-monitoring.md) |
| Reuse existing Remotion components and rendering tools for new formats | Operating practice | Not recorded | Edu, historic, kids and Myth vs Fact all share `EduShort` and the narration library |
| Prototype a format before building an automated workflow | Operating practice | Not recorded | Myth vs Fact was deliberately built without a generic framework or workflow (PR #33) |
| Favor fast, reviewable prototypes over speculative infrastructure | Operating practice | Not recorded | Same evidence |
| Non-news formats stay outside Output.ai until proven; later integration is gradual | Proposed | n/a | See [ROADMAP.md](ROADMAP.md) |

## Accuracy and approval

| Decision | Status | Date | Notes |
| --- | --- | --- | --- |
| Deterministic fact validation is a hard gate; an LLM review can never override a failed check | Approved | In force since M1 merged, 2026-10-16 (PR #1) | Implemented for `quake_news` only. Edu, historic, kids and Myth vs Fact claims are verified by hand against sources (Myth vs Fact also has a claims spec) |
| Nothing is published without human editorial approval | Approved | 2026-10-15 | [ADR 0001](decisions/0001-m5-earthquake-monitoring.md). Enforced in the publisher by an approval content hash |
| **Human authority over consequential actions.** AI agents may autonomously research, inspect code, generate artifacts, run tests and prepare recommendations. Actions that communicate externally, disclose sensitive information, publish content, modify shared systems or act on someone's behalf require explicit human authorization within a defined scope. Authorization may be granted for a specific, bounded workflow, but is never inferred from general permission to execute tasks | Approved | Not recorded | Extends the human publishing approval rule above |
| Monitoring, not prediction: no forecast claims | Approved | Not recorded | README. Projections such as "about 15 million years" must be framed as "at this rate" |
| Hypothetical simulations must be clearly distinguished from real footage and verified data | Approved | Not recorded | Practice so far: on-screen "SCHEMATIC" and "ILLUSTRATIVE" labels. Extending this to generated visuals is covered under assets below |
| Avoid duplicate or near-identical content | Approved as a principle | Not recorded | Checked by hand against the catalog. Automated catalog-aware prevention is a roadmap item, not built |

## Publishing and cadence

| Decision | Status | Date | Notes |
| --- | --- | --- | --- |
| Regular baseline: Tuesday, Thursday and Saturday at 18:00 America/Sao_Paulo | Operating practice | Enforced in the publisher since 2026-10-19 (PR #26) | The code guard also requires a 24 h lead. Decision date not recorded |
| Significant breaking news is handled separately from the regular schedule | Operating practice | Not recorded | |
| Breaking news may be published outside the schedule after approval | Operating practice | Not recorded | `publish-now` bypasses the slot guard, always after explicit approval |
| Increase to five Shorts per week | Proposed | n/a | A future experiment only. Not approved and not scheduled |
| Optimize for retention and quality over upload volume | Approved | Not recorded | Basis for measuring before raising frequency |
| Measure YouTube performance before increasing frequency | Approved | Not recorded | No analytics tooling exists yet |
| Fast-beats is the default narration pacing for newly produced Shorts: about 1.2x speech with pitch preserved, shortened natural pauses, and the pauses a script declares on purpose kept (the Panama D4 experiment plus the California comparison preview) | Approved | 2026-10-21 | Applies to news (`render-package`, `quake_video`) and the educational, historic and Myth vs Fact tooling; `--pace=natural` restores the old behavior. News videos now end 3.77 s after the voice, and the minimum spec duration is 24 s. Published and scheduled videos were not re-rendered. Kids tooling is not covered. See `video/README.md`, "Narration pacing" |
| Myth vs Fact 06 published on 2026-10-21 outside the Tue/Thu/Sat cadence, as an approved editorial experiment | Approved | 2026-10-21 | PR #33; <https://youtu.be/8Zke9Kf1128>. No other video was moved |

## Editorial strategy

| Decision | Status | Date | Notes |
| --- | --- | --- | --- |
| **Experiment-driven publishing.** Rapidly experiment with hooks, cold opens, seamless loops, pacing and storytelling. Publish experiments that offer a meaningfully different viewing experience, each testing a clear hypothesis and published only after human approval. Reuse existing assets and narration to keep production cost low. Evaluate results with YouTube Analytics when available, and use YouTube Studio Trends and manually supplied screenshots to gauge audience demand and prioritize the backlog. Avoid low-value duplicate uploads. The regular Tuesday/Thursday/Saturday schedule is maintained; separately approved experiments may go outside it. Nothing is ever published autonomously | Approved | 2026-10-21 | Builds on the human-approval and cadence decisions above. Cold opens and seamless loops are not implemented yet. Analytics is not available yet (the OAuth token lacks the scope), so early evaluation is manual |

## Attribution, licensing and assets

| Decision | Status | Date | Notes |
| --- | --- | --- | --- |
| Every published terrain video carries the complete attribution block; the pipeline must enforce it | Approved | 2026-10-17 (Gate B) | `fullCredits('terrain')`, see `video/README.md` |
| Descriptions include the Output.ai "Production Technology" credit | Approved | 2026-10-18 | PR #16 |
| Music only from the YouTube Audio Library list in `video/src/audio/music.ts`; the Pixabay "Legendary" track is retired | Approved | 2026-10-19 (PR #27) | After a Content ID block |
| Generated visuals and external assets need recorded provenance, licensing and appropriate disclosure | Proposed policy | n/a | No such assets are used yet; this applies before Visual Asset Enrichment starts |
| AI-generated imagery: no prominent on-screen "AI-generated" label over cinematic images. Disclose in YouTube metadata (`containsSyntheticMedia: true`), the description and the credits file; if an on-screen mark is needed, use a very small, translucent "AI VISUALIZATION" watermark in a safe corner (about 20 px, 50% opacity). Never present an illustration as footage or as a specific real place | Approved | 2026-10-28 | Vanuatu M6.0 Short (`video/experiments/vanuatu-m60-us7000ttlm/`). Supersedes the large label used in its first render |

## Open questions

- Does Myth vs Fact earn a second episode, and later a `myth_fact` workflow? To be decided after reviewing audience data.
- When, if ever, to enable paid autonomous monitoring, and where to host it.
- Whether to add a workflow-level approval step (M3) or keep the publisher gate.
