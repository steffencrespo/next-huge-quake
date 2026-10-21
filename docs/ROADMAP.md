# Roadmap

Where the project is heading and how far each piece has got. For the current implementation snapshot see [PROJECT_STATUS.md](PROJECT_STATUS.md); for why choices were made see [DECISION_LOG.md](DECISION_LOG.md) and [decisions/](decisions/).

Last reviewed: 2026-10-21. Anything under "Future capabilities" or marked *proposed* is **not implemented**.

## Current priorities

1. Maintain the earthquake news production and publishing pipeline.
2. Keep producing and publishing educational and historical Shorts.
3. Experiment with new formats and stronger retention hooks.
4. Measure YouTube performance before increasing publication frequency.
5. Keep scientific accuracy and human approval non-negotiable.

## Milestones

Numbering follows the README and is kept as established. Two sub-projects reuse the labels "M1/M2/M3" in their own PRs and docs (the YouTube Publisher M1/M2, and the educational Short called "M3" in `video/README.md`). When in doubt, the milestone below is canonical and the sub-project is named explicitly.

| Milestone | Scope | Status |
| --- | --- | --- |
| **M1** | USGS event to a validated news draft and narration script (`quake_news`, Output.ai) | Done |
| **M2** | Narrated Shorts with Remotion, terrain map, ElevenLabs narration, captions and music; `quake_video` chains M1 to a render (M2.0 to M2.4d) | Done. Stops at `ready_for_approval`. M2.2c map labels were built but paused and are not used |
| **M3** | Editorial approval of drafts and videos | Partly met. Approval is a manual, process-based gate in the publisher (approved text plus content hash). There is no approval step inside an Output.ai workflow |
| **M4** | Publishing approved videos to YouTube | Implemented as a CLI, outside Output.ai: private upload, playlists, scheduling, immediate publish, metadata updates. Delivered as "YouTube Publisher M1 and M2" (PRs #25, #26) |
| **M5** | Automated USGS monitoring | Implemented as `quake_monitor`, **dry run by default**. Paid autonomous mode is not enabled and no always-on host exists |
| **M6** | Show news and videos on the existing website | Not started |

## Editorial formats

| Format | Status | Production path |
| --- | --- | --- |
| Breaking Quakes | Implemented | Output.ai: `quake_news`, `quake_video`, and optionally `quake_monitor` |
| Historic Disasters | Implemented (Chile 1960, Japan 2011, San Francisco 1906) | Remotion tooling in `video/`, hand-scripted and hand-verified |
| Earthquake Explained | Implemented (why earthquakes happen, depth, prediction, magnitude, Ring of Fire) | Same Remotion tooling |
| Kids educational content | Implemented (*Why Does the Earth Shake?*, *Drop, Cover, Hold On!*) | Remotion tooling in `video/src/kids/`; separate playlist, made for kids |
| Myth vs Fact | First experiment published: *Will California Fall Into the Ocean?* (2026-10-21, PR #33). Whether it earns a second episode or a workflow is undecided | Remotion tooling; no generic framework |
| What If scenarios | Future experiment, not started | None |

Only Breaking Quakes runs through Output.ai today.

## In progress

- **Fast narration preset.** The Panama D4 pacing (1.2x speech, pitch preserved, shortened pauses, re-timed captions) is implemented as an optional `fast` preset for educational formats (including Myth vs Fact) and for news narration. It is on a branch and not merged. A comparison preview of the California Short exists; the preset is not the default until a person approves it. For Breaking Quakes it re-times the narration and captions only: the 35 s scene structure D4 also shortened is not ported.

## Future capabilities

None of these exist yet.

- **Editorial Intelligence using Output.ai.** Candidate generation, drafting and review for non-news formats with the same fact-check discipline `quake_news` has.
- **Catalog-aware content selection and duplicate prevention.** Use the publication catalog (manifests, state) to avoid repeating or near-duplicating topics.
- **YouTube Analytics feedback loop.** Today the publisher's OAuth token lacks the analytics scope and no analytics code exists. This is a prerequisite for deciding on publishing frequency.
- **Visual Asset Enrichment.** Licensed photographs, archival footage, AI-generated images and short video clips, each with recorded provenance, licence and disclosure.
- **Automated selection and prioritization of content candidates.** Ranking of events and topics beyond the current USGS-significance ordering in the monitor.
- **Gradual integration of additional editorial formats into Output.ai.** Move a format into a workflow only after it has proven itself as a prototype.

## Sequencing notes

- Prototype a format by hand first, then decide whether it deserves a workflow ([DECISION_LOG.md](DECISION_LOG.md)).
- Analytics comes before any frequency increase. Five Shorts per week is a possible later experiment, not a plan.
- Enabling paid autonomous monitoring is a separate decision and needs an always-on host.
