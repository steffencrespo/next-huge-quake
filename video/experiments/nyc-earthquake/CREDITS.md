# A MASSIVE EARTHQUAKE IN NYC?! Myth or Fact? — local experiment credits

Status: v1 approved by the channel owner (2026-10-29). Uploaded privately as https://youtu.be/8sC9YYxBnIc in Earthquake Science Explained,
scheduled public for 2026-11-14 18:00 America/Sao_Paulo (21:00 UTC). Companion to `experiments/nyc-tsunami` (UiOPJ3SjXSA, 2026-11-12).
Manifest `publish/nyc-earthquake.json`; description credits `nyc-earthquake-v1.credits.txt`. `containsSyntheticMedia: true` was sent on upload and
schedule; the API does not return it on read-back, so the disclosure toggle is not yet confirmed in Studio (same as earlier synthetic-media Shorts).
MP4 `out/nyc-earthquake-v1.mp4`: 59.01 s, 1,770 frames, 1080×1920 h264 30 fps, AAC 48 kHz stereo, 46,370,829 bytes,
sha256 4f72563fa12c75e57c12f007fb43238ccc04454ebffb6c3de0cde275b0133e11. `scripts/verify-render.ts` (report `out/nyc-earthquake-verify.md` in
video/out): stream pass, 1770/1770 map frames ready, 0 map errors, 0 context losses, 0 blank frames, marker drift 0 px; pop candidates only at the
intended shake jolts (0–0.8 s, 2.6–3.5 s, 13.4 s) and the 8.7 s card pop. Audio: peak −6.5 dBFS, narration clips −19.9 to −22.6 dB RMS, music bed
−30 to −37 dB in pauses, no silent 100 ms window.

Composition: `NycEarthquake` (this folder). Data: `npx tsx experiments/nyc-earthquake/fetch.ts` (read-only USGS) → `data.json`.
Narration: `npx tsx experiments/nyc-earthquake/audio.ts [plan|generate --budget=…|build]`. Render: `npx tsx experiments/nyc-earthquake/render.ts` → `out/nyc-earthquake-v1.mp4`.
Narration: ElevenLabs text-to-speech (voice: Daniel, voice id 3WqHLnw80rOZqJzW9YRB, the same as nyc-tsunami, `eleven_multilingual_v2`), fast-beats
pacing (Panama D4). 18 clips, 1,032 characters billed per `out/edu/credit-ledger-nyc-earthquake.json` (budget cap 1,100), no rejected requests, no
retries; no line was already in the shared narration library. Music: "Deified" by The Grey Room / Density & Time, YouTube Audio Library.
Sound effects: synthesized for this video.

## Synthetic content
The four stills in `assets/images/nyc-earthquake/` (disaster scene, 1884 street, brick row houses, calm Manhattan) were generated in ElevenLabs and
approved by the owner. They are used unchanged (staged into public/ at render time, upscaled 1.5× from 720×1280 by the renderer). On screen, a
small translucent watermark (top-left, 20 px, 50 %) per the editorial convention in docs/DECISION_LOG.md: "AI VISUALIZATION · HYPOTHETICAL" on the
disaster still, "AI VISUALIZATION · HISTORICAL RECONSTRUCTION" on the 1884 still, "AI VISUALIZATION · ILLUSTRATIVE" on the brick buildings and
"AI VISUALIZATION" on the calm city. The vulnerability cards on the brick still carry citywide figures labelled as such, not a claim about the
pictured block. When publishing: `containsSyntheticMedia: true`, the disclosure sentence in the description and credits, and Studio disclosure.

## Sources (verified 2026-10-29)
- USGS event us7000ma74 (FDSN event service, fetched into `data.json`): M4.8 Mwr, 2024-04-05 14:23:20 UTC, Tewksbury, N.J., 40.6963 N 74.7596 W,
  depth 2.6 km, reviewed; Did You Feel It? 184,674 responses, max CDI 5.4; PAGER green. DYFI 10 km cells (2,834) from the DYFI product.
- Boyd et al. 2024, "Preliminary observations of the April 5th, 2024, Mw4.8 New Jersey earthquake", The Seismic Record 4(4) 240–250 (USGS,
  https://pubs.usgs.gov/publication/70259320): about 65 km west of New York City; felt by millions from Virginia to Maine; "the largest number
  (>180,000) of USGS 'Did You Feel It?' reports of any earthquake"; substantial damage to a historic masonry building in Lebanon, N.J.
- NYC Emergency Management, NYC's Risk Landscape, Chapter 4.8: Earthquakes
  (https://www.nyc.gov/assets/em/downloads/pdf/hazard_mitigation/nycs_risk_landscape_chapter_4.8_earthquakes.pdf): the 1884-08-10 earthquake
  "thought to have originated somewhere between Brooklyn and Sandy Hook, New Jersey", "estimated to have been a 5.2 magnitude earthquake" from
  damage reports, felt from Virginia to Maine, damaged chimneys and brick buildings in New Jersey and New York City; over 100,000 multi-family
  unreinforced brick buildings, mostly 3–7 stories, built mid-1800s to 1930s; most buildings built before the 1995 seismic code; high-rises less
  vulnerable than low-rise buildings; soil amplification over shallow bedrock; liquefaction could disrupt underground utilities; aging
  infrastructure; "low probability of large-magnitude earthquakes".
- NYC Hazard Mitigation Plan, Earthquakes hazard profile (https://nychazardmitigation.com/documentation/hazard-profiles/earthquakes/): "the latest
  USGS maps, released in 2023, show that there is a 5 to 25 percent chance of a slight or damaging earthquake occurring in the New York City area
  over a 100-year period". The page is behind a bot challenge that was not bypassed; the wording was read from two independent search-engine
  snapshots of the page. Re-open it before publication.
- USGS data release (Petersen et al. 2023, https://doi.org/10.5066/P9GNPCOD), "Chance of potentially damaging ground shaking (MMI=VI) in 100 years,
  based on the 2023 update to the National Seismic Hazard Model": defines what the 5–25 % means — the chance that a site experiences shaking of
  Modified Mercalli intensity VI or stronger (strong shaking; slight damage possible) within 100 years, averaged from PGA- and 1.0 s-based
  probabilities with slope-based Vs30. Independent cross-check with the USGS NSHM 2023 hazard web service (conus-2023, Midtown Manhattan,
  Vs30 760 m/s): PGA exceeding 0.085–0.116 g (MMI 5.5–6.0 by the Worden et al. 2012 conversion; PGA only, an order-of-magnitude check) has a 14.5–20.5 % chance in 100 years — inside 5–25 %.
- Map: Natural Earth land (public domain), MapLibre GL globe.

## Factual adjustments to the approved script
- "In 1884, a magnitude 5.2 earthquake shook New York" → "an earthquake estimated at magnitude five point two": 5.2 is NYC Emergency
  Management's estimate from damage reports (the older USGS historic page lists 5.5); no instrument recorded it. The 2024 card says
  "Measured by seismometers · USGS" to make the distinction visible.
- "damaging chimneys and brick buildings" → its own sentence, "in New York and New Jersey" (as documented).
- "over 180,000 reports — a nationwide record" → "more than one hundred eighty thousand reports, the most for any earthquake", the USGS paper's
  wording (a Did You Feel It? record, not a national record of any other kind).
- "points to a real chance of damaging earthquake shaking over the next hundred years" → the precise figure, now verified: "New York City's
  official hazard plan cites USGS maps: a five to twenty-five percent chance of potentially damaging shaking in the next hundred years." On screen:
  NYC area · next 100 years · intensity VI or stronger · a hazard estimate, not a forecast.
- "And the danger isn't just to skyscrapers" → "And the biggest danger isn't the skyscrapers": NYC EM says high-rises are less vulnerable than
  low-rise buildings, so the stronger line is also the accurate one.
- "Older brick buildings, underground infrastructure, and vulnerable ground conditions could turn…" split in two lines (clip limit):
  "older brick buildings, aging underground infrastructure, and soft ground" / "They could turn a moderate earthquake into a costly urban disaster."
- "So, could a major earthquake hit New York? Yes." → "could a damaging earthquake hit New York? Yes.": "major" means M7+ in USGS usage, which
  would contradict the next line. No probability is given for an M7, and nothing implies an imminent event.
- Numbers are spelled out for the voice (project convention). Hook and ending kept as approved.

## Compromises
- The 1884 reconstruction still shows a large rubble pile from a collapsed facade, heavier than the documented damage (chimneys, damaged brick
  buildings). It is approved and used unchanged, but only while the damage line plays, under a "HISTORICAL RECONSTRUCTION" watermark and a card
  stating the documented damage. Editorial may want to judge whether it overstates.
- The 1884 location is drawn as a schematic dashed ellipse spanning Brooklyn–Sandy Hook, labelled "APPROXIMATE AREA · EXACT LOCATION UNKNOWN";
  it is not a computed uncertainty region.
- No shaking-intensity map: the DYFI cells are drawn as uniform yellow dots (merged into a 0.4° grid to keep the per-frame map diagnostics small;
  size grows with response count), revealed in a fixed shuffle so they do not read as a propagating wave. The footer says "DYFI response areas,
  not a shaking map".
- The "NYC area" ring for the 5–25 % figure is schematic (about 25 km around lower Manhattan); the USGS value varies with site and soil.
- The counter shows 184,674 (USGS event page today) while the narration says "more than 180,000" (the paper); both are consistent.
- Natural Earth 1:10m coastlines are coarse at city zoom (z 9); acceptable for the approximate-area framing, not street-accurate.
- The NYC Emergency Management PDF opened from nyc.gov; the NYC Hazard Mitigation Plan site did not (bot challenge), see Sources. Rechecked before
  upload (2026-10-29): still blocked; the USGS NSHM 2023 rock-site check (PGA 14.5–20.5 %, 1.0 s SA 4–7 %, average ~10–14 % in 100 years) stays
  inside 5–25 %, so the attributed figure was kept.
