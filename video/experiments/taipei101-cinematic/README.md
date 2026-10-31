# Taipei 101: "Can a Skyscraper Trigger an Earthquake?" (local, unpublished)

Episode 1 of "Can This Cause an Earthquake?". About 34 s, 1080×1920, Daniel narration at fast-beats pacing, five AI stills generated manually by the owner, with every number and label drawn by Remotion.

## Steps (gates in bold)
1. `npx tsx experiments/taipei101-cinematic/audio.ts plan`: free. **Done:** generated (600 credits) and built `audio.json`.
2. **Done (AI-1, AI-3, AI-4, AI-5; AI-2 skipped).** The owner generates the stills manually in the ElevenLabs web UI from `PROMPTS.md` (no image API calls) and saves them to `assets/ai/` under the names in `assets.ts`.
3. `render.ts --still=<seconds>` to check framing, then adjust the overlay positions (`QUAKES`, `FaultPulse`) to the real AI-3 and AI-4 images.
4. **Done:** `out/taipei101-cinematic-v1.mp4` (QA in `CREDITS.md`). `render.ts --final`: refuses to run while a required still is missing. Then QA (`npm run verify`-style checks: duration, streams, black or frozen frames).
5. **Done:** approved by the owner. YouTube Fvpb-GlcvqY is scheduled for 2026-11-17 18:00 America/Sao_Paulo (manifest `video/publish/taipei101-cinematic.json`). The TikTok upload is manual, using `out/taipei101-tiktok-no-music-v1.mp4` and `tiktok-metadata.txt`.

## Files
- `script.ts`: lines and sources.
- `assets.ts`: still manifest.
- `Cinematic.tsx`: the composition.
- `Root.tsx` and `index.ts`.
- `audio.ts`: narration.
- `render.ts`: local render.
- `PROMPTS.md`: image prompts.
- `taipei101-cinematic-v1.credits.txt`: credits appended to the YouTube description.
- `CREDITS.md`: verification, sources, disclosure, generation log, TikTok edition.
- `TikTok.tsx`: TikTok edition (`Taipei101TikTok`), with the safe area and the mock interface for diagnostics.
- `tiktok-metadata.txt`: TikTok caption, hashtags, cover title, disclosure.
- `out/`: renders, git-ignored.
