# Hook D: opening-hook experiment (approved, not in production)

Hybrid of A (red, urgent, immediate 6.0 + VANUATU) and B ("EARTHQUAKE REPORTED" framing). ~5 s, 1080x1920.
Reference event: Vanuatu M6.0, USGS us6000u3bc. Preview: `HookD-preview-vanuatu-us6000u3bc.mp4`.

Status: standalone experiment. The production pipeline, QuakeNews composition and default opening are unchanged.
Nothing here is wired into render-package or the publisher. Not yet validated with audience metrics.

Files
- `Hooks.tsx`: HookA, HookB, HookC (discarded) and **HookD** (`export const HookD`). Reuses src/ chrome, copy, terrain map, fonts.
- `Root.tsx` / `entry.tsx`: separate Remotion entry (does not touch src/Root.tsx).

Use for the next real earthquake (clip only)
1. Produce the normal package/render inputs so `out/videos/<eventId>/props.json` exists (spec + soundtrack).
2. Terrain tiles for the event must be prepared (`npm run prepare:terrain -- <spec.json>`). HookD samples the production
   camera at frames 0-~195 on whole frames, so those tiles are enough; a custom camera needs new tiles.
3. Copy audio into the git-ignored `public/audio/`: narration as `exp-vanuatu-narration.mp3`, music as `exp-deified.mp3`
   (or edit the two `staticFile` names in `Sound`).
4. In `Hooks.tsx` change the `props.json` import to the new event, and set the narration excerpt in `HookD`
   (`<Sound voice={{ from, to, at }} />`, seconds, from `out/audio/<id>/soundtrack.json` captions; current 0-4.8 s ends mid-phrase).
   Place text is derived from the last comma segment of `event.place` (check it reads well, e.g. not a coordinate place).
5. Render: `cd video && npx remotion render experiments/hooks/entry.tsx HookD out/<name>.mp4 --gl=angle`

Using it in a full Short is NOT done: the clip replaces only the first ~5 s visually, so it needs to be integrated into
QuakeNews (hook scene + timing, audio offsets, captions). That is pipeline work, to be decided after audience data.
The full video must still carry the complete attribution block (terrain + music credits); this clip does not.

Known rough edges: red wash dims chrome for the first ~1 s; no captions; narration cut mid-sentence; quick punch/flash
(check it is acceptable for photosensitivity guidelines before publishing).
