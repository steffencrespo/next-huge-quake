# ADR 0003: VideoSpec contract and on-screen copy (M2.1)

- **Status:** Accepted. All M2.1 review gates were approved: the contract and wording (A), the design system (B), the hook and map reuse (C), the Facts and Context scenes (D), and the full videos (E).
- **Date:** 2026-10-16 (accepted 2026-10-17)

## Context

ADR 0002 accepted MapLibre inside Remotion for the map. M2.1 adds the rest of the video: a data contract, a visual identity and four scenes (Hook, Facts, Context, Closing) for a ~35 s 1080×1920 30 fps vertical video.

The renderer must stay independent of M1 (Output.ai + Temporal), so that M2.4 can later put an M1 → VideoSpec adapter in front of it. It must also never show a claim the USGS data does not support.

## Decision

1. **VideoSpec v1 is a Zod schema in `video/src/spec/schema.ts`.**
   - Fields: `specVersion: '1.0'`; a fixed 1080×1920 30 fps format; `locale: 'en'`; `provenance`; `asOfUtc`, the time the video is produced for, fixed in the spec so renders are deterministic; the `event` facts; the map mode and approach side; and a fixed four-scene tuple with frame counts and the chosen context cards.
   - All objects are strict, so unknown fields are rejected.
   - Any breaking change bumps `specVersion`.
2. **The spec has no free-form display text.**
   - All on-screen strings come from fixed templates in `video/src/copy/screenCopy.ts`, built from the facts.
   - Scenes and components only display those strings.
   - Free text (an M1 headline or narration) is out of scope for v1. If added later, it enters as a separate field that has already passed the M1 validator.
3. **The event schema mirrors M1's `quakeFactsSchema`.** It is not imported. The fixtures are copies of M1's normalized USGS fixtures, and a test reads the raw M1 JSON from disk and checks they match. A test also fails if any renderer source file imports `@outputai`, `@temporalio` or the M1 package.
4. **The schema enforces structural safety rules:**
   - coordinate and magnitude ranges;
   - ISO UTC times;
   - USGS event IDs and `earthquake.usgs.gov` URLs;
   - `deleted` events are rejected;
   - total duration of 30–45 s;
   - a context card is allowed only when its fact exists. A tsunami card needs the flag to be set: "not set" is never shown, because it could be read as "no tsunami".
5. **Preliminary status is derived, never stored.** The rule is `status !== 'reviewed'`, the same as M1's `describeFacts`. Preliminary videos show a badge for their whole length, and every video ends with "Data may be revised".
6. **Historical events show an ARCHIVE indicator from frame 0.**
   - An event is historical when its **origin time** is more than `ARCHIVE_AFTER_DAYS` (7, matching M1's default look-back) before `asOfUtc`.
   - The USGS update time is never used for this, because old events are updated years later.
   - The schema rejects an `asOfUtc` earlier than the origin time.
7. **Context cards follow one fixed priority list:** depth class, PAGER, felt reports, tsunami flag, review status. The first three that the facts support are used. The tsunami flag comes after felt reports because it says the least and is the easiest to misread.
8. **Card text is short.** Each card shows a title, a value, one line (≤ 60 characters) and one caveat (≤ 80 characters). Longer explanation goes in an `extended` field, which is never displayed in the video.
9. **Test data is marked.** Provenance `synthetic-test` is used for altered fixtures, and those renders carry a permanent TEST DATA watermark.
10. **The copy guard (`video/src/copy/guard.ts`) is a focused safeguard, not a fact checker.** It checks two things:
   - every number on screen comes from the facts or a declared template constant;
   - a short list of unsupportable assertions is absent: casualties and damage, aftershocks, a tsunami or warning having occurred.

   The fixed caveat sentences in `video/src/copy/caveats.ts` name what the data does not establish. They are exempt only when they appear verbatim.

   It runs in the unit tests and in `QuakeNews`'s `calculateMetadata` before every render, so a bad template fails the render before frame 0.

## On-screen wording policy

| Fact | On screen (title: value / line / caveat) | Never implies |
|---|---|---|
| PAGER level | "USGS PAGER: RED" / "Highest impact alert level." / "Based on modeled potential impacts, not confirmed damage or casualties." | confirmed damage or casualties |
| Tsunami flag (set only) | "USGS TSUNAMI FLAG: SET" / "Flag present in USGS event data." / "Does not confirm a tsunami or an active warning." | a tsunami, a warning, or any linked external resource |
| Felt reports | "Felt reports: N" / "Submitted to USGS 'Did You Feel It?'" / "A count of reports, not of individual people." | a number of people |
| Depth class | "Depth: SHALLOW" / "10 km · USGS shallow range: 0–70 km" / "Earthquake depth indicates where the rupture began beneath the surface." | effects of depth on shaking or damage |
| Review status | reviewed, automatic ("not yet reviewed") or unknown ("review status not available") | certainty for preliminary data |
| Origin time | "ARCHIVE · Earthquake of January 1, 2024" for historical events | that a past event is new |

When USGS gives no place name, the copy keeps M1's coordinate fallback ("near 52.49°N, 160.24°E") and sets `location.name` to null, so layouts can avoid repeating the coordinates.

## Design system (M2.1b, approved at Gate B)

- **Tokens** live in `video/src/design/tokens.ts`:
  - navy-black `#070B14` background and `#0E1522` panels;
  - seismic red `#D7202A`, darkened from `#E5242B` so white tag text reaches 4.5:1;
  - a lighter red `#FF5A5F` for small red text;
  - a brighter support grey `#CBD3DF` for text that must be read on a phone: caveats, timestamps, attribution and data details;
  - amber reserved for the preliminary badge.
  - Tests check WCAG contrast for every text/background pair, and a 30 px minimum font size.
- **Fonts:** Barlow Condensed (600/700/800) for display text and Inter (400–700, tabular figures) for data. Both are SIL OFL 1.1, vendored as latin woff2 files with their licenses in `video/public/fonts/` by `scripts/vendor-fonts.ts`, and loaded before the first frame. No system or network fonts are used.
- **Layout** is in `video/src/design/layout.ts`:
  - safe area: top 200, bottom 420, left 72, right 150 px;
  - named text regions per layout;
  - a map zone reserved between the chrome and the lower third;
  - below the safe area, no content: the map continues there under a lighter scrim.
  - A data detail is shown only if it fits beside its value (a deterministic estimate), so values are never squeezed.
  - Tests check that regions stay inside the safe area and never overlap when shown together.
- **Channel identity** lives in one file, `video/src/design/brand.ts`: the name, the glyph toggle and the closing tagline ("Stay informed. Stay prepared.", approved at Gate B review). Changing the tagline is an editorial change.
- **Motion primitives** (`video/src/design/motion.ts`) are pure functions of the frame. Entrances last 8–15 frames, and the 3-frame seismic tick is the only signature effect.
- **DesignBoard** (`video/src/compositions/DesignBoard.tsx`) renders review stills from the real components and copy; `scripts/render-design.ts` writes full-size and phone-size PNGs.
  - The live-map board runs as the 300-frame `DesignBoardLive` composition and renders frame 270. Remotion's `Freeze` did not drive the spike map's per-frame camera in a still.
  - Its map is shifted up by a fixed offset as a stand-in for the camera padding that M2.1c adds.

## Map reuse and the hook (M2.1c, approved at Gate C)

- **`video/src/map/LiveMap.tsx`** is the M2.0 map extracted without behaviour changes:
  - the same initialization, `jumpTo`-only camera and per-frame readiness gate;
  - the same `cancelRender` on any failure, and the same MAPDIAG diagnostics.
  - The camera function is read through a ref, so re-renders never re-run the gate.
- **The spike runs on `LiveMap`.** The regression renders against the M2.0 baselines show:
  - identical camera traces for Noto and Kamchatka;
  - all 300 frames ready, with 0 errors and 0 px marker drift;
  - minimum PSNR of 44.6 and 45.1 dB, which equals the M2.0 repeat-render noise floor.
- **`video/src/map/newsCamera.ts`** retimes the spike's pure camera helpers for the 35 s timeline:
  - the globe turn and zoom-in happen during the hook;
  - then a slow push to z6.8 by the end of Context, then a hold.
  - While the hook compacts, MapLibre camera padding moves the epicenter from the screen center into the map zone.
  - Tests cover purity, arrival, monotonic zoom, per-frame step limits and the antimeridian short arc.
- **The hook** (`video/src/scenes/HookScene.tsx`):
  - the magnitude lockup is complete at frame 0;
  - frames 66–90: it compacts into the "M x.x" top-bar lockup, with the numeral gone before the lockup appears;
  - from frame 105: the marker and fixed-size rings fade in;
  - from frame 104: the lower third enters, and it continues into Facts.

## Facts and Context scenes (M2.1d, approved at Gate D; timing rebalanced in M2.1e)

- **Facts** (`video/src/scenes/FactsScene.tsx`):
  - the lower third continues from the hook;
  - the data panel opens and its rows arrive one second apart;
  - everything holds for about 7 s of fully visible data (Facts is 12 s);
  - the panels then fade out for the context cards.
  - Unnamed locations drop the repeated Epicenter row.
- **Context** (`video/src/scenes/ContextScene.tsx`):
  - the map dims slightly;
  - one card at a time, each with an equal share of the scene (Context is 12 s, so 4 s per card when there are three);
  - every card, including the last, fades out at the end of its share.
  - progress dots appear only when there is more than one card.
- **Indicators:** the chrome (ARCHIVE, update time, preliminary badge, compact magnitude) and the source footer stay on screen in both scenes.
- **Timing change in M2.1e:** at Gate D the last card had too little reading time. Facts went from 14 s to 12 s and Context from 10 s to 12 s, so the total stays 35 s.

## Closing scene and the full video (M2.1e)

- **Closing** (`video/src/scenes/ClosingScene.tsx`, 5 s):
  - the map fades to navy and the glyph draws on;
  - the wordmark, rule and tagline arrive, followed by the USGS source block and the disclaimers;
  - everything is on screen by about 2 s and holds.
  - The compact magnitude and the footer fade out, because the end card carries the full source block. ARCHIVE, the update time and the preliminary badge stay.
- **`QuakeNews`** (`video/src/compositions/QuakeNews.tsx`) is the video. Its only input is `{ spec }`.
  - It stacks the news map, a scrim, the four scenes in `Sequence`s (ranges from the spec) and, for `synthetic-test` data, the TEST DATA watermark.
  - Remotion validates the props with `videoSpecSchema`.
  - `calculateMetadata` re-parses the spec, derives the duration and format, and runs the copy guard.
- **`scripts/render-news.ts`** builds each fixture's spec, writes it to JSON and renders from that file, so the render exercises the same contract M2.4 will use.

## Evidence (M2.1e)

These renders were made on the same Intel Mac as ADR 0002, with Remotion 4.0.536, MapLibre GL JS 6.14.0, GPU (`angle`), concurrency 4 and local map data. They are regenerated by `npm run render:news` and checked by `scripts/verify-render.ts` (`out/news-report.md`).

| Video | Stream | Frames ready / map errors / context lost / blank | Readiness wait p50 / p95 / max (ms) | Marker drift | Wall time | Per frame | Peak memory (process tree) |
|---|---|---|---|---|---|---|---|
| Noto | H.264 1080×1920 30 fps, 1,050 frames, 35.0 s | 1050 / 0 / 0 / 0 | 3 / 7 / 983 | 0 px | 86.3 s | 82 ms | 4.3 GB |
| Kamchatka | same | 1050 / 0 / 0 / 0 | 2 / 6 / 1,230 | 0 px | 84.9 s | 81 ms | 4.0 GB |
| Preliminary test data | same | 1050 / 0 / 0 / 0 | 2 / 6 / 632 | 0 px | 85.4 s | 81 ms | 4.2 GB |

- **Pop/flash candidates** fall only on frames 71–78: the intended hook compaction, where the large numeral shrinks and moves. The mean frame difference there peaks at 10.9–11.9 luma levels, against a threshold of 8. There are no isolated flashes, and the scene changes do not trigger the check.
- **Unproject round-trip error** is below 1e-9°.
- **Spike regression** (M2.1c) is unchanged: identical camera traces, and a PSNR at the M2.0 noise floor.
- **Memory:** peak memory stayed at the M2.0 level (about 4 GB) for 1,050 frames, so the `angle` leak noted in ADR 0002 did not require splitting the render.

## Limitations

- **The guard does not interpret meaning.** A sentence can pass it and still mislead. The fixed templates and their editorial review are the main protection.
- **It does not detect numbers written as words**, the same known gap as M1's fact check (ADR 0002, related follow-up).
- **It is not a validator for free text.** Editorial validation remains M1's job, and the integration gate before publication belongs to M2.4.
- **The mirrored event schema can drift from M1.** The fixture test catches drift for the fixture fields; the M2.4 adapter must parse M1 output with `videoSpecSchema`.

## Consequences

- New scenes or cards need a new template, a schema rule for when the template is allowed, guard coverage, and editorial review of the wording.
- `scripts/export-copy.ts` writes every on-screen string per fixture to `video/out/copy-review.md` for review.
