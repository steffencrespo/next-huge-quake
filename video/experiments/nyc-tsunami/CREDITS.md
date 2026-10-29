# NEW YORK WIPED OUT BY A TSUNAMI?! — local experiment credits

Status: v1 approved by the channel owner (2026-10-29). Uploaded privately as https://youtu.be/UiOPJ3SjXSA in Earthquake Science Explained,
scheduled public for 2026-11-12 18:00 America/Sao_Paulo (21:00 UTC). Manifest `publish/nyc-tsunami.json`; description credits `nyc-tsunami-v1.credits.txt`.
MP4 sha256 de815e6d72ac0ee86f18959dc1191422bc519a3e21d0cefeb5c146021171ba67 (43,391,353 bytes). `containsSyntheticMedia: true` was sent on upload and
schedule; the API does not return it on read-back, so the disclosure toggle is not yet confirmed in Studio (same as earlier synthetic-media Shorts).

Composition: `NycTsunami` (this folder). Render: `npx tsx experiments/nyc-tsunami/render.ts` → `out/nyc-tsunami-v1.mp4`.
Narration: ElevenLabs text-to-speech (voice: Daniel, project voice settings, `eleven_multilingual_v2`), fast-beats pacing (Panama D4).
15 clips, 896 characters billed per `out/edu/credit-ledger-nyc-tsunami.json`, no rejected requests; clips in the shared narration library.
Music: "Deified" by The Grey Room / Density & Time, YouTube Audio Library. Sound effects: synthesized for this video.

## Synthetic content
The four stills in `assets/images/nyc-tsunami/` (monster wave, Statue of Liberty, flooded Manhattan, calm Manhattan) were generated in
ElevenLabs (GPT Image 2.5 Sunburst) and approved. They are AI illustrations of a hypothetical scenario, not photographs or footage of any real
event. On screen: a small translucent "AI VISUALIZATION · HYPOTHETICAL" watermark (top-left) on the three disaster stills, "AI VISUALIZATION" on
the calm city, per the editorial convention in docs/DECISION_LOG.md. When publishing: `containsSyntheticMedia: true`, a disclosure sentence in
the description and credits, and Studio disclosure. The stills are 720×1280 and are upscaled 1.5× to 1080×1920 at render time (originals unchanged).

## Sources (verified 2026-10-29)
- NOAA NCEI, "On This Day: 1929 Grand Banks Tsunami" (https://www.ncei.noaa.gov/node/7051): magnitude 7.2; about 250 km south of Newfoundland;
  sediment on the Laurentian slope broke loose in an underwater landslide that generated the tsunami; 28 lives lost; recorded on tide gauges as
  far away as Charleston, South Carolina, and also in the Azores and on the west coast of Portugal. Deaths on the Burin Peninsula.
  Epicenter plotted at 44.69 N, 56.00 W (NOAA NCEI significant earthquake database).
- USGS Hawaiian Volcano Observatory, Volcano Watch, "The Canary Islands 'mega-tsunami' hypothesis, and why it doesn't carry water" (2021-10-21,
  https://www.usgs.gov/center-news/volcano-watch-canary-islands-mega-tsunami-hypothesis-and-why-it-doesnt-carry-water): collapses occur in an
  incremental or piecemeal fashion; La Palma's flank appears stable; updated worst-case modelling gives about 1–2 m on the Americas' east coast.
- NOAA / USGS, U.S. States and Territories National Tsunami Hazard Assessment (Dunbar & Weaver 2008, update 2015,
  https://pubs.usgs.gov/publication/70159744) as summarized by the NTHMP: U.S. Atlantic coast hazard "very low to low".
- Map: Natural Earth land (public domain), MapLibre GL globe.

## Factual corrections to the approved script
- "a very low tsunami hazard — not zero" → "Scientists rate the Atlantic coast's tsunami hazard as low. But not zero." The NOAA/USGS rating is
  "very low to low"; "very low" alone understated the upper end.
- "Scientists have largely rejected that nightmare scenario" → "USGS scientists say that nightmare scenario doesn't hold up." Attributed to the
  USGS, whose position is clear; some researchers (e.g. the 2001 paper's authors) still dispute it, so "largely rejected" was softened to an attributed statement.
- "near Newfoundland" → "off Newfoundland" (about 250 km south of it). The 1929 sentence and the deaths/reach sentence were each split in two to
  stay under the 9 s clip limit; numbers are spelled out for the voice (project convention). Magnitude 7.2, 28 deaths and the South Carolina reach
  were confirmed unchanged.

## Compromises
- No archival photographs: no 1929 image with a clear licence was found in NOAA/USGS sources during this pass, and downloading third-party
  archive files was not done. Section 5 of the brief (historical destruction photos) is therefore omitted; the map carries the history.
- No wave heights are drawn anywhere. Routes to tide gauges, the slide swath and the La Palma arc are labelled schematic.
- The USGS 1–2 m worst-case La Palma figure is not shown on screen (it is a wave-height graphic); it stays in these notes.
