# Oct 26 / 28 / 30 Shorts (render for review)

Status: rendered for human review, **not approved, not uploaded, not scheduled**. Intended slots: Mon 2026-10-26, Wed 10-28, Fri 10-30 (outside the Tue/Thu/Sat cadence, so each needs a separately approved schedule exception like the SIX SEVEN release).
Code: `video/src/edu/ep07.tsx` (`MagnitudeTen`), `ep08.tsx` (`SixSevenVsFourTwo`), `ep09.tsx` (`WhyAftershocks`), claims in `octClaims.ts`, checked by `oct.spec.ts`. Render: `npx tsx scripts/edu-batch.ts final --series=oct` (fast-beats, Deified). Narration: 1,425 ElevenLabs characters, one request per line, ledger `out/edu/credit-ledger-oct.json`.

| Video | Slot | Length | File (git-ignored) |
|---|---|---|---|
| Can a Magnitude 10 Earthquake Actually Happen? | 10-26 | 35 s | `video/out/edu/final/mag10-deified-fast-beats.mp4` |
| SIX SEVEN vs FOUR TWO: The Earthquake Difference | 10-28 | 20 s | `video/out/edu/final/versus-deified-fast-beats.mp4` |
| Why Do Aftershocks Keep Happening? | 10-30 | 35 s | `video/out/edu/final/aftershocks-deified-fast-beats.mp4` |

Each MP4 has a `.credits.txt` next to it (music, narration, sources, illustration disclosure, Output.ai block).

## Duplication check
- **SIX SEVEN: Earthquake Edition (10-25)** uses bouncing numerals, Northridge 1994 and the 70 cm mountain lift. This one has no real event, a versus split and a 5,600-dot grid.
- **Magnitude 6 vs 7** explains the log scale, 10x amplitude, 32x energy and damage. This one only states one ratio (6.7 vs 4.2) and shows it.
- **Chile 1960 (10-27)** is only teased ("Tomorrow, we revisit...") by the magnitude 10 Short.

## Sources (USGS pages read 2026-10-22)
See `octClaims.ts` for line-by-line claims. Pages: megaquake FAQ, magnitude/energy page, "Foreshocks, aftershocks - what's the difference?", "aftershocks and swarms".

## Attention items
1. **5,600x is approximate.** USGS states about 32x energy per whole step (10^1.5), which gives 5,623 for 2.5 steps. The USGS rough formula log E = 5.24 + 1.44 Mw gives about 4,000. The script says "about" and the screen shows the 10^(1.5 x 2.5) arithmetic.
2. **USGS wording on magnitude 10 differs.** The FAQ says it "cannot happen"; other pages say theoretically possible but very highly unlikely. The script says "very unlikely" and "isn't something scientists expect", never impossible.
3. "Tomorrow" in the magnitude 10 Short is only correct if it publishes 10-26 and Chile 1960 on 10-27.
4. "Especially in buildings already weakened" (aftershocks) is from USGS search summaries; the fetched FAQ page only says aftershocks "can compound the impacts of a major earthquake".
5. Earth circumference (about 24,900 mi) in the magnitude 10 ring is a general reference value, not from the USGS pages.
