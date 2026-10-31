# SF 1906 Cinematic — generation prompts (approved direction, 2026-10-30)

Nothing here has been generated. Each item is **1 attempt**, with no automatic retries; a second attempt needs the owner's approval.

- **Tool:** ElevenLabs Image & Video (web UI), as for the earlier cinematics.
- **Stills:** one model for all six so the look stays consistent. The recommendation is **GPT Image 2.5 Sunburst**, used for Loma Prieta and NYC (720×1280; the composition scales it 1.5× to full frame).
- **Aspect ratio:** 9:16 portrait.
- **Video:** **Seedance 1.5 Pro**, image-to-video from the approved AI-2 still, **4 s**, 9:16 (owner-approved: one manual attempt, 287 credits).
- **Where files go:** save each output under `assets/ai/` or `assets/video/` with the file name in `assets.ts`. Record the credits the UI charged in `CREDITS.md` (Generation log).

**Shared style suffix** (append to AI-1 to AI-5):

> Photorealistic historical reconstruction, San Francisco, April 1906. Period-accurate Victorian and Edwardian brick and wood-frame buildings, cobblestones, cable-car slots, gas street lamps, horse-drawn vehicles, clothing of 1906 (long coats, bowler hats, long skirts). No automobiles newer than 1906, no modern signage, no skyscrapers, no modern power lines, no text, captions, dates, logos or watermarks in the image. Cinematic 35 mm film look, natural light, subtle film grain, vertical 9:16 composition.

## AI-1 — hook: the city burning at night → `assets/ai/ai-1-burning-skyline.png`
Night, wide view from a hillside over a dense 1906 city of three- to six-storey brick and wooden buildings. Fires burn across many blocks below, with towering orange-lit smoke columns rising into a dark sky. Silhouettes of rooftops, water tanks and a church spire stand against the glow. In the lower foreground, a few small figures in long coats and hats stand on a hillside street watching, seen from behind. The fire is in the middle and far distance, and the sky takes the upper third. No recognisable modern landmark. *(+ style suffix)*

## AI-2 — dawn street (also the Seedance reference) → `assets/ai/ai-2-dawn-street.png`
Blue-hour pre-dawn, about 5 a.m., an empty, wide downtown commercial street in 1906 at eye level with deep one-point perspective. A cable-car slot runs down the centre of the cobblestones, and gas street lamps are still lit. Three- and four-storey brick commercial buildings line the street, with ornate cornices, awnings and painted window lettering kept illegible. A single horse-drawn delivery wagon is parked at the kerb with the horse standing still, and a lone milkman carries bottles. Calm, still air, light mist, no damage. Leave headroom above the cornices. *(+ style suffix)*

## AI-3 — made land, broken water main → `assets/ai/ai-3-made-land.png`
Morning, shortly after the earthquake, on a downtown street built on filled land. The pavement is buckled into waves and split open along a jagged fissure. A broken cast-iron water main is exposed in the trench, with water pooling around it. Cable-car rails are bent out of line, and fallen bricks lie along the kerb below a cracked brick façade. Three men in hats and coats look down at the damage. Dust hangs in grey morning light. No fire yet, no injured people. *(+ style suffix)*

## AI-4 — little water → `assets/ai/ai-4-little-water.png`
Daytime under a smoke-darkened sky. A horse-drawn steam fire engine with a brass boiler stands at a street corner, with firefighters in 1906 leather helmets and long coats. One firefighter holds a hose that gives only a weak trickle, and another kneels at a hydrant. The other hoses lie slack on the cobblestones. Thick smoke from approaching fire rises behind three-storey buildings at the end of the street. The tone is documentary and sober, not heroic. *(+ style suffix)*

## AI-5 — dynamite firebreak → `assets/ai/ai-5-firebreak.png`
Late afternoon on a wide residential street of two- and three-storey wooden houses with bay windows. In the middle distance a single house collapses in a controlled dynamite blast: a burst of dust and debris, not a fireball. Smoke from the advancing fire rises beyond. In the foreground, soldiers in 1906 US Army uniforms (campaign hats, dark blue tunics) hold a cordon well back, with a horse-drawn wagon behind them. No gore and no injured people. Wide shot, documentary realism. *(+ style suffix)*

## AI-6 — lesson: present day → `assets/ai/ai-6-modern-sf.png`
Present-day San Francisco at dawn, seen from a hillside in the same direction as a wide city view: the modern downtown skyline, bay in the distance, fog lifting, warm golden light. Calm and hopeful, with no damage and no people in the foreground. Photorealistic, cinematic, subtle grain, vertical 9:16, no text, logos or watermarks. *(The only shot where modern buildings are allowed. No style suffix.)*

## SD-1 — Seedance 1.5 Pro image-to-video (4 s) from the approved AI-2 → `assets/video/sd-1-main-shock.mp4`
- **Reference image:** `assets/ai/ai-2-dawn-street.png`, the approved dawn street.
- **Settings:** duration 4 s, aspect ratio 9:16 (vertical), no audio needed (the composition mutes the clip and uses its own synthesized boom and rumble).
- **Attempts:** one, with no retries.

Prompt:

> Animate this 1906 San Francisco street at dawn as an earthquake begins. For the first half-second everything is calm and still. Then the ground starts to shake and the shaking grows steadily until the end: a handheld camera tremor builds into strong jolts. The gas street lamps sway on their posts, window glass trembles, and a few small bricks and puffs of dust fall from the cornices onto the cobblestones. The horse startles, lifts its head and steps sideways, rocking the wagon, and the milkman stumbles and steadies himself. The buildings stay standing: no collapse, no explosions, no fire, no injuries. Realistic, physically plausible motion, natural blue-hour dawn light, the camera stays roughly in place, period-accurate 1906 scene with no modern objects, no text.

**Before accepting the clip, check:**
- it's 4 s or longer;
- the opening is calm;
- the shaking grows;
- no building collapses;
- no modern objects or text appear;
- the horse and milkman move naturally (no warping or extra limbs);
- the first frame matches AI-2.

**Where it goes:** save the clip to `assets/video/sd-1-main-shock.mp4`. In the composition, it plays from just before the foreshock line ("A foreshock…", about 8.2 s) for exactly 4 s. Its strongest shaking lands on "the main shock" (about 10.7–12 s), and the rupture map takes over as "Magnitude seven point nine…" begins. Narration, captions and effects keep their timing.

## Anachronism check before accepting an image
Reject an image (it can only be regenerated with the owner's approval) if it shows any of the following:
- cars or trucks, motorised vehicles of later decades, modern road markings, traffic lights, power or telephone poles of modern design;
- readable modern signs, neon, skyscrapers (except AI-6), or plastic and modern clothing;
- text or dates baked into the image, or a fake photo border or caption.

Also confirm that the shot is not presented as a specific identifiable real building. The documented places come from the National Archives photographs instead.
