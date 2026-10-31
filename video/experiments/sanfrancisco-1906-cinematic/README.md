# San Francisco 1906 Cinematic (scheduled: YouTube 2026-11-15, TikTok 2026-11-08)

"Less Than a Minute. Three Days of Fire." is a fire-centred 1906 Short. It shares one composition (`Sf1906Cinematic`) and produces two exports:

| | YouTube | TikTok |
|---|---|---|
| Narration | same 15 factual lines | same 15 factual lines |
| CTA | cached Like/Subscribe line and card, only after the lesson line ends | none |
| Music | Deified | none (a silent WAV is staged and the music layer is muted); added later in TikTok Studio |
| Ending | CTA card | 1.6 s after the lesson, last 0.5 s fades to black |

The final shot's move is timed to the lesson line, not the CTA, so it is identical in both exports.

## Steps (gates in bold)
1. `npx tsx experiments/sanfrancisco-1906-cinematic/audio.ts plan`: free. Lists new and reused lines, characters, preflight result and sources.
2. **Owner approves the narration spend**, then `audio.ts generate --budget=<credits>`: paid.
   - One request per missing line, stopping at the first failure; there are no automatic retries.
   - The budget must cover ledger + estimate and may not exceed the 1,700-credit ceiling.
3. `audio.ts build`: free. Paces the clips (fast-beats) and writes `audio.json`.
4. **Owner approves the exact image and video credit cost** (shown in the ElevenLabs UI), then generates AI-1 to AI-6 and then SD-1 from the approved AI-2, using `PROMPTS.md`.
   - 1 attempt each.
   - Save the files under `assets/ai/` and `assets/video/` with the names in `assets.ts`.
   - Log the credits in `CREDITS.md`.
5. `render.ts --platform=youtube` and `render.ts --platform=tiktok`: free and local.
   - Before step 3, use `--preview` (silent, storyboard timing) or `--still=<seconds>`.
   - Missing assets render as labelled placeholders.
6. QA both exports (narration identical, TikTok music-free and CTA-free, no black or frozen frames, ending), then review. **Publishing is a separate approval.**

## Files
- `script.ts`: the approved lines, the CTA, and the FACTS source map.
- `assets.ts`: the asset manifest.
- `Cinematic.tsx`: the composition.
- `Root.tsx`, `index.ts`: Remotion entry.
- `audio.ts`: the narration workflow.
- `render.ts`: staging and rendering.
- `PROMPTS.md`: generation prompts.
- `CREDITS.md`: sources, rights, disclosures and the generation log.
- `assets/archival/`: four National Archives masters (rights verified) plus PNG copies.
- `out/`: renders, git-ignored by `video/.gitignore`.

## Publication (2026-10-31)
- **YouTube:** v3 YouTube cut, [z3Xl9FJipb4](https://youtube.com/shorts/z3Xl9FJipb4), private until 2026-11-15 18:00 America/Sao_Paulo (21:00 UTC). Historic Earthquakes playlist. Published with `npm run youtube:publish` (approve → upload → schedule → inspect) from `video/publish/sanfrancisco1906-cinematic.json`, Sunday `scheduleException` approved by the owner.
- **TikTok:** v3 TikTok cut, scheduled by the owner in TikTok Studio for 2026-11-08 19:00 America/Sao_Paulo.
- **Not in Git:** renders (`out/`), AI assets, Seedance clip and archival masters stay local. See `CREDITS.md` for checksums and sources.
