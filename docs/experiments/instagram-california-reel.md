# Instagram Reel prototype: "Will California Fall Into the Ocean?" (Myth vs Fact 06)

Status: **prototype, awaiting editorial review. Not published anywhere.** Account: @nexthugequake.
Source: the published YouTube Short <https://youtu.be/8Zke9Kf1128> (`video/out/edu/final/california-deified.mp4`, props `california-deified.props.json`). Not the cold open + loop variant.

Build (free, cached narration, no network): `cd video && npx tsx experiments/instagram/build.mts`
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
