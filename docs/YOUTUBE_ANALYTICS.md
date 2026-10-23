# YouTube analytics

Baselines of viewer metrics for the Next Huge Quake channel, kept so later changes can be compared with a recorded starting point. The experiment narrative lives in [EXPERIMENT_JOURNAL.md](EXPERIMENT_JOURNAL.md), priorities in [ROADMAP.md](ROADMAP.md).

## Evidence labels

- **[metric]** a number read from YouTube Studio, with its snapshot date.
- **[hypothesis]** something we believe might be true. Not measured.
- **[repo]** verifiable in Git, a PR or a manifest.

## Data source and limits

All figures below come from **YouTube Studio screenshots supplied manually** on 2026-10-22. They were not exported from the YouTube Analytics API and are not reproducible from the repository. Percentages are as displayed in Studio (rounded).

Reporting periods, as shown in the screenshots:

- **Sep 25 to Oct 22, 2026 (last 28 days):** all figures below except the one noted next.
- **Last 48 hours (realtime):** the 2,706 views figure only. It is a separate, shorter window.

The sample is small: no per-video retention curves were captured yet.

## Baseline: 2026-10-22

Figures cover Sep 25 to Oct 22, 2026 (last 28 days) unless marked otherwise.

### Channel totals [metric]

| Metric | Value |
| --- | --- |
| Views | 5,158 |
| Watch time | 11.6 hours |
| Subscribers | +7 |
| Views, last 48 hours (realtime, separate window) | 2,706 |
| Monthly audience | 843 |
| New viewers (share of monthly audience) | 99.4% |

### Shorts engagement [metric]

| Metric | Value |
| --- | --- |
| Engaged views | ~1.4K |
| Likes | 48 |
| Stayed to watch | 26.7% |
| Swiped away | 73.3% |

### Traffic sources [metric]

| Source | Share |
| --- | --- |
| Shorts feed | 90.9% |
| YouTube search | 7% |

### Device [metric]

| Metric | Value |
| --- | --- |
| Mobile share of watch time | 79.3% |

### Top videos by views [metric]

| Video | Views |
| --- | --- |
| Panama M7.7 | 1,161 |
| Magnitude 6 vs 7 | 661 |
| Kamchatka M6.9 | 654 |
| California Myth vs Fact | 509 |
| Tibet M7.0 | 432 |

The Tibet M7.0 Short (`4ZrrJfRGJRQ`, [repo]) was published on 2026-10-22, the day of the snapshot, so its count is early and not comparable with older videos.

### Top geographies by views [metric]

| Country | Share |
| --- | --- |
| United States | 9.2% |
| Philippines | 5.8% |
| India | 5.7% |
| Brazil | 4.9% |
| Indonesia | 4.5% |

## What the baseline says, and what it does not

Measured [metric]: viewing is almost entirely through the Shorts feed, almost all viewers are new, and about three in four Shorts viewers swipe away rather than stay to watch.

Not established: why viewers swipe away, which videos retain best, whether any production change (narration pace, opening, format) affects retention, or whether views from the last 48 hours reflect the Tibet coverage. None of these can be concluded from this snapshot.

## Hypothesis

**[hypothesis]** Stronger opening hooks can raise the stayed-to-watch rate above the 26.7% baseline. Reasoning: with 73.3% swiping away and nearly all traffic coming from the Shorts feed, the first seconds are where most viewers are lost.

This is a direction to test, not a result. Related earlier hypotheses (faster narration pace, cold open and loop) are logged in [EXPERIMENT_JOURNAL.md](EXPERIMENT_JOURNAL.md) and remain unmeasured.

How to test it, when we do: change the opening of new Shorts deliberately and record which videos changed. Compare their stayed-to-watch against the 26.7% baseline and against unchanged videos published in the same window, and avoid claiming improvement from a single video or a few days of data.

## Follow-up checkpoint: around 2026-10-29

Capture a second Studio snapshot about one week after the baseline, with the same cards, and add it below as a new dated section. Record:

- the same totals, engagement, traffic, device, top-video and geography figures;
- stayed-to-watch per video where Studio shows it, for the Shorts published since 2026-10-22, noting which had a changed opening;
- the reporting period shown on each card, so the two snapshots are comparable (the baseline is Sep 25 to Oct 22, 2026, last 28 days).

If the figures cannot be captured the same way, say so rather than comparing unlike numbers. Decide then whether the hook hypothesis is supported, unsupported or still undecided.
