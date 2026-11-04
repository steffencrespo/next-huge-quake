# EP 02 Oil Drilling: "We're Triggering Earthquakes. And We Know How." (local experiment credits)

**Status (2026-11-03):** final cut ready for the owner's review: `out/oil-drilling-cinematic-v1.mp4` (32.34 s, 1080×1920, 30 fps, 970 frames, h264 + AAC 48 kHz stereo, 30.3 MB, sha256 `f31fe8c4523b1489f871af4ca367c5b272ab4b78099a94a4820d375ef74f0cca`). Not uploaded, not scheduled, no commit, no PR. The TikTok edition waits for YouTube editorial approval.

- **Series:** "Can This Cause an Earthquake?", episode 2. A science Short, not breaking news. No earlier episode in `video/publish/` covers wastewater injection or Pawnee.
- **Composition:** `OilDrillingCinematic` (this folder). Render with `npx tsx experiments/oil-drilling-cinematic/render.ts [--final]`.
- **Narration:** ElevenLabs text-to-speech, voice Daniel (project voice `3WqHLnw80rOZqJzW9YRB`, `eleven_multilingual_v2`), fast-beats pacing. 12 new clips, 585 characters = 585 credits against an estimate of 585, with no rejected requests and no retries. Ledger: `video/out/edu/credit-ledger-oil-drilling-cinematic.json`. Ceiling: 650. Paced narration runs 0.2–30.53 s, so the video is about 32.3 s.
- **Images:** five AI stills by the owner (see the generation log) and a Natural Earth map for the Pawnee beat.
- **Music:** "Deified" by The Grey Room / Density & Time (YouTube Audio Library), default ducked mix.
- **Sound effects:** synthesized.

## Scientific verification (2026-11-03)

| Claim | Verdict | Source |
|---|---|---|
| M5.8, 3 Sep 2016, near Pawnee | **Confirmed and not revised:** M 5.8 mww, 2016-09-03 12:02:44 UTC, 14 km NW of Pawnee, depth 5.6 km | USGS ComCat `us10006jxs`, queried 2026-11-03 |
| Largest recorded in Oklahoma | Confirmed, and still the largest: a ComCat search of the Oklahoma area for M5.3+ since 1950 returns only this event and the M5.7 Prague 2011 (the box also takes in small parts of neighbouring states) | Yeck et al. 2017; ComCat |
| A pre-existing fault, previously unmapped | Confirmed: a previously unknown left-lateral strike-slip basement fault that intersects the Labette fault zone. Injection did not create it | Yeck et al. 2017; Chen et al. 2017 |
| Link to wastewater injection | **Supported, with hedged wording in the literature.** McGarr & Barbour: the sequence "appears to have been induced" by high-volume disposal within 10 km. Yeck et al.: "If this is, indeed, the case". Chen et al.: an interplay of injection, tectonic faults and foreshocks. Barbour et al.: varying injection rates may have mattered, and press coverage says the fault might have failed much later without them. "Linked" is accurate; "caused" or "proven" would not be | see Sources |
| Mechanism | Confirmed: fluid pressure travels from the injection interval to faults. Barbour et al. add poroelastic stress, so pressure is not the only contribution; "can increase pressure along faults" is a fair simplification | USGS Myths and Misconceptions; Barbour et al. 2017 |
| Not usually the drilling | Confirmed: disposal is the primary cause of the central US increase. Fracking is "not directly causing most" induced quakes; only 1–2% of Oklahoma earthquakes can be tied to it. Fracking can trigger felt quakes elsewhere (western Canada), so the screen limits the figure to Oklahoma | USGS Myths and Misconceptions; Bao & Eaton 2016 |
| Not every well | Confirmed: most injection wells are not linked to felt earthquakes | USGS Myths and Misconceptions |

**Narration correction (one):** "struck Pawnee, Oklahoma" became "struck **near** Pawnee, Oklahoma". The epicenter is 14 km NW of the town. The year and magnitude are spelled out for the voice ("twenty sixteen", "five point eight"), as the project does. The hook was split into two clips for timing. Nothing else changed.

**Left as approved, for your review:** "something unexpected" and "what most people get wrong" are editorial framing, not measured claims. Induced seismicity has been known for decades, so "unexpected" is the looser of the two.

**Added on screen for accuracy:**
- "Disposal well · not drilling · not to scale";
- "Pre-existing fault · already stressed";
- "Schematic · no plate moves". The fault in the image is a generic section; Pawnee itself slipped sideways (strike-slip);
- "Sep 3, 2016 · 14 km NW of Pawnee";
- "Appears induced · disposal within 10 km · McGarr & Barbour 2017";
- "Fracking: only 1–2% of Oklahoma quakes · USGS";
- "Not every well · most aren't linked to felt quakes · USGS".

**Change from the brief's storyboard:** AI-4 is not presented as Pawnee and carries no earthquake marker, because project policy forbids presenting an illustration as a specific real place (`docs/DECISION_LOG.md`, 2026-10-28). The real place is a Natural Earth map with the USGS epicenter during the Pawnee line; AI-4 follows on "Researchers linked…". The map data has no US state lines, so the map names Pawnee, Tulsa and Oklahoma City instead of drawing Oklahoma's border.

## Synthetic content
- **Stills:** five AI-generated by the owner in the ElevenLabs web UI; prompts in `PROMPTS.md`. Illustrations, not photographs and not footage of the 2016 earthquake. AI-2, AI-3 and AI-5 are schematic and not to scale.
- **On screen:** a small "AI VISUALIZATION" mark (top right, 20 px, 50% opacity) while an AI image is visible, hidden on the map. There is no large label.
- **When publishing:** set `containsSyntheticMedia: true`; add a description sentence: "Visuals are AI-generated illustrations; the underground scenes are schematic and not to scale."; turn on the Studio disclosure.

## Sources
- USGS ComCat event `us10006jxs` (Pawnee).
- USGS, [Myths and Misconceptions About Induced Earthquakes](https://www.usgs.gov/programs/earthquake-hazards/myths-and-misconceptions-about-induced-earthquakes) (read in full).
- Yeck, W. L., et al. (2017), "Oklahoma experiences largest earthquake during ongoing regional wastewater injection hazard mitigation efforts", *GRL*, doi:10.1002/2016GL071685 (abstract read).
- McGarr, A., & Barbour, A. J. (2017), "Wastewater Disposal and the Earthquake Sequences During 2016 Near Fairview, Pawnee, and Cushing, Oklahoma", *GRL*, doi:10.1002/2017GL075258 (abstract read).
- Chen, X., et al. (2017), "The Pawnee earthquake as a result of the interplay among injection, faults and foreshocks", *Scientific Reports*, doi:10.1038/s41598-017-04992-z (abstract read).
- Barbour, A. J., Norbeck, J. H., & Rubinstein, J. L. (2017), "The Effects of Varying Injection Rates in Osage County, Oklahoma, on the 2016 Mw 5.8 Pawnee Earthquake", *SRL* 88(4), doi:10.1785/0220170003 (USGS summary, search excerpt and the SSA press release; the full text was not read).
- Bao, X., & Eaton, D. W. (2016), "Fault activation by hydraulic fracturing in western Canada", *Science*, doi:10.1126/science.aag2583 (editor's summary; context only).
- Ellsworth, W. L. (2013), "Injection-induced earthquakes", *Science*, doi:10.1126/science.1225942 (USGS record only; general reference).

**Source access limits:** `usgs.gov/faqs/does-fracking-cause-earthquakes`, the "6 Facts" story and both `pubs.usgs.gov` pages in the brief returned 403 or 503 to automated requests. Their statements here come from search excerpts and from the USGS records and abstracts of the same work; 70188607 is Yeck et al. (confirmed by search). 70192465 could not be opened, so its identity is unconfirmed; the Oklahoma 2016 sequences are covered by McGarr & Barbour regardless.

## Generation log
| Asset | Model | Attempt | Credits | Accepted | Date |
|---|---|---|---|---|---|
| Narration (12 clips) | ElevenLabs TTS, Daniel, eleven_multilingual_v2 | 1 each | 585 (ledger) | yes, pending a listening review | 2026-11-03 |
| AI-1 to AI-5 | Prompted for GPT Image 2.5 Sunburst, ElevenLabs web UI (manual, owner), 720×1280 | owner | about 191 each at the last confirmed price, so about 955 in total; the exact figure and model were not reported, so confirm them in the ElevenLabs history | yes, approved by the owner | 2026-11-03 |

## Narration checks (2026-11-03)
- **Alignment and captions:** all 12 clips pass the pipeline's alignment validation; captions are in order and match the text.
- **Duration:** raw 1.31–6.01 s (limit 9 s); paced 30.33 s of narration in a 32.3 s video, inside the 30–40 s target.
- **Pronunciation:** "Pawnee", "Oklahoma", "wastewater" and "five point eight" have **not been checked by ear**. No speech-to-text is available (no local whisper model; the project key lacks that permission), and alignment only reflects the submitted text. This needs a listening review.
- **Backup:** checksummed copy of the 12 clips at `~/Backups/next-huge-quake/assets-audio-20261103-oil-drilling/` (local, not in Git); originals in `video/assets/audio/edu/library/`.

## Image integration (2026-11-03)
All five files are valid 720×1280 8-bit RGB PNGs, shown at 1080×1920. SHA-256 prefixes: AI-1 `b0b7c307`, AI-2 `2e728c5f`, AI-3 `3e28aafb`, AI-4 `de9cbaec`, AI-5 `348d9947`.
- **AI-1 (hook, twist):** moves from the storm sky down onto the pumpjacks from the first frame, with a brief tremor on "triggering". It returns darker and closer for "Not usually the drilling".
- **AI-2 (injection, "afterward"):** a tilt from the wellhead down the casing into the blue zone. Chevrons and pressure rings are pinned to the well and the porous layer. It returns tighter on the perforations.
- **AI-3 (mechanism):** pressure fronts and a dashed trace pinned to the image's seam; on "slip", a red trace, opposed arrows and a short jolt.
- **Map (Pawnee):** a move from North America to the USGS epicenter, with the marker, "M5.8" and "Sep 3, 2016 · 14 km NW of Pawnee". No AI mark here, since this is not an AI image.
- **AI-4 ("Researchers linked…"):** a slow push, labelled "Illustration · not Pawnee · not footage", with no earthquake marker.
- **AI-5 (closing):** "HUMANS CAN TRIGGER EARTHQUAKES" sits over the rock, because the image's ground line is at about 34% of the height (the prompt asked for about 62%) and the pumpjacks fill the sky on the left. The rock is darkened slightly behind the title.

**How the images differ from the prompts (approved by the owner; kept honest on screen):**
- AI-2's fluid is a bright blue patch, which could read as a pool. The note "Fluid fills pores in deep rock · not a cave" corrects that.
- AI-2's fault cuts sedimentary layers; the real Pawnee fault is in the basement. The scene is labelled "not to scale" and is not presented as Pawnee.
- AI-3's blue and amber tints are stylistic. The slip arrows are generic and labelled "Schematic · no plate moves"; Pawnee itself slipped sideways (strike-slip).
- The pumpjacks in AI-1 are production equipment, not drilling rigs. They set the oil-field scene; no drilling is shown.

## QA (2026-11-03, `scripts/verify-render.ts`; report in `video/out/oil-drilling-cinematic-v1-qa.md`, stills in `video/out/frames/oil-drilling-cinematic-v1/`)
- **Stream:** pass (h264 1080×1920, 30/1, 970 frames, 32.33 s; AAC 48 kHz stereo; container 32.34 s). Narration unchanged (0.2–30.53 s).
- **Blank frames:** 0. The minimum content share is 45%.
- **Frozen frames:** no exact-duplicate run of 6 or more frames. 5.8–6.3 s is near-still, because the hook's camera eases to rest; it is not a freeze.
- **Pop/flash candidates:** 17 frames, reviewed as intended. Frames 223, 240 and 7.3–8 s are the AI-2 tilt over textured rock (240 adds a caption change); 416–435 (13.9–14.5 s) are the scripted slip jolt and cut to red. Maximum mean frame difference 18.8 against a median of 2.3.
- **Script's "Stable" column:** fails only because it expects map diagnostics, which this render's log doesn't carry (the same as Taipei 101). That means the per-frame map diagnostics and marker drift were not measured; LiveMap still fails the render if a map frame isn't ready.
- **Audio:** peak −5.7 dBFS, RMS −21.9 dBFS, no clipped samples; the quietest half second is −30.8 dBFS, so no silent gaps.
- **Frames inspected:** 0.5, 5, 7, 8.9, 12.2, 14, 17.3, 20.5, 24.5, 26.8, 29 and 31.5 s. All text is inside the 72 px side margins, the top titles start below y 280, and nothing sits below the captions (1338–1472). The AI mark is 20 px at 50% opacity, top right, and hidden on the map.
- **Fixed during QA:** the "Deep beneath the oil fields" line break, the fault note's width, the closing title's size and position.
- **Not checked:** pronunciation by ear (no speech-to-text available), sync by ear, and playback on a phone. Captions follow the alignment. Two captions wrap with a short last line ("…sequence / to", "…amounts / of"); left as is, since it's cosmetic.

## TikTok edition (2026-11-03, `scripts/verify-render.ts`; report in `video/out/oil-drilling-tiktok-no-music-v1-qa.md`)
`out/oil-drilling-tiktok-no-music-v1.mp4`, music-free, with no new narration or images. Upload stays manual; caption and disclosure are in `tiktok-metadata.txt`.
- **Stream:** the same format and duration as the YouTube final (h264 1080×1920, 30/1, 970 frames, 32.33 s; AAC 48 kHz stereo), 30.7 MB, SHA-256 `86048f13…a830109d`.
- **Frames:** 0 blank; no exact-duplicate run of 6 or more; 0 near-still. 80 pop candidates, all intended (frames 202–263 well tilt, 415–437 slip jolt); maximum mean difference 18.35, median 1.97. The "Stable" column fails only because the log has no map diagnostics, as above.
- **Audio:** peak −5.7 dBFS, RMS −22.2, no clipped samples. All 12 narration clips sit at 0.0 ms lag against YouTube (correlation 0.959–0.998), within 0.4 dB. Music is gone: the gaps at 23.55–23.80 s and 27.68–27.98 s drop to −96.3 dBFS from −33.2 and −34.5, and the last 1.8 s is silent.
- **Safe zones (x 60–940, y 240–1440):** checked on mock-UI stills at 0.2, 1.9, 8.9, 12.2, 14, 18.5, 20.5, 24.5, 27 and 31.5 s; all text is inside. The still at 5 s was rendered but not viewed. The red and dashed fault trace, which isn't text, runs slightly below the safe area.
- **Fixed during QA:** the map now ends at zoom 7.6 so the Oklahoma City label clears the captions. The approved YouTube MP4 was re-hashed afterwards and is unchanged.
- **Not checked:** playback in the TikTok app.

## YouTube (2026-11-04)
- **Video:** [0fWQ3s-sbbg](https://youtu.be/0fWQ3s-sbbg), private until `publishAt` 2026-11-19T21:00:00Z (Thu 18:00 America/Sao_Paulo). The file is the owner-approved MP4, unchanged.
- **File hash:** `f31fe8c4523b1489f871af4ca367c5b272ab4b78099a94a4820d375ef74f0cca`, matched just before and after upload.
- **Slot:** the live queue had every Tue/Thu/Sat through 2026-11-17 taken, so 11-19 was the earliest free one. The only upcoming broadcast, `2xkA390l3y0`, has no scheduled time. The API exposes no notification limit, so that wasn't checked.
- **Read back from the API:** upload status `processed`, duration PT33S; title, description, tags, category, language, made-for-kids and the single membership in Earthquake Science Explained all match the manifest.
- **Not confirmed:** the API returned `containsSyntheticMedia` as undefined, so the altered-content flag is unverified. **In YouTube Studio:** Content → this video → Details → Show more → Altered content → select "Yes" if it isn't already, then Save. Check that the schedule still shows 19 Nov 2026, 18:00.
