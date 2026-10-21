# Next Huge Quake: video renderer

This package renders vertical earthquake news videos (1080×1920, 30 fps, H.264, about 28 to 35 s) with [Remotion](https://www.remotion.dev/) and [MapLibre GL JS](https://maplibre.org/).

The only input is a **VideoSpec**: validated USGS facts plus scene timing, with no free-form text. Every on-screen string comes from fixed, reviewed templates. The package does not depend on the M1 news agent (Output.ai and Temporal).

Decisions and evidence:
- [ADR 0002: map rendering](../docs/decisions/0002-m2-map-rendering.md)
- [ADR 0003: VideoSpec, copy and design](../docs/decisions/0003-m2-video-spec.md)

## Setup

Requires Node 24.3 or later, and a GPU for practical render times.

```bash
npm install
npm run build:geo
```

`build:geo` prepares the offline map data and the MapLibre worker in `public/` (gitignored). The fonts in `public/fonts/` are committed (SIL OFL 1.1).

## Commands

| Command | What it does |
|---|---|
| `npm test` | Unit tests: schema, fixtures, copy and guard, design tokens and layout, cameras, scene timing, independence from M1 |
| `npm run typecheck` | TypeScript check |
| `npm run studio` | Remotion Studio (QuakeNews, MapSpike, DesignBoard) |
| `npm run copy:review` | Writes every on-screen string per fixture to `out/copy-review.md` |
| `npm run render:news` | Builds each fixture's VideoSpec (`out/news/<fixture>.spec.json`), renders `out/news/<fixture>.mp4` with the live map on GPU, and saves review stills |
| `npm run render:design` | DesignBoard stills, full size and phone size (`out/design/`) |
| `npm run render:contact-sheet` | One labeled sheet of the DesignBoard phone stills |
| `npm run verify -- --dir=news --frames=1050 --report=news-report noto kamchatka preliminaryTest` | Checks the stream, readiness, blank frames, pops and marker drift for each render (`out/news-report.md`) |
| `npm run prepare:terrain [-- --plan \| --offline]` | Fetches and caches the DEM tiles for the terrain targets (`cache/terrain/`), copies them to `public/terrain/` with a manifest; `--plan` reports tile counts without fetching, `--offline` proves the cache is complete |
| `npm run render:terrain-b [-- --offline-sandbox]` | M2.2b review: map-only stills (a1 vs b1-cool), full terrain videos with terrain credits, and a local comparison page (`out/m2-2/b/`) |
| `npm run check:terrain-coverage -- <target>=<log> ...` | Checks that every DEM tile a render requested was prepared |
| `npm run style:metrics -- --dir=m2-2/b` | Land / shelf / deep-ocean luminance metrics for the terrain style review |

## Educational Shorts (M3)

`WhyEarthquakes` is a 60 s (extended to fit the narration) 1080x1920 science Short, separate from the news pipeline (`src/edu/`; nothing there imports the news code). It is a 2.5D SVG cross-section driven by a pure model (`src/edu/geo.ts`): locked fault, elastic strain, sudden slip, P and S waves, surface shaking.

| Command | What it does |
|---|---|
| `npx tsx scripts/generate-edu-narration.ts` | Dry run: prints the script, character count and which clips are cached. Add `--generate` to request only missing clips from ElevenLabs (one request per line, cached in `assets/audio/edu/`; never regenerates a cached clip without `--force`) and write `out/edu/audio.json` |
| `npx tsx scripts/render-edu.ts` | Renders `out/edu/why-earthquakes-v2.mp4` with narration, the music in `assets/audio/` and synthesized effects, plus its `credits.txt`. Calls no paid service |

Music comes from `src/audio/music.ts` (default: "Deified", YouTube Audio Library; `--music=<key>` on `edu-batch` picks another). The Pixabay track "Legendary" is retired after a Content ID block and a test keeps it out of the renderers.

Without props the composition is silent with placeholder captions (`npm run studio`). The music credit goes in the public description (see `credits.txt`), together with the Production Technology block above.

To render one video from any valid spec:

```bash
npx remotion render QuakeNews out/video.mp4 --gl=angle --props=path/to/spec.json
```

The props file is `{ "spec": <VideoSpec> }`. An invalid spec, or copy that fails the guard, fails the render before frame 0.

## Historic Earthquakes (Batch 01-03)

`src/historic/` holds three Shorts for the Historic Earthquakes playlist: `HistoricChile1960`, `HistoricJapan2011`, `HistoricSanFrancisco1906`. They reuse the educational shell (`src/edu/EduShort.tsx`: captions, CTA, ducked music, narration beats, library) and add regional Mercator maps (`regionmap.ts`, Natural Earth 1:50m land), a schematic subduction section and data cards (`kit.tsx`). The Pacific view of 01 reuses the Equal Earth map of the Ring of Fire episode.

```bash
npx tsx scripts/edu-batch.ts plan     --series=historic   # lines, cache hits, estimated credits; no request
npx tsx scripts/edu-batch.ts preview  --series=historic   # silent renders with timed placeholder captions -> out/edu/preview/
npx tsx scripts/edu-batch.ts generate --series=historic   # paid: only missing clips; ledger in out/edu/credit-ledger-historic.json
npx tsx scripts/edu-batch.ts final    --series=historic   # narration, music, effects -> out/edu/final/
```

Verified facts (sources): USGS ComCat (magnitudes, times, epicentres: 1960 M9.5, 2011 M9.1 Mww, 1906 M7.9 Mw); USGS 1906 event pages (rupture of the northernmost 296 mi / 477 km, about 20 ft offset near Point Reyes per Lawson, toll undercount factor 3 to 4, Lawson 1908, Reid 1910); USGS Hawaiian Volcano Observatory (1960 tsunami about 15 h to Hawaii, about 22 h to Japan); USGS Tohoku summary (15,703 dead at the time of its writing, 37.88 m maximum run-up at Miyako); JMA (revised tsunami warning system in service 2013-03-07).

Illustrative, not data: rupture bands, the Japan Trench line, the San Andreas trace, tsunami routes and wave arcs, cross-sections, the skyline and fire graphic, the fence diagram. Each is labelled on screen. The maps are vector maps, not the terrain-tile renderer used by QuakeNews.

## Narration pacing

New Shorts use the **fast-beats** pacing by default (approved 2026-10-21, from the Panama D4 experiment; `src/audio/pacing.ts`): speech at 1.2x with the pitch preserved (ffmpeg `atempo`), pauses between phrases shortened (sentence end 0.1 s, colon, ellipsis or dash 0.2 s, other breaks 0.15 s), and captions re-timed to match. Pauses an episode script declares on purpose (`gap` in `plan()`, for example the MYTH to FACT reveal) are kept at their length. It processes cached or generated audio with ffmpeg and makes no request.

| Format | Where it applies | Opt out |
|---|---|---|
| News (`render-package`, so `quake_video`) | Narration is paced, and the scenes follow it: Hook and Closing keep their length, Facts and Context share the rest, and the video ends 3.77 s after the voice (a 29.7 s narration gives the old 35 s, a 22.6 s one about 28 s). The camera push ends with the context scene. Paced inputs are written next to the video (`spec.paced.json`, `soundtrack.paced.json`, `narration.paced.mp3`); the generated narration is not changed | `--pace=natural` |
| Educational, historic, depth and Myth vs Fact (`edu-batch audio` / `final`) | Cached clips are paced and placed back to back; outputs are named `<episode>-<music>-fast-beats.mp4` and the natural file is never overwritten. The storyboard length (`baseSeconds`) is no longer a floor | `--pace=natural` |

`--pace=fast` tightens every pause, declared ones too. `npx tsx scripts/pace-narration.ts <soundtrack.json>` writes paced narration and soundtrack alone, to inspect. Not covered: the kids series, which has its own narration scripts. Videos already published or scheduled were rendered at natural pacing and are not re-rendered; re-running `render-package` or `edu-batch final` for an old episode now gives the paced version unless `--pace=natural` is passed.

## Structure

```
src/
  spec/          VideoSpec v1 schema, builder (facts → spec), scene timeline
  fixtures/      Noto, Kamchatka (USGS data) and a preliminary TEST DATA fixture
  copy/          formatters, screen-copy templates, fixed caveats, focused guard
  design/        tokens, brand (channel name and tagline), layout and safe area, motion, fonts
  components/    chrome, lower third, data panel, context card, closing card, wordmark
  map/           LiveMap (M2.0 readiness gate), news camera, NewsMap, static backdrop
  scenes/        Hook, Facts, Context, Closing (presentational, given screen copy and a frame)
  compositions/  QuakeNews (the video), DesignBoard (review stills)
  spike/         M2.0 map spike, kept as a regression reference
scripts/         geo/font preparation, render and verification tools
```

## Map data and credits

| Data | Source | Terms |
|---|---|---|
| Earthquake facts | U.S. Geological Survey (USGS) | Credited on screen ("Source: USGS") and in the closing card |
| Land, coastline, borders | [Natural Earth](https://www.naturalearthdata.com/) 1:10m via `world-atlas` | Public domain; credited as a courtesy |
| Terrain and bathymetry (production map of QuakeNews since the M2.2 MVP integration) | [Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (Mapzen / Tilezen Joerd, AWS Open Data), prepared locally by `npm run prepare:terrain` | Attribution required: [Joerd attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md); Canadian data under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada) |

`render-news.ts` writes the complete block to `out/news/<fixture>.credits.txt` next to each MP4; paste it into the public description. Terrain for a new event: `npm run prepare:terrain -- path/to/spec.json` (QuakeNews fails before frame 0 if its tiles are missing).

**On screen**, a video with the terrain map shows "Source: USGS · Terrain: Mapzen" in the footer and "Map data: Natural Earth · Terrain: Mapzen" on the closing card.

**These short lines are not the complete attribution.** Joerd's attribution doc says credit must appear "in a place that is reasonable to the medium", and OGL-Canada asks for its statement plus, where possible, a link to the licence. Every published video that uses the terrain map must therefore carry the complete block from `fullCredits('terrain')` (`src/copy/credits.ts`) in its public description or end credits:
- Joerd's full required-attribution list, verbatim;
- Mapzen;
- the OGL-Canada link.

Technical documentation alone is not sufficient. `npm run copy:review` prints the block.

**Mandatory publishing requirement (accepted at Gate B, 2026-10-17):** the complete verified attribution block must accompany every publicly published terrain video. The future publishing pipeline (M2.4 and later) must attach it automatically and refuse to publish a terrain video without it. Publishing is not implemented yet.

**Production technology credit (requirement for the publishing integration, recorded 2026-10-18):** the automatically generated YouTube description (publication metadata) must also include, after the existing mandatory credits and without changing them:

```
Production Technology
Automated news and video production powered by Output.ai
https://output.ai
```

It belongs in the description only: not in the on-screen credits and not in the Remotion composition. Automatic description generation does not exist yet (today only `credits.txt`, the attribution block, is produced), so this is recorded for the upcoming publishing step rather than added to `credits.txt`.

The required list is reproduced in full rather than trimmed to the sources actually used. At the prepared zooms (z0–z8) the tiles come from ETOPO1, GMTED2010 and SRTM, plus NRCAN CDEM in Canada (recorded in `public/terrain/manifest.json`). Per-tile provenance is not tracked, so the complete list is the conservative record.

## Render performance (terrain map)

The reference budgets stay as they were:
- readiness wait p95 ≤ 250 ms;
- maximum wait ≤ 5 s;
- peak memory ≤ 5 GB;
- wall time ≤ 2× the M2.1 map.

The terrain map is accepted as a **documented, provisional exception** (Gate B, 2026-10-17).

| Measured (b1-cool, offline, GPU, 3 renders) | Range |
|---|---|
| Wall time vs M2.1 | 1.97–2.06× (174–183 s vs 88 s) |
| Readiness wait p95 | 138–301 ms |
| Maximum wait | 3.7–4.3 s |
| Peak memory | 4.6–4.9 GB |

- The ocean hillshade is switched off from z6 (`OCEAN_HILLSHADE_MAXZOOM`); it fades to zero first, so this has no visible effect.
- Performance is revisited only if later milestones show consistent degradation, memory problems or render failures.

## Editorial note: the ARCHIVE badge

ARCHIVE marks historical or retrospective content only. Ordinary reports about recent earthquakes should not carry it. The first Panama video (event us6000u18k, a week old) shipped with the badge by explicit approval; badge logic is not changed yet, so a future recent-event video needs a decision on how to suppress it.

## Not here yet

- **M2.2:** production map styling. Terrain (M2.2a/b) is opt-in through the `TerrainSpike` composition; labels, framing, marker and the production default switch follow in M2.2c–f.
- **M2.3:** narration, audio and subtitles.
- **M2.4:** M1 → VideoSpec integration and publishing.
