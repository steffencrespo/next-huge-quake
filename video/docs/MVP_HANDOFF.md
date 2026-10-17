# MVP handoff: terrain maps (M2.2) → first publishable video

Written 2026-10-17 at the end of the M2.2 session. **New priority:** one complete, factually accurate, publishable earthquake video with narration, music, captions and correct credits, as fast as possible.

## 1. Git state

- Repository `/Users/leonardosteffen/Dev/next-huge-quake`, branch **`master`** at `9d5799a` (M2.1 merge, PR #6). There is a single worktree and no other branches in use.
- **All M2.2 work is uncommitted on `master`'s working tree**: 15 modified files and about 20 new files/directories, all under `video/`. Nothing is committed, pushed or open as a PR.
- Before committing, create a branch (e.g. `feat/m2-2-terrain-mvp`). Never commit straight to `master`.
- Gitignored local data, which must be regenerated on another machine:
  - `video/cache/` (241 MB): DEM tiles and Natural Earth downloads;
  - `video/public/terrain/` (311 MB);
  - `video/public/geo/` (36 MB);
  - `video/out/m2-2/{a,b,c}/` (about 1.6 GB of review evidence).

**Modified:**
- `video/`: `.gitignore`, `README.md`, `package.json`
- `video/scripts/`: `build-geo.ts`, `export-copy.ts`, `lib/render-process.ts`
- `video/src/`:
  - `Root.tsx`, `compositions/QuakeNews.tsx`
  - `copy/screenCopy.ts`, `copy/screenCopy.spec.ts`
  - `design/tokens.ts`, `design/tokens.spec.ts`
  - `map/LiveMap.tsx`, `map/NewsMap.tsx`, `map/newsCamera.ts`

**New:**
- `video/scripts/`:
  - `prepare-terrain.ts`, `check-terrain-coverage.ts`, `check-labels.ts`, `make-label-fixture.ts`, `style-metrics.ts`
  - `render-terrain-spike.ts`, `render-terrain-b.ts`, `render-terrain-c.ts`
  - `lib/terrain-stills.ts`, `lib/terrain-targets.ts`
- `video/src/compositions/TerrainSpike.tsx`
- `video/src/copy/credits.ts` and its spec
- `video/src/map/`:
  - `demTiles.ts` and its spec, `localDemProtocol.ts`, `terrainStyle.ts` and its spec, `terrainProbes.ts`
  - `labels/`: `data.ts`, `geo.ts`, `projection.ts`, `selectLabels.ts`, `MapLabels.tsx`, `testRegions.ts`, `labels.spec.ts`, `__fixtures__/geo-sample.json` (172 KB, Natural Earth, public domain)

**State:** `npm test` gives 157/157; `npm run typecheck` is clean.

## 2. What was built and how far it is validated

### M2.2a: terrain feasibility (Gate A approved)
- **Terrain source:** AWS Terrain Tiles (Terrarium PNG) fetched once by `prepare-terrain.ts` into `cache/terrain`, copied to `public/terrain` with a `manifest.json` (SHA-256 for each tile). It's served locally; renders never touch the network.
- **Tile selection:** `demTiles.ts` picks tiles along the camera path. It was calibrated against the tiles MapLibre actually requested: 0 misses, about 2–2.5× over-fetch.
- **Readiness gate fixes in `LiveMap.tsx`.** These apply to all renders, and the regressions confirmed identical output:
  1. errors raised while the map initialises are no longer discarded;
  2. the first frame's camera padding is applied when the map is created;
  3. `local-dem://` (`localDemProtocol.ts`): MapLibre 6 silently treats a 404 tile as "no data", so a missing tile is now a hard map error that fails the render.
- **Request guard:** with a custom style, any request off the page origin fails the render. TILEREQ log lines feed `check-terrain-coverage.ts`.
- **Validated:**
  - offline renders under `sandbox-exec` with the network denied, including a negative control that failed as expected;
  - a negative test where a missing tile fails the render;
  - deterministic repeat renders;
  - M2.0 and M2.1 regressions unchanged.

### M2.2b: style polish and credits (Gate B approved)
- **Style `b1-cool`:** colours live in `MAP_COLORS` in `design/tokens.ts`.
  - Layer order: shelf background → land → land tint → land hillshade → bathymetry (opaque below −200 m, so deep water carries no land shading) → ocean hillshade (fades to 0 and is switched off from z6) → coast → borders.
  - The Natural Earth coastline is the shore of record; inland depressions are never painted as sea.
- **Credits** (`src/copy/credits.ts`, the single source):
  - on screen: footer "Source: USGS · Terrain: Mapzen", closing "Map data: Natural Earth · Terrain: Mapzen";
  - `fullCredits('terrain')`: Joerd's 11 required attribution lines verbatim, plus Mapzen and the OGL-Canada link;
  - `buildScreenCopy(spec, { mapCredits })`, which defaults to `'natural-earth'`.
- **Validated:**
  - metrics: land clearly above shelf, survey-track streaks removed, inland relief +30%;
  - gate, offline, coverage and determinism all pass;
  - M2.0 and M2.1 regressions unchanged.
- **Performance:** a documented provisional exception (`video/README.md`, "Render performance"): wall time 1.97–2.06× M2.1, readiness p95 138–301 ms, peak memory up to about 5 GB.

### M2.2c: geographic labels (checkpoint C1 only; paused; not approved)
- **Pieces:**
  - `src/map/labels/`: deterministic selection (at most one country, one sea and one city), a minimal projection model, point-in-polygon lookups, the overlay, and a debug view;
  - `build-geo.ts` downloads NE v5.1.2 populated places (10m) and marine areas (50m), SHA-256 pinned, into `public/geo/labels.json`;
  - an experimental camera hold (`HOLD_CAMERA` in `newsCamera.ts`, push ending at frame 300), opt-in only.
- **Labels are opt-in through `TerrainSpike` only (map-only renders).** Evidence is in `out/m2-2/c/selection.md`.
  - With the hold at R = 240 px: Noto gets JAPAN and SEA OF JAPAN; Kamchatka RUSSIA; Myanmar MYANMAR; Alaska COOK INLET; Chile and the open Pacific get none.
  - **With the original camera, no labels fit.**
  - No city label fits anywhere.
- **Check results:** 0 rule violations, projection-model error ≤ 4.9 px. One text-width underestimate (2.7 px) was fixed in code (0.50 em), but **the evidence was not re-rendered** after the fix (by decision).

## 3. Important files and artifacts

| What | Where |
|---|---|
| Terrain style and palette | `src/map/terrainStyle.ts` (`terrainStyle({ resolve, demTiles, variant: 'b1-cool' })`), `MAP_COLORS` in `src/design/tokens.ts` |
| How TerrainSpike builds the production-candidate map style | `terrainMapStyle()` in `src/compositions/TerrainSpike.tsx` (registers `local-dem://`, `credits: 'terrain'`) |
| Map layer of the news video | `src/map/NewsMap.tsx` (optional `mapStyle: NewsMapStyle`), `src/map/LiveMap.tsx` |
| Video body | `src/compositions/QuakeNews.tsx`: `QuakeNewsView({ spec, mapStyle })`; `QuakeNews` currently passes **no** `mapStyle` (M2.1 map) |
| Metadata and copy guard | `src/compositions/quakeNewsMetadata.ts` (calls `buildScreenCopy(spec)`) |
| Credits | `src/copy/credits.ts`; README section "Map data and credits" |
| Tile preparation and checks | `scripts/prepare-terrain.ts` (`--plan`, `--offline`; targets by fixture or probe name), `scripts/check-terrain-coverage.ts`, `scripts/lib/terrain-targets.ts` |
| Production render | `scripts/render-news.ts`, `scripts/verify-render.ts` |
| Review evidence (local only) | `out/m2-2/a`, `out/m2-2/b`, `out/m2-2/c`: `index.html`, `report.md`, MP4s, stills; `out/m2-2/a/baseline/` holds the M2.1 production baselines |
| Earlier decisions | `docs/decisions/0002-m2-map-rendering.md`, `0003-m2-video-spec.md`. ADR 0004 (production maps) is not written yet |

## 4. Known issues and blockers

**Blockers for a publishable video:**
1. **No narration, music or captions yet** (M2.3). Decisions needed:
   - the voice service (ElevenLabs was the earlier preference; it needs an API key and has a cost, so it needs the user's approval);
   - a music track with a license that allows publishing.
2. **No live event input.** Only fixtures (Noto, Kamchatka) render, and they show ARCHIVE. A new event needs its USGS data added as a fixture by hand, because the M1-to-video adapter (M2.4) isn't built.
3. **QuakeNews still draws the M2.1 map** (fixed by the next task below).
4. **The full attribution block is mandatory in the public description of every terrain video.** There's no pipeline for it. For the MVP, paste `credits.txt` by hand.
5. **M1 fact check misses numbers written as words.** Before any automatic publication, the narration and captions must be reviewed by a human.

**Cosmetic or deferred (not blockers):**
- labels (paused; they need the camera hold, which the MVP doesn't use);
- rings and marker redesign (M2.2e);
- location-based framing (M2.2d): open-ocean events look empty;
- the ocean trench is less dramatic in b1-cool;
- render time under the provisional performance exception.

## 5. MVP decisions (2026-10-17)

- **Integrate b1-cool terrain into QuakeNews** as the production map.
- **Keep the original cinematic camera.** Don't use `HOLD_CAMERA`.
- **Don't enable geographic labels.** Keep the C1 code and tests unchanged and unused by QuakeNews.
- **Keep the existing epicenter marker and rings** (`spike/EpicenterOverlay.tsx`).
- **Add a terrain preflight and export the full credits** with every render.
- **No further cartographic refinements.**

## 6. Next task: terrain in QuakeNews (small, about half a day)

1. **Shared production map style.** Move the local branch of `terrainMapStyle()` out of `TerrainSpike.tsx` into a small `src/map/productionMapStyle.ts` that returns a `NewsMapStyle`:
   - name `terrain-b1-cool`;
   - `credits: 'terrain'`;
   - `style: () => { registerLocalDemProtocol(); return terrainStyle({ resolve, demTiles: LOCAL_DEM_TILES, variant: 'b1-cool' }); }`.

   `TerrainSpike` should import it, so there's no duplication.
2. **QuakeNews uses it:** `QuakeNews = ({ spec }) => <QuakeNewsView spec={spec} mapStyle={productionMapStyle} />`.
   - In `quakeNewsMetadata.ts`, build the guarded copy with `buildScreenCopy(spec, { mapCredits: 'terrain' })`, so the guard checks exactly what's shown.
   - For `map.mode === 'static'`, keep the M2.1 behaviour.
   - `DesignBoard` stays as it is.
3. **Terrain preflight** in `calculateQuakeNewsMetadata`: fetch `staticFile('terrain/manifest.json')`, compute the needed tiles with `tilesForTrajectory(f => newsCameraAt(f, target), totalFrames)` (`src/map/demTiles.ts`, pure), and throw "terrain tiles missing for <event id>; run npm run prepare:terrain -- <spec.json>" if any tile is absent. This fails before frame 0; the `local-dem://` protocol still catches anything missed during the render.
4. **`prepare-terrain` accepts a spec file.** Besides fixture and probe names, take a path to `{ spec }` JSON and use `spec.event` latitude/longitude plus `spec.map.approachFrom` as the target, over all frames. (`estimatedTiles` already covers the original camera; it currently unions in the hold camera too, which is harmless.)
5. **Credits export.** `scripts/render-news.ts` writes `out/news/<fixture>.credits.txt` from `fullCredits('terrain')` next to each MP4. Add one line to the README.
6. **Tests:**
   - QuakeNews copy uses terrain credits;
   - the preflight helper reports missing tiles (unit-test it as a pure function given a manifest object);
   - `prepare-terrain` parses spec targets;
   - all existing tests stay green.

### Essential verification (no render matrices)

```
cd video
npm test && npm run typecheck
npm run prepare:terrain -- noto kamchatka --offline          # cache already complete on this machine
npx tsx scripts/render-news.ts noto kamchatka                # production renders, now with terrain
npm run verify -- --dir=news --frames=1050 --report=news-report \
  --compare=noto-m21base:noto --compare=kamchatka-m21base:kamchatka noto kamchatka noto-m21base kamchatka-m21base
npm run check:terrain-coverage -- noto=out/news/noto.log kamchatka=out/news/kamchatka.log
```

**Expected results:**
- 1050/1050 frames ready, 0 map errors, 0 HTTP 404s, 0 px marker drift;
- **camera traces identical to the M2.1 baseline** (the camera is unchanged), while PSNR is intentionally lower because the map changed;
- coverage check passes;
- footer and closing credits visible in the stills;
- `credits.txt` written.

Optionally, to prove offline rendering, run one render under `sandbox-exec -p '(version 1)(allow default)(deny network-outbound)(allow network-outbound (remote ip "localhost:*"))' npx remotion render …`.

After that, the remaining MVP work is narration, music and captions (M2.3), then one manual upload with `credits.txt` in the description.
