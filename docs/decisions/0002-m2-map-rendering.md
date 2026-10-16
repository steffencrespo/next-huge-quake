# ADR 0002: Map rendering for earthquake videos (M2)

- **Status:** Accepted (M2.0 spike result, reviewed). Production work continues in M2.1 and M2.2.
- **Date:** 2026-10-16

## Context

M2 renders vertical 1080×1920, 30 fps H.264 videos with Remotion. The highest-risk part is the map: a cinematic move from a globe to the earthquake region, an exact epicenter marker, and no blank or partly loaded frames. We considered three options:

- **A.** MapLibre GL JS inside Remotion, with the camera driven per frame.
- **B.** Map images rendered before Remotion, with Remotion adding motion and overlays.
- **C.** A separate globe asset for the opening, then a regional MapLibre map.

The M2.0 spike (`video/`, branch `spike/m2-map-render`) tested option A with a 10-second composition:
1. The magnitude is visible at frame 0.
2. The globe rotates toward the event.
3. The camera zooms from z2.2 to z6.2, then pushes slowly to z6.6 with a 30° pitch.
4. A red epicenter marker with decorative rings appears.

Test events come from the M1 fixtures: Noto (us6000m0xl, coastal) and Kamchatka (us6000qw60, offshore). The Kamchatka camera approaches from the east and crosses the antimeridian.

## Decision

**Use option A: MapLibre GL JS (6.x) inside Remotion, with the globe projection.** The rules that made it work in the spike become requirements for M2.2:

1. **The camera is a pure function of the frame.** `camera.ts` computes center, zoom, bearing and pitch with eased, shortest-arc longitude interpolation. The map uses `jumpTo` only: no MapLibre animations, `fadeDuration: 0`, not interactive.
2. **Per-frame readiness gate.** Each frame:
   - applies its camera;
   - forces a repaint;
   - waits for `idle` *for that camera state*;
   - asserts `loaded()`, `areTilesLoaded()` and `isStyleLoaded()`, checks for map errors, and checks that the WebGL context is not lost.

   Only then does it call `continueRender`. Any failure or timeout calls `cancelRender`, so a bad frame fails the render instead of reaching the MP4.
3. **Overlays are React/SVG, positioned with `map.project(epicenter)`** after the frame's camera is applied. Rings are decorative: fixed pixel size and timing, not scaled to magnitude or distance.
4. **Map data is local at render time.** Assets are prepared before rendering (option B's discipline). Remote tiles worked, but they tripled readiness waits and add a network dependency to every render.
5. **No globe→flat transition is needed for regional framing.**
   - MapLibre's `globe` projection only blends to Mercator between z11 and z12 (verified in the MapLibre 6.14 source).
   - At z6–7 a region about 8° wide shows no visible curvature, and the 30° pitch reads as a cinematic tilt, not as a sphere.
   - Readability at the end of the move depends on map *content* (labels, contrast, relief), not on the projection.
   - If a future scene zooms past z11, MapLibre's built-in blend would apply and would need its own visual check.

Options B and C are not needed. **Fallback (C-lite)**, only if a future style or zoom range shows artifacts: pre-render the globe opening as stills and cut to a live regional map.

## Evidence

The rendered set was reduced from the planned 12 renders to the 7 below once the GPU results were conclusive. Not run: Kamchatka with software WebGL, both software-WebGL repeats, and software WebGL with remote tiles.

Measured on the development machine: Intel x86_64 Mac, 12 threads, 16 GB RAM, Node 26.7, Remotion 4.0.536, MapLibre GL JS 6.14.0, render concurrency 4. Per-render details are regenerated locally into `video/out/report.md` (gitignored) by `video/scripts/verify-render.ts`.

| Render | Stream | Frames ready / map errors / context lost / blank | Readiness wait p50 / p95 / max (ms) | Wall time | Per frame | Peak memory (process tree) |
|---|---|---|---|---|---|---|
| Noto, local, GPU (`angle`) #1 | H.264 1080×1920 30 fps, 300 frames | 300 / 0 / 0 / 0 | 3 / 41 / 1,090 | 40.5 s | 135 ms | 3.9 GB |
| Noto, local, GPU #2 | same | 300 / 0 / 0 / 0 | 5 / 185 / 1,872 | 64.8 s | 216 ms | 3.9 GB |
| Kamchatka, local, GPU #1 | same | 300 / 0 / 0 / 0 | 6 / 237 / 1,531 | 64.7 s | 216 ms | 4.0 GB |
| Kamchatka, local, GPU #2 | same | 300 / 0 / 0 / 0 | 5 / 211 / 1,793 | 57.2 s | 191 ms | 3.8 GB |
| Noto, remote (OpenFreeMap), GPU | same | 300 / 0 / 0 / 0 | 10 / 2,710 / 8,809 | 96.2 s | 321 ms | 3.2 GB |
| Kamchatka, remote, GPU | same | 300 / 0 / 0 / 0 | 11 / 1,540 / 10,265 | 93.9 s | 313 ms | 3.2 GB |
| Noto, local, software (`swangle`) | same | 300 / 0 / 0 / 0 | 7 / 4,309 / 15,025 | 717.5 s | 2,392 ms | 4.3 GB |

**Consistency**

| Comparison | Bit-identical frames | Min PSNR | Mean PSNR | Camera trace identical |
|---|---|---|---|---|
| Noto GPU #1 vs #2 | 53 / 300 | 44.6 dB | 48.0 dB | yes |
| Kamchatka GPU #1 vs #2 | 46 / 300 | 45.1 dB | 49.5 dB | yes |
| Noto GPU vs software | 0 / 300 | 42.2 dB | 44.4 dB | yes |

**Accuracy and motion**
- The marker is drawn exactly at `map.project(epicenter)` on every frame: 0 px drift after readiness, and the unproject round-trip error is below 1e-9°.
- Stills confirm the geography:
  - Noto: the marker sits on the northern tip of the Noto Peninsula.
  - Kamchatka: the marker sits offshore SE of the peninsula.
  - The Kamchatka approach crosses the antimeridian on the short arc, with no swing around the globe. Unit tests cover this.
- Motion is smooth: the largest frame-to-frame change is about 6 luma levels, against a median of 1–2, and no pop or flash candidates were found.

**Findings**
1. **Raw Natural Earth data is not render-ready.** world-atlas geometry follows spherical (d3-geo) semantics:
   - coastline and border lines jump from +180° to −180°, which drew bright bands around the globe;
   - polygons crossing the antimeridian (Russia/Chukotka, Fiji) and circumpolar Antarctica rendered with a wrong fill.

   `video/scripts/build-geo.ts` now splits lines at the antimeridian, unwraps polygon rings, closes circumpolar rings through the pole, and draws coastlines from a line mesh rather than polygon outlines. Any production data pipeline needs the same treatment and a visual check on the globe.
2. **GPU rendering is not bit-identical between repeat renders,** but the difference is invisible (≥ 44.6 dB). The camera, timing and marker positions are identical. Bit-identity under `swangle` was not tested: the repeat render was dropped to save time.
3. **Software WebGL works but is about 11–18× slower** than GPU (2.4 s per frame). Its readiness waits reached 15 s, half the 30 s per-frame timeout. For Linux rendering without a GPU, either raise the timeout or reduce geometry cost (pre-tiled vector data instead of 16 MB GeoJSON parsed in every tab). Linux GPU rendering (`angle-egl`) is untested.
4. **Remote tiles worked:** no missing tiles. Readiness waits rose to p95 1.5–2.7 s and max 10 s, and renders became tile-bound. This supports local assets.
5. **Readability of the final regional view:**
   - Local Natural Earth: the coastline and borders are clean and legible at phone size, but there are no place names, so a viewer has to recognize the shape.
   - OpenFreeMap dark style: adds cities and roads, but contrast is very low and labels are about 16 px and bilingual, too small for a phone. The rings also cover labels near the epicenter.

   M2.2 needs a curated regional style: higher land/water contrast, a few large labels (country, region, nearest major city) rendered as overlays or with local glyphs, and optionally shaded relief.
6. **Tooling notes:**
   - Remotion's bundled ffmpeg is a minimal build (no `blackdetect`, `psnr` or `framemd5`), so verification decodes frames in Node.
   - The MapLibre web worker must be served as a static file (`setWorkerUrl`).
   - Remotion's webpack needs `extensionAlias` for `.js` imports of TypeScript files.
   - Browser console output reaches the CLI log only in `render` with `--log=verbose`, not in `still`.
   - Render time varied between identical runs (40.5 s vs 64.8 s for Noto GPU), so treat single timings as approximate.

## Limitations

- **Spike only.** The composition, typography, map style and ring design are placeholders. There is no VideoSpec, narration, subtitles or M1 integration yet.
- **Coverage.** Two events, both in the northern hemisphere, with one coastal and one offshore. Inland, southern-hemisphere and polar events are untested.
- **Hardware.** One Intel Mac. Linux rendering (GPU `angle-egl` or CPU `swangle`) is untested, and bit-identity under `swangle` was not measured.
- **Diagnostics.** The marker-drift check confirms the overlay matches MapLibre's projection, which makes it consistent by construction. Geographic correctness was confirmed by inspecting the stills.
- **Map data.** Natural Earth 1:10m is fine at z≤7 but has no place names. Regional detail and labels need another source.

## Visual direction for upcoming milestones (approved)

**M2.1: Cinematic Breaking News identity and scene components**
- Professional breaking-news typography with bundled fonts (no system fonts), a clear hierarchy for magnitude, location and time, and safe areas for vertical platforms.
- Channel branding: logo/wordmark, red seismic accent color system, lower-thirds and closing card with source attribution.
- A reusable layout grid and scene components (hook, facts, context, closing, preliminary badge) driven by the VideoSpec.
- The hook text must not compete with the map. Layout reserves map space after the opening.

**M2.2: Production maps**
- Dark cinematic terrain look: shaded relief or terrain-inspired raster under the vector layers, from openly licensed sources with attribution recorded in the asset manifest.
- Stronger land/water contrast, and coastlines readable at phone size.
- A few large location labels (country, region, nearest major city) that stay readable at phone size and are positioned to avoid the epicenter rings.
- More polished seismic rings, still decorative only: fixed size and timing, never scaled to magnitude, distance or intensity, with no legend.
- Local map assets prepared per job, keeping the antimeridian handling from `build-geo.ts`.

## Related follow-up (outside M2)

The M1 fact check misses numbers written as words. Example: a passing narration said "Four hundred twenty-two people submitted shaking reports", which states the felt-report count as people. Videos will show narration as subtitles, so **this must be fixed in M1 before any automatic publication.** It is a separate task; M2 does not change M1.

## Consequences

- M2.2 productionizes this composition:
  - camera keyframes come from the VideoSpec;
  - the readiness gate and diagnostics stay;
  - map assets are prepared into the job bundle (globe data from Natural Earth with the antimeridian fixes; a regional OSM-derived vector extract per event, source and format decided in M2.2);
  - a readable regional style and on-map attribution are designed.
- Attribution:
  - Natural Earth needs none.
  - OpenFreeMap/OpenStreetMap needs "OpenFreeMap © OpenMapTiles, Data from OpenStreetMap" on the map, plus `openstreetmap.org/copyright` in the credits or description.
- Rendering stays local on the host with GPU (`angle`). Remotion's `angle` mode has known memory leaks, so videos longer than the spike may need their map scenes rendered in parts. Peak memory is about 4 GB at concurrency 4.
- Fonts must be bundled in M2.1. The spike uses system Helvetica Neue, which won't exist on Linux.
- Reproduce:

  ```
  cd video && npm install && npm run build:geo && npm test
  npx tsx scripts/render-matrix.ts noto-local-angle-1 kamchatka-local-angle-1
  npx tsx scripts/verify-render.ts
  ```
