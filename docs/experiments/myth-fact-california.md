# Myth vs Fact 06: "Will California Fall Into the Ocean?"

Status: **published 2026-10-21**: <https://youtu.be/8Zke9Kf1128> (manifest `video/publish/myth-california-ocean.json`).
Final: `video/out/edu/final/california-deified.mp4` + `california-deified.credits.txt` (1080x1920, 43.0 s, ElevenLabs Daniel narration, timed captions, "Deified" music, synthesized SFX; git-ignored). Silent preview: `video/out/edu/preview/california.mp4`.
Code: `video/src/edu/ep06.tsx` (episode, visuals), `ep06claims.ts` (claims, enforced by `ep06.spec.ts`), composition `MythCaliforniaOcean`.
Rebuild (free, cached audio): `cd video && npx tsx scripts/edu-batch.ts final --series=myth`.

## Sources (USGS only; read 2026-10-21)

- FAQ: <https://www.usgs.gov/faqs/will-california-eventually-fall-ocean> (no timeframe on this page)
- Earthquake Facts & Earthquake Fantasy: <https://www.usgs.gov/programs/earthquake-hazards/earthquake-facts-earthquake-fantasy>

## Claims

| Id | Claim | Per USGS | Lines |
| --- | --- | --- | --- |
| no | California will not fall into the ocean or be swept out to sea | FAQ: "nowhere for California to fall". Fantasy: "The ocean is not a great hole into which California can fall"; "absolutely impossible that California will be swept out to sea" | hook, fact |
| plates | The San Andreas Fault System is where the Pacific and North American plates meet | FAQ: California sits where two plates meet; fault system forms the boundary. The script never says California is on one plate | plates |
| sideways | The plates slide horizontally past each other | FAQ | slide |
| rate | Pacific Plate moves northwest relative to the North American Plate at about 46 mm/year | FAQ and Fantasy ("approximately 46 millimeters", about two inches) | rate |
| neighbors | At this rate Los Angeles and San Francisco will be next-door neighbors in about 15 million years | Fantasy only: "At this rate, Los Angeles and San Francisco will one day (about 15 million years from now) be next-door neighbors." A straight-line projection at today's rate, not a forecast | fact2, punch |
| southwest | Southwestern California is moving northward | Fantasy: "southwestern California is moving horizontally northward towards Alaska". Not stated for the whole state | how |

## Script (about 44 s planned)

1. **hook** Myth: California will fall into the ocean.
2. **fact** Fact one: there's nowhere for it to fall.
3. **plates** The San Andreas Fault System is where the Pacific and North American plates meet.
4. **slide** Those plates slide past each other, sideways.
5. **rate** Relative to the North American Plate, the Pacific Plate moves northwest about forty-six millimeters a year.
6. **fact2** Fact two: Los Angeles is moving in with San Francisco.
7. **punch** Well… in about fifteen million years.
8. **how** Southwestern California is moving north.
9. **cta** Like and subscribe to Next Huge Quake for more earthquake science. (approved line, in the narration library)

New narration: about 447 ElevenLabs characters (`edu-batch plan --series=myth`). Not requested.

## What changed from v1

- **Hook:** frame 0 flashes red and the MYTH card slams in word by word while the map behind it tips and slides toward the sea; FACT #1
  slams in with a green flash, strikes the myth through and snaps the map level. Reads with the sound off.
- **Second reveal:** FACT #2 "LA IS MOVING IN WITH SAN FRANCISCO", then the smaller "Well... in about 15 million years." The same map
  zooms in, a Los Angeles marker travels northwest along a dashed route beside the fault to San Francisco, labelled "SCHEMATIC ·
  ACCELERATED" with a 0 to 15 million years counter. It replaced the old "so someday" line and the closing wrap card, so runtime did not grow.
- **Pacing (old 10-33 s):** the map zooms 3.5 to 4.4 to 5.0 with a moving centre; plate arrows (Pacific northwest, North American the
  opposite way) appear with the reused strike-slip diagram; the rate card follows; labels and dots are larger for phones.
- **Ending:** the full-screen brand card is replaced by a compact NEXT HUGE QUAKE / LIKE / SUBSCRIBE row under the payoff; tail 1.2 s.
- **Wording:** "creeps" is now "moves"; "They won't sink it" is removed (the USGS pages do not discuss sinking); the 46 mm/year line
  states it is relative to the North American Plate; no line says California is on one plate.

## Remaining uncertainties for review

- **15 million years** is from the Fantasy page only and is a straight-line extrapolation ("at this rate"); the FAQ gives no timeframe.
  Plate motion is not guaranteed to stay constant. The preview says "about" and "schematic · accelerated".
- **"LA is moving in with San Francisco"** is a joke on the neighbours claim. The cities do not relocate: the land on the Pacific side of the
  fault carries Los Angeles northwest past the land holding San Francisco. The sources do not state which side each city is on, so the
  script and map do not either; the route is drawn schematically beside the fault, not along any surveyed path.
- **"Southwestern California is moving north"** is the Fantasy page's wording; "toward Alaska" is not used.
- **Strike-slip diagram** is the Historic-03 one (sepia palette, one sudden slip), which can read as an earthquake, not steady motion.
- **Fantasy page "Fiction/Fact" copy** is USGS's own but undated here; the USGS may revise it.
- Captions are placeholders; timings shift with real narration. Credits (`edu-batch final --series=myth`) are not exercised yet.

## Final render (2026-10-21)

- Narration: 8 new clips, 447 ElevenLabs credits (ledger `video/out/edu/credit-ledger-myth.json`); the CTA clip was reused from the library. Clips are cached in `assets/audio/edu/library/`, so re-rendering costs nothing.
- Verified: 43.0 s, 1080x1920, H.264 + AAC stereo; every clip starts at its planned beat (hook 0.4 s ... CTA 37.4-41.7 s), so visuals and voice line up; 16 timed phrase captions match the script text; per-second audio level shows narration and music throughout with dips only in the gaps between lines.
- Credits file: music, narration, SFX, Natural Earth, both USGS pages, a schematic-illustration note, and the Output.ai production-technology block. Terrain tiles are not used, so no Joerd block is needed.
- Not done: no human listen-through by the agent (levels and timing checked numerically and from stills only); no manifest, upload or schedule.
- Observation for review: during the CTA (about 39-44 s) the map has faded out and the upper half of the frame is empty, with only the FACT #2 card, captions and the compact CTA. Left unchanged as requested.
