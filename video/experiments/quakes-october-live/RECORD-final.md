# Earthquakes in October 2026 — FINAL landscape live loop

Approved by the owner on 2026-11-01. Not published; for manual upload only. The MP4 and narration audio are git-ignored and stay local. Credits: `CREDITS-final.txt`.

## Deliverable
- `out/earthquakes-october-2026-live-final.mp4`: 1920×1080, 30 fps, 118.0 s (3540 frames), H.264 High + AAC-LC 48 kHz stereo, 61,082,725 bytes.
- Rendered 2026-11-01 (about 10 min 18 s locally) with `npx tsx experiments/quakes-october-live/render-final.ts`.

## Data
- Query: USGS FDSN `query?format=geojson&starttime=2026-10-01T00:00:00Z&endtime=2026-11-01T00:00:00Z&minmagnitude=5&eventtype=earthquake&orderby=time-asc`.
- Retrieved 2026-11-01T00:03:13.352Z. Raw response: `snapshot/usgs-2026-11-01T00-03-13-352Z.geojson`. Parsed: `data-final.json`. A month-to-date development pull (23:43 UTC on Oct 31) was used only for layout work; it is kept out of Git.
- API count 216 = features 216 = unique after id + alias (`properties.ids`) dedupe; 0 duplicates. Re-check of the count endpoint at 2026-11-01 00:19 UTC: still 216.
- No local magnitude filter: on-screen text and narration say "5.0 or greater" / "five or greater". 60 events are exactly M5.0 (the Oct 1–25 vertical version excluded them).

## Figures (all derived in `script-final.ts`, checked by `qa/facts.ts` against the raw GeoJSON)
- Total 216. Bins: M5.0–5.9 195, M6.0–6.9 19, M7.0+ 2. M6+ 21.
- Largest: M7.7 (mww), 12 km WSW of Pitaloza Arriba, Panama, 2026-10-09 17:56 UTC, 12.6 km deep (us6000u18k).
- Next: M7.0 near Nagqu, China (Oct 22); M6.9 near Ozernovskiy, Russia (Oct 16) and M6.9 near Port-Olry, Vanuatu (Oct 24), tied for third, both shown.
- Deep (≥300 km): 7; largest M6.5 Bonin Islands, Japan region, 492 km (Oct 25). Includes the Oct 31 M6.0 near Shima, Japan, 352 km.
- Regions (broad boxes in `regions.ts`, first match wins): Vanuatu region 57, Central America 30, Indonesia region 24, Japan–Kuril–Kamchatka 16, China–Central Asia region 14, all other areas 75.

## Narration
- ElevenLabs Daniel `3WqHLnw80rOZqJzW9YRB`, `eleven_multilingual_v2`; 16 lines, 5 reused from the library (dots, b0, plate, c0, c1), 11 new.
- New: 734 characters (≈734 credits), ledger `video/out/edu/credit-ledger-quakes-october-live.json`, episode `quakes-october-live-final`; 0 rejected. Ledger total for the experiment now 1707.

## Loop design
- Frame 0 and the last frame are the same title view with all 216 dots; the globe drifts east at 0.9°/s through the seam.
- Music ("Deified", YouTube Audio Library) is steady; the first 3 s crossfade (equal power) from the track at offset = video length into the track from 0, so the end flows into the start.
- No narration in the first 1.0 s or the last 4.3 s.

## QA (2026-11-01)
- `qa/facts.ts`: all checks pass (counts, bins, largest, ties, deep, region reconciliation, unchanged official fields, spoken numbers, clip ids and captions = script).
- Full ffmpeg decode (transcode with `-xerror`) OK; AVFoundation decode of 236 samples (every 0.5 s) OK.
- Frames: min mean luma 13.3 (no black frames); min 0.5 s change 0.144 (deliberate slow drift, no frozen span); seam last→first 0.143 vs normal frame step 0.053.
- Audio (`qa/audio.ts`): −21.98 LUFS integrated, true peak −6.33 dBTP, 0 clipped samples; narration RMS spread 1.77 dB across 16 clips; music-only −30 to −34 dB; seam RMS −30.65 → −29.56 dB.

## Limitations
- USGS magnitudes and locations can still be revised; figures reflect the 00:03 UTC snapshot. Events posted late for the last minutes of Oct 31 would be missing (count unchanged at 00:19 UTC).
- Region boxes are broad and approximate (e.g. "Vanuatu region" includes Santa Cruz Islands events); labels are not tectonic regions.
- Video stream is flagged full-range `yuvj420p` (Remotion JPEG frame path) although `--pixel-format=yuv420p` was passed; players and YouTube decode it, but the tag is noted.
- Captions are burned in (bottom centre); no separate SRT.
- `src/map/LiveMap.tsx` gained optional `width`/`height` props (default 1080×1920, backwards compatible).
