# SIX SEVEN: Earthquake Edition (prototype)

Status: v2 render for human review. Not approved, not published. Backlog entry: `docs/ROADMAP.md`, "Editorial backlog".
Renders (git-ignored): v1 `video/out/edu/final/six-seven.mp4` (no voice, 14.6 s), v2 `video/out/edu/final/six-seven-v2.mp4` (Daniel narration, 17.9 s). Code: `video/src/edu/sixseven.tsx`, `sixsevenScript.ts`, `video/scripts/six-seven-narration.ts` (paid, single attempt per line) and `render-six-seven.ts`.

**Hypothesis (untested):** a recognizable meme hook may reach viewers who would not watch earthquake science.

## v2 narration (approved 2026-10-22; Daniel, fast-beats, 249 ElevenLabs characters billed, 7 requests, no retries)
1. Six seven!
2. Okay, but magnitude six point seven? That's no joke.
3. In 1994, a real one hit Northridge, California.
4. A hidden fault ruptured deep underground.
5. The Santa Susana Mountains rose by up to seventy centimeters.
6. Six seven? The mountains said…
7. Seventy!

Line 6 and 7 are separate clips with a 0.95 s declared pause between them for the comic beat. The voice uses the project's default voice settings, so the "Seventy!" emphasis comes from the text, the pause, the slam, the screen shake and the boom, not from voice tuning. v2 simplifies the diagram to a side view where the mountain lifts off a dashed original outline, and marks the switch from the meme to the real event with a "A REAL ONE · NORTHRIDGE, CALIFORNIA · January 17, 1994" badge and a cooler colour scheme. The 17.5 km depth is no longer stated (v2 says "deep underground"); the 70 cm claim stays "up to" and refers to the Santa Susana Mountains only.

## Structure of v1 (14.6 s, no voice)
1. 0.0 s: "SIX SEVEN!" with the two numerals bouncing in alternation (no meme audio; original tick effects).
2. 1.25 s: the numerals merge into "6.7"; "MAGNITUDE 6.7? THAT'S NO JOKE." with a seismograph line and the label "NOT A REAL EARTHQUAKE · JUST THE NUMBER".
3. 4.4 s: one real fact (below), shown as a labelled schematic cross-section.
4. 10.5 s: punchline "SIX SEVEN? THE MOUNTAINS SAID SEVENTY (centimeters, at most)", then "Magnitude is a measure. Not a meme."

Distinct from "Magnitude 6 vs 7": that episode explains the logarithmic scale and shallow-versus-deep damage; this one uses the number as a hook and a single fact about what a real M6.7 did to the ground. No claim here concerns energy ratios.

## Fact and sources (checked against USGS pages on 2026-10-21)
- The 1994 Northridge, California earthquake was magnitude 6.7 (17 January 1994). USGS event page <https://earthquake.usgs.gov/earthquakes/eventpage/ci3144585>; USGS Science paper "The magnitude 6.7 Northridge, California, earthquake of 17 January 1994" <https://www.usgs.gov/publications/magnitude-67-northridge-california-earthquake-17-january-1994>.
- It "began as a rupture on a hidden fault at a depth of about 17.5 kilometers" (USGS Open-File Report 96-263) <https://pubs.usgs.gov/of/1996/ofr-96-0263/mainshk.htm>. Other USGS sources give slightly different depths (18.2 km on the event page), so the video says "about" and the label reads "≈ 17.5 KM DEEP".
- The earthquake "raised the Santa Susana mountains by as much as 70 centimeters" (the USGS Science paper abstract, <https://pubs.usgs.gov/publication/70017610>). 70 cm is about 2.3 feet.
- Not claimed: that the fault was previously unknown (the USGS pages say "hidden" and "concealed", not "unknown"); casualties or damage (a real disaster, not a joke).

## Disclosures and licensing
- The cross-section is schematic: not to scale, rise exaggerated (labelled on screen). The 6.7 opener is a number, labelled as not a real earthquake.
- Music: "Reviver" by The Grey Room / Density & Time, YouTube Audio Library. Sound effects: synthesized for this video. No meme audio, no third-party footage.

## Open items
- Credits file and manifest are not prepared. The publisher would need them, plus the music credit and the USGS sources.
