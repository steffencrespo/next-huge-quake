# EP 02 Oil Drilling: "We're Triggering Earthquakes. And We Know How." (scheduled)

Episode 2 of "Can This Cause an Earthquake?". 32.34 s, 1080×1920, Daniel narration at fast-beats pacing, AI stills generated manually by the owner, a Natural Earth map for the real Pawnee epicenter, every number and label drawn by Remotion.

## Steps (gates in bold)
1. `npx tsx experiments/oil-drilling-cinematic/audio.ts plan`: free. **Done:** generated (585 credits) and built `audio.json`.
2. **Done:** the owner generated all five stills manually from `PROMPTS.md` (no image API calls), saved in `assets/ai/` under the names in `assets.ts`.
3. **Done:** overlays (`WELL`, `SEAM`, `PRESSURE_FROM`) are pinned to the real AI-2 and AI-3; `render.ts --still=<seconds>` checks framing.
4. **Done:** `out/oil-drilling-cinematic-v1.mp4` (32.34 s; QA in `CREDITS.md`). `render.ts --final` refuses to run while a required still is missing.
5. **Done:** the owner approved the final, then authorized this release.
6. **Done:** `out/oil-drilling-tiktok-no-music-v1.mp4` (`render.ts --final --tiktok`, always music-free). **The owner uploads it to TikTok manually**, using `tiktok-metadata.txt`.
7. **Done:** YouTube [0fWQ3s-sbbg](https://youtu.be/0fWQ3s-sbbg), scheduled for Thu 2026-11-19 18:00 America/Sao_Paulo, in Earthquake Science Explained. **Still needed from the owner:** confirm the altered-content setting in YouTube Studio (see `CREDITS.md`).

## Files
- `script.ts`: lines, sources, USGS event.
- `assets.ts`: still manifest.
- `Cinematic.tsx`: the composition (imports shared helpers from the Taipei 101 episode, which it does not change).
- `TikTok.tsx`: the music-free TikTok composition, with a mock UI for safe-zone stills only.
- `Root.tsx` and `index.ts`.
- `audio.ts`: narration.
- `render.ts`: local render (`--tiktok`, `--ui` for mock-UI stills).
- `PROMPTS.md`: image prompts.
- `oil-drilling-cinematic-v1.credits.txt`: credits appended to the YouTube description.
- `tiktok-metadata.txt`: caption, hashtags, cover title and disclosure for the manual TikTok upload.
- `CREDITS.md`: verification, sources, disclosure, generation log, QA.
- `assets/` and `out/`: stills and renders, git-ignored.
