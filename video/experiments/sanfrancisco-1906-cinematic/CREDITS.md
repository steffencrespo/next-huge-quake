# San Francisco 1906 Cinematic ("Less Than a Minute. Three Days of Fire.") — local experiment credits

**Status:** v3 approved by the owner and scheduled (2026-10-31).
- **YouTube:** `sf1906-cinematic-v3-youtube.mp4` (51.05 s, sha256 `71fa37518e49bd26…`) uploaded privately as [z3Xl9FJipb4](https://youtube.com/shorts/z3Xl9FJipb4), playlist Historic Earthquakes (`PLKnoffH2oH5s`), scheduled for 2026-11-15 18:00 America/Sao_Paulo (21:00 UTC). Manifest `video/publish/sanfrancisco1906-cinematic.json`; description credits `sf1906-cinematic-v3.credits.txt`.
- **TikTok:** `sf1906-cinematic-v3-tiktok.mp4` (47.51 s, sha256 `1149c3de73377c5a…`) scheduled manually by the owner for 2026-11-08 19:00 America/Sao_Paulo; recorded in `video/out/tiktok/inventory.json`.
- v1 (no Seedance) and v2 (first Seedance integration) were review cuts only.

- **Composition:** `Sf1906Cinematic` (this folder), with one `platform` prop (`youtube` | `tiktok`).
- **Render:** `npx tsx experiments/sanfrancisco-1906-cinematic/render.ts --platform=youtube|tiktok`.
- **Narration:** ElevenLabs text-to-speech (voice: Daniel, project voice settings, `eleven_multilingual_v2`), fast-beats pacing (Panama D4). 14 new clips (829 characters, about 829 credits) plus 2 reused from the narration library (the r2 "Just after five in the morning…" line and the CTA). Ledger: `out/edu/credit-ledger-sf1906-cinematic.json`. Owner ceiling: 1,700 credits.
- **Music:** YouTube only: "Deified" by The Grey Room / Density & Time (YouTube Audio Library). The TikTok export has no music; the owner adds music in TikTok Studio.
- **Sound effects:** synthesized for this video.

## Authentic photographs (National Archives, verified 2026-10-30)

All four come from Record Group 92, Records of the Office of the Quartermaster General, series "Photographs of the Aftermath of the San Francisco Earthquake" (NAID 522932), created by the War Department, Office of the Quartermaster General. The catalog lists each record with **Access: Unrestricted** and **Use: Unrestricted**, as read in each record's details on catalog.archives.gov.

The catalog's contributor field ("Haley, George Williford Boyce, 1925-") cannot be the 1906 photographer, so the credit names only the archive.

The masters are 2000 px wide grayscale TIFFs, downloaded unchanged. The PNGs beside them are lossless conversions made with `sips`, used for rendering.

| ID | NAID / local ID | Title (catalog) | Master | sha256 (TIFF) | Scene |
|---|---|---|---|---|---|
| AR-1 | 522933 / 92-ER-01 | Looking down Market Street from Third Street showing the approach of the fire | 2000×1492 | `ac33785ea3921adb17cb34740891884422e2693ad7a97607c0374a90c6773ebe` | Then came the fires |
| AR-2 | 522956 / 92-ER-24 | City Hall | 2000×1429 | `203e8875e4d47688b1fe0e7241d9148497be48608290cae755be16b6e92a3af0` | Death toll |
| AR-3 | 522952 / 92-ER-20 | General view from Nob Hill. Ruins of Hopkins Art Institute and Stanford's mansion in foreground | 2000×1405 | `aa206fc8ab23d5696e1a6c865049628e3b7a6c2ceb5827104b6aab69dbea5571` | 28,000 buildings |
| AR-4 | 522960 / 92-ER-28 | Jefferson Square refugee camp | 2000×1462 | `e78aad96f41e61559b31c22ecc1883f6568c78e13b4c1d3f9f72131906c62fe8` | Homeless |

**On screen:** each photograph appears as a framed print with the credit "NATIONAL ARCHIVES · <place>, 1906".

**Considered and not used:** Library of Congress items were not used because loc.gov serves a bot challenge that was not bypassed, so their rights statements could not be read at the source:
- Genthe, *Looking Down Sacramento Street*, cph.3c28020;
- City Hall ruins, LCCN 95504346;
- Lawrence airship view, LCCN 2007663888.

The National Archives series covers the same scenes with directly verified rights.

## Synthetic content (to generate, after approval)
- **Stills:** six AI-generated reconstructions (AI-1 to AI-6; prompts in `PROMPTS.md`) and one AI-generated video clip (SD-1, Seedance 1.5 Pro, 4 s, animated from AI-2; generated manually by the owner, 287 credits). They are illustrations, not photographs or footage of 1906.
- **On screen:** only a small, translucent "AI RECONSTRUCTION" mark (top right, 20 px, 50% opacity) while an AI shot is visible, per the decision log convention. No large label.
- **Map:** the rupture map is an original illustration (Natural Earth land, public domain), and its fault trace is approximate and schematic.

## Sources (narration; also mapped line by line in `script.ts` FACTS)
- **USGS, The Great 1906 San Francisco Earthquake** (https://earthquake.usgs.gov/earthquakes/events/1906calif/18april/):
  - foreshock "at almost precisely 5:12 a.m." and the main shock "some 20 to 25 seconds later";
  - strong shaking "some 45 to 60 seconds";
  - "the northernmost 296 miles (477 kilometers) of the San Andreas fault";
  - 700 deaths frequently quoted, believed to be underestimated "by a factor of 3 or 4".
- **USGS, Casualties and Damage** (https://earthquake.usgs.gov/earthquakes/events/1906calif/18april/casualties.php):
  - "3-day conflagration";
  - 28,188 buildings destroyed; burned district 4.7 square miles;
  - 225,000 homeless "from a population of about 400,000";
  - one estimate of over 3,000 deaths (Hansen and Condon).
- **USGS ComCat:** M7.9.
- **USGS historic page on made land:** the business district built on fill in the cove of Yerba Buena, with buckled and fissured pavements and broken sewer and water mains (https://webarchive.library.unt.edu/web/20080916024702/http://earthquake.usgs.gov/regional/states/events/1906_04_18.php).
- **NPS, 1906 Earthquake: Fire Fighting** (https://home.nps.gov/prsf/historyculture/1906-earthquake-fire-fighting.htm):
  - water and gas mains ruptured; leaking gas "the catalyst for fires"; lack of water made firefighting a challenge;
  - Army dynamite firebreaks (General Funston, Captain Le Vert Coleman, Van Ness Avenue);
  - "the debate over whether dynamiting caused or prevented significant damage continues today";
  - "three days of destruction".
- **The lesson line** is an editorial conclusion drawn from the documented water-main failures.

## Disclosure when publishing
- **YouTube:**
  - `containsSyntheticMedia: true` in the manifest and sent on upload. The Data API does not return the field, so YouTube Studio's altered or synthetic content setting still needs an owner check (unverified, 2026-10-31).
  - Description (as uploaded): "This cinematic reconstruction combines authentic photographs from the U.S. National Archives with AI-generated historical illustrations. AI-generated scenes are not authentic footage from 1906." The credits file lists the National Archives records and the AI tools.
  - Credits file with the narration, music, archival and AI lines above.
- **TikTok:**
  - Turn on "AI-generated content" in TikTok Studio before posting.
  - Caption sentence: "Color scenes are AI-generated reconstructions; the black-and-white photos are authentic, from the U.S. National Archives."
  - No YouTube CTA or music is in the file; add music in TikTok Studio.

## Generation log
| Asset | Model | Attempt | Credits charged (from UI) | Accepted | Date |
|---|---|---|---|---|---|
| Narration (14 clips) | ElevenLabs TTS, Daniel, eleven_multilingual_v2 | 1 each | 829 (ledger `out/edu/credit-ledger-sf1906-cinematic.json`; no rejected requests) | yes | 2026-10-30 |
| AI-1 to AI-6 | GPT Image 2.5 Sunburst, ElevenLabs web UI (manual, owner), 720×1280 PNG | 1 each | 191 each = 1,146 (owner-confirmed price) | yes, editorially approved | 2026-10-30 |
| SD-1 | Seedance 1.5 Pro, ElevenLabs web UI (manual, owner), image-to-video from AI-2; 4.04 s, 720×1280, 24 fps; sha256 `2ba19727c4130429…` | 1 | 287 (owner-confirmed price) | yes (editor: usable; shaking modest, slight architectural drift) | 2026-10-30 |
| AI-1 (earlier) | gpt-image-2.5-sunburst (API) | refused before generation: API key lacks `image_video_generation` permission (HTTP 401) | 0 expected (no generation was created) | — | 2026-10-30 |
