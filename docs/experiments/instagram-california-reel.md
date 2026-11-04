# Instagram Reel prototype: "Will California Fall Into the Ocean?" (Myth vs Fact 06)

Status: **editorially approved (2026-10-22); Instagram publication is a separate human step, URL to be added.** Account: @nexthugequake.
Approved file: `video/out/experiments/instagram/california-reel-final.mp4`, SHA-256 `ac068aa9a859fa8aa03b1c41ce9814c3e8e9ee2fc1c0f9466ee937f4ad8be57c`.
The YouTube original and its publication state are unchanged.
Source: the published YouTube Short <https://youtu.be/8Zke9Kf1128> (`video/out/edu/final/california-deified.mp4`, props `california-deified.props.json`). Not the cold open + loop variant.

Build (free, cached narration, no network): `cd video && npx tsx experiments/instagram/build.mts` (in a worktree, set `NHQ_MAIN_VIDEO` to the main checkout's `video/` path, which holds the git-ignored render and narration library). The final file is this render plus `volume=3dB` on the audio (ffmpeg from `@remotion/compositor`, video stream copied).
Output: `video/out/experiments/instagram/california-reel.mp4` (git-ignored), props beside it.

## What changed from the YouTube original

- Music removed (see licensing). Narration, captions, graphics, beats and synthesized SFX are the published ones.
- Closing "Like and subscribe" line, its captions and the LIKE/SUBSCRIBE card removed (YouTube-specific call to action). The video now ends about 1.5 s after "Southwestern California is moving north." (38.0 s vs 43.0 s); the map fades out on the last frames.
- `ep06.tsx` only gains an exported `CALIFORNIA_DEFINITION` (no behavior change); the Reel composition lives in `video/experiments/instagram/`.

## Licensing rationale

| Element | Status |
| --- | --- |
| "Deified" / "Reviver" (The Grey Room / Density & Time, YouTube Audio Library) | **Not demonstrably cleared for Instagram.** No license receipt or per-track terms are stored in the repo; Audio Library terms are per track and may be YouTube-only. Not used. |
| "Legendary" (Pixabay, Kulakovka) | Retired after a Content ID block; no license receipt. Not used. |
| "Summer Thyme" (Jeremy Korpas, YouTube Audio Library, kids) | Same gap as above. Not used. |
| Sound effects | Synthesized in-repo (`src/edu/sfx.ts`), no third-party material. No attribution needed. |
| Narration | ElevenLabs TTS (voice Daniel), cached clips, no new calls. Check the plan's commercial/social terms and Instagram's AI-content labeling before posting. |
| Map data | Natural Earth, public domain. |

Result: **narration + original SFX only.** To add music later, use a track whose license explicitly covers Instagram/social use and store the license page/receipt in the repo first.

## Attribution

No music credit needed. Caption/description should keep: USGS sources (FAQ and Earthquake Facts & Earthquake Fantasy), the "schematic illustrations" note, and Output.ai production credit if wanted (same as `california-deified.credits.txt`, minus the music line).

## Render checks (2026-10-22)

1080x1920, 30 fps, H.264 + AAC 48 kHz stereo, 38.02 s, 4.7 MB. SHA-256 `2d5b8bf07328c83670c0044fa64ac81110bb2bf146f4e42bc0950794bc0b5b3b`. Audio: peak -6.8 dBFS, mean RMS -24 dBFS (speech seconds about -22 to -20 dBFS; original with music: peak -6.2, RMS -23.7). Quieter than typical Reels loudness; an optional +3 to +4 dB gain stays under 0 dBFS.

## Pre-publication review (2026-10-22)

- **Final file:** `video/out/experiments/instagram/california-reel-final.mp4`: the render above with +3 dB audio gain (video stream copied, audio re-encoded AAC 256 kbps). 38.02 s, peak -3.8 dBFS, no clipping, speech seconds about -21 dBFS RMS. SHA-256 `ac068aa9a859fa8aa03b1c41ce9814c3e8e9ee2fc1c0f9466ee937f4ad8be57c`.
- **Narration/claims intact:** the 8 claim-carrying clips (hook to how) are byte-for-byte the published files with identical start, duration and gain; captions are the published first 14 of 16. Only the CTA clip and its 2 captions were removed. The 5.0 s difference is the CTA clip (4.34 s), the pause before it (0.88 s) and the tail now counted from the last claim line.
- **No music:** gaps with no sound (analysis, not a listen-through): 12.1-14.0 s and 24.6-26.2 s (scripted dramatic pauses, previously filled by the music bed), 36.0-38.0 s at the end. Sound effects carry the rest. Left as is; a synthesized room-tone or rumble bed is a possible fix if review finds it empty.
- **ElevenLabs plan: confirmed by the owner** (2026-10-22): the narration was generated under a paid subscription. The repo itself records only character usage, and the API key lacks `user_read`, so this is the owner's statement, not a repo check.
- **Caption:** keeps the AI-narration disclosure ("Narration is AI-generated"); set Instagram's AI label at publishing.

## Decisions (2026-10-22)

- **Approved:** the music-free version, including the three silent stretches, as reviewed.
- **Audio:** narration plus original synthesized sound effects, no music. No track is documented as cleared for Instagram; revisit only with a track whose license covers social use, stored in the repo first.
- **Disclosure:** the caption states the narration is AI-generated; also set Instagram's AI label when publishing.
- **Publication:** manual, by the owner. Instagram URL: _to be added_.
