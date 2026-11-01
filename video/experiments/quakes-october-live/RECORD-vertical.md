# Earthquakes in October 2026 — 9:16 vertical edit (YouTube Shorts and TikTok versions)

Local, not published. For manual upload only. Two deliverables share one picture:

| Version | File | Audio | Credits |
|---|---|---|---|
| YouTube Shorts | `out/earthquakes-october-2026-vertical-final.mp4` | narration + "Deified" (YouTube Audio Library) | `CREDITS-vertical.txt` |
| TikTok | `out/earthquakes-october-2026-tiktok-final.mp4` | narration only, no music (music is added manually in the TikTok app) | `CREDITS-tiktok.txt` |

The sections below describe the YouTube Shorts render; the TikTok section describes how its file differs. Replaces the Oct 1–25 vertical render (`out/earthquakes-october-2026-m5-live-loop.mp4`, kept unchanged on disk).

## Deliverable
- `out/earthquakes-october-2026-vertical-final.mp4`: 1080×1920, 30 fps, 63.0 s (1890 frames), H.264 High + AAC-LC 48 kHz stereo, 30,059,438 bytes.
- Rendered 2026-11-01 (about 7 min 11 s locally) with `npx tsx experiments/quakes-october-live/render-vertical.ts`.

## TikTok version (no background music)
- `out/earthquakes-october-2026-tiktok-final.mp4`: 1080×1920, 30 fps, 63.0 s (1890 frames), H.264 + AAC-LC 48 kHz stereo 320 kb/s, 28,966,437 bytes. Made 2026-11-01 with `npx tsx experiments/quakes-october-live/export-tiktok.ts` (no re-render, no ElevenLabs call).
- Video: the Shorts H.264 stream copied unchanged (same bitstream hash), so visuals, burned-in captions, pacing and duration are identical.
- Audio: re-mixed from the 12 original paced narration stems (`out/edu/paced/fast-beats/`) with the composition's frame-rounded start times and per-clip gains from `audio-vertical.json`; music is never an input (nothing is filtered out of the mixed Shorts track).
- QA (`qa/tiktok.ts`): video bitstream identical to Shorts; full decode OK; duration 63.019 s both; peak −6.90 dBFS, 0 clipped samples; every gap between narration lines is digital silence (−120 dB) where the Shorts mix carries music at −31 to −34 dB; each of the 12 clips is aligned with the Shorts mix (0 ms offset at 5 ms resolution) and 0.2–0.6 dB quieter there, the share the music added; −20.19 LUFS integrated (gated, narration only), true peak −6.88 dBTP.

## Source of truth
Same snapshot and figures as the approved landscape final (`RECORD-final.md`): `data-final.json` / `snapshot/usgs-2026-11-01T00-03-13-352Z.geojson`, all figures imported from `script-final.ts`.
216 events M5.0+ (195 / 19 / 2), largest M7.7 near Pitaloza Arriba, Panama; strongest section shows all four (M7.7, M7.0, and both tied M6.9s); 7 deep events ≥300 km, largest M6.5 Bonin Islands, 492 km.

## Edit
- `QuakesOctoberVertical.tsx`, `script-vertical.ts`, `audio-vertical.ts`, `render-vertical.ts`.
- Hook at frame 0: "216 EARTHQUAKES · MAGNITUDE 5.0 OR GREATER · OCT 1–31, 2026 (UTC) · USGS"; narration starts at 0.25 s.
- Scenes: title → day-by-day replay → most active areas (Vanuatu and Central America narrated and flown to; full ranking on the card) → plate line over the Pacific → four strongest with zoom-ins → deep events (white rings) → by magnitude → title.
- 12 lines, all landscape lines reused word for word (no new TTS), paced with `fast-beats` (1.2×, Panama D4). Not narrated in this cut: Indonesia, Japan–Kuril–Kamchatka, China–Central Asia and "all other areas" (on the card).
- Text stays inside `SAFE` from `src/design/layout.ts` (x 72–930, y 200–1500); captions use the shared `Captions` (1330–1480); all text ≥30 px (`MIN_FONT_PX`).
- Loop: first and last frames are the same title view; the globe drifts through the seam; music crossfades into its own continuation.

## QA (2026-11-01)
- `qa/facts.ts` and `qa/facts-vertical.ts`: all pass (same snapshot, figures, every line a landscape line, all four strongest and the deep line narrated, manifest and captions = script, no overlapping clips).
- Full ffmpeg decode OK; AVFoundation decode of 126 samples OK. Min mean luma 12.9 (no black frames); min 0.5 s change 0.73 (no frozen span). Seam last→first 0.47 vs normal step 0.22, and the first and last frames are visually identical.
- Audio: −20.96 LUFS integrated, true peak −6.79 dBTP, 0 clipped samples; narration RMS spread 0.66 dB; music-only −31 to −32 dB; seam sample jump < 0.005.
- New ElevenLabs credits: 0 (ledger unchanged at 1707).

## Limitations
- Same as the landscape final: snapshot-time figures (USGS can revise), broad region boxes, `yuvj420p` full-range tag, burned-in captions.
- Safe-area placement follows the project's `SAFE` constants; not checked on a real phone with the Shorts/TikTok UI.
- The first audio half-second is louder than the last (the hook starts at 0.25 s); music level itself is continuous across the seam.
