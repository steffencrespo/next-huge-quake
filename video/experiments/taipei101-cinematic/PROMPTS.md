# Taipei 101: "Can a Skyscraper Trigger an Earthquake?" (image prompts)

**Generated manually by the owner in the ElevenLabs web UI. No image API calls.** One attempt each; a second attempt only if a check below fails.

- **Model:** GPT Image 2.5 Sunburst, the model used for SF 1906, NYC and Loma Prieta (720×1280; the composition scales it to 1080×1920). Use the same model for every image so the look stays consistent.
- **Aspect ratio:** 9:16 portrait for every image.
- **Cost:** about 191 credits per image (the price confirmed on 2026-10-30; check the UI). Four required = about 764; with optional AI-2 = about 955.
- **Where files go:** `video/experiments/taipei101-cinematic/assets/ai/`, with these exact names:

| ID | File name | Scene | Required |
|---|---|---|---|
| AI-1 | `ai-1-hero-low-angle.png` | 0–7 s hook | yes |
| AI-2 | `ai-2-scale-basin.png` | 7–10 s "As the massive tower rose…" | optional (AI-1 is reused if missing) |
| AI-3 | `ai-3-cutaway.png` | 10–18 s two earthquakes, below the city | yes |
| AI-4 | `ai-4-fault.png` | 15–23 s hidden fault, stress | yes |
| AI-5 | `ai-5-night-hero.png` | 23–34 s twist and ending | yes |

**Why there's no text in the images:** every label ("ML 3.8", "~10 km deep", "INFERRED FAULT", "NOT TO SCALE") is added by Remotion. Labels made by an image model would be unreliable and couldn't be fact-checked.

---

## Shared description of the building (already included in each prompt below; keep it word for word)

> Taipei 101, the real skyscraper in Taipei, Taiwan: a 508-metre supertall tower of blue-green glass with a pagoda-like silhouette, made of eight identical stacked segments of eight floors each, every segment flaring slightly outward toward its top like an inverted trapezoid; a tapered lower trunk above a wide podium base; large circular ruyi ornaments on the lower trunk; a slender stepped pinnacle and spire on top.

## Shared style (already included in each prompt)

> Photorealistic, cinematic, high detail, restrained dramatic grade (deep teal shadows, warm highlights), subtle film grain, vertical 9:16 composition with clear space in the upper and lower thirds for on-screen titles and captions. No text, letters, numbers, logos, signage, watermarks or captions anywhere in the image.

---

## AI-1: hook, dramatic low angle → `ai-1-hero-low-angle.png`

```
Extreme low-angle worm's-eye view looking straight up the full height of Taipei 101, the real skyscraper in Taipei, Taiwan: a 508-metre supertall tower of blue-green glass with a pagoda-like silhouette, made of eight identical stacked segments of eight floors each, every segment flaring slightly outward toward its top like an inverted trapezoid; a tapered lower trunk above a wide podium base; large circular ruyi ornaments on the lower trunk; a slender stepped pinnacle and spire on top. The camera is at street level close to the base, wide-angle lens with strong vertical perspective, the tower rising from the bottom of the frame and converging toward the spire near the top centre. Late-afternoon storm light: dark, heavy clouds behind the spire, a shaft of warm sunlight catching the upper segments, the glass reflecting the sky. Slightly ominous, powerful, monumental mood. No people in focus, no vehicles. Photorealistic, cinematic, high detail, restrained dramatic grade (deep teal shadows, warm highlights), subtle film grain, vertical 9:16 composition with clear space in the upper and lower thirds for on-screen titles and captions. No text, letters, numbers, logos, signage, watermarks or captions anywhere in the image.
```

**How it's used:** a fast push upward (Ken Burns from base to spire) for 0–2.9 s, a short shake, then the hook title "CAN A BUILDING TRIGGER AN EARTHQUAKE?". If AI-2 is missing, it returns at 7–10 s with a different crop.

## AI-2 (optional): scale and weight over the basin → `ai-2-scale-basin.png`

```
High aerial view at golden hour, from a helicopter about 600 metres up and 2 km away, of Taipei 101, the real skyscraper in Taipei, Taiwan: a 508-metre supertall tower of blue-green glass with a pagoda-like silhouette, made of eight identical stacked segments of eight floors each, every segment flaring slightly outward toward its top like an inverted trapezoid; a tapered lower trunk above a wide podium base; large circular ruyi ornaments on the lower trunk; a slender stepped pinnacle and spire on top. The tower dominates the centre of the frame, towering over a dense low-rise city that fills the flat Taipei basin, with forested green mountains ringing the basin in the background and a river curving through the city. Long shadow cast by the tower across the city. The tower should feel immensely heavy and massive: a single colossal mass pressing down on flat ground. Clear air, warm sunlight, light haze in the distance. Photorealistic, cinematic, high detail, restrained dramatic grade (deep teal shadows, warm highlights), subtle film grain, vertical 9:16 composition with clear space in the upper and lower thirds for on-screen titles and captions. No text, letters, numbers, logos, signage, watermarks or captions anywhere in the image.
```

**How it's used:** a slow push-in while the narration says the tower "rose" and activity increased. The overlay reads "508 m · ≈700,000 TONNES".

## AI-3: cutaway below the tower → `ai-3-cutaway.png`

```
Scientific-cinematic cross-section cutaway illustration, photorealistic style, of Taipei 101 and the ground beneath it. The top 40 percent of the image shows the base and lower half of Taipei 101, the real skyscraper in Taipei, Taiwan: blue-green glass, pagoda-like stacked segments each flaring slightly outward toward its top, a wide podium base, large circular ruyi ornaments on the lower trunk; the upper part of the tower runs out of the top of the frame. The city street surface is sliced open as a clean horizontal cut at the 40 percent line, like a museum cutaway model. Below the cut, the lower 60 percent shows the underground in side view: directly under the tower a deep foundation of many long concrete piles reaching down through soft, layered, brown-grey basin sediments (clay, sand and gravel layers) into darker, harder bedrock; below that, the rock continues into deep, dark grey crust that fades into darkness at the bottom of the frame, suggesting great depth. The cut faces are slightly translucent with a faint cool-blue glow along the edges. Calm, precise, educational, like a high-end science documentary; no cracks, no explosions, no damage, no fire. Dusk light on the tower above, soft even light on the cross-section. Photorealistic, cinematic, high detail, restrained dramatic grade (deep teal shadows, warm highlights), subtle film grain, vertical 9:16 composition. No text, letters, numbers, logos, labels, arrows, signage, watermarks or captions anywhere in the image.
```

**How it's used:** a slow tilt down from the tower into the ground. Remotion adds two pulsing hypocentre markers deep in the crust, "ML 3.8 · OCT 2004" and "ML 3.2 · MAR 2005", "≈10 km deep", "NOT TO SCALE" and an animated downward-pressure overlay under the foundation.

## AI-4: the hidden fault (hypothesis) → `ai-4-fault.png`

```
Scientific-cinematic visualization deep underground, photorealistic style, side view of solid crustal rock about ten kilometres below a city, lit like a science documentary. A single straight, inclined fault plane cuts diagonally through the massive dark-grey rock from upper right to lower left, at about 60 degrees, seen edge-on as a thin seam where two rock blocks meet; the block above the seam is very slightly offset downward along it (a normal fault). Along the seam, a faint, restrained warm-amber glow and a few delicate pale-blue hairline stress lines spread through the surrounding rock, suggesting stress, not an explosion. At the very top of the frame, far above and small, a thin layer of sediment and the tiny silhouette of a tall pagoda-like skyscraper on the surface, to give a sense of enormous depth. Quiet, mysterious, tense; no fire, no lava, no open chasm, no rupture, no shattering, no debris. Photorealistic, cinematic, high detail, restrained dramatic grade (deep teal shadows, warm highlights), subtle film grain, vertical 9:16 composition with clear space in the upper and lower thirds for on-screen titles and captions. No text, letters, numbers, logos, labels, arrows, watermarks or captions anywhere in the image.
```

**How it's used:** a slow push toward the fault seam. Remotion adds "HIDDEN FAULT · INFERRED", "BLIND NORMAL FAULT (LIN 2005)", "+4.7 BAR AT THE FOUNDATION (ESTIMATE)" and "HYPOTHESIS", with a faint pulse. Nothing shows a rupture.

## AI-5: closing hero at night → `ai-5-night-hero.png`

```
Iconic night view of Taipei 101, the real skyscraper in Taipei, Taiwan: a 508-metre supertall tower of blue-green glass with a pagoda-like silhouette, made of eight identical stacked segments of eight floors each, every segment flaring slightly outward toward its top like an inverted trapezoid; a tapered lower trunk above a wide podium base; large circular ruyi ornaments on the lower trunk; a slender stepped pinnacle and spire on top. Seen from a hillside to the east at eye level with the upper floors, the tower stands alone and centred, softly illuminated from within and by warm architectural lighting, against a deep blue twilight sky with the last glow on the horizon; the city lights of the Taipei basin spread below and mountains are dark silhouettes. Calm, majestic and slightly mysterious mood, a clean and memorable final frame. No fireworks, no people in the foreground. Photorealistic, cinematic, high detail, restrained dramatic grade (deep teal shadows, warm highlights), subtle film grain, vertical 9:16 composition with clear sky above the spire and clear space in the lower third for captions. No text, letters, numbers, logos, signage, watermarks or captions anywhere in the image.
```

**How it's used:** "But here's the catch" cuts to this frame, which carries the twist. It ends on a slow pull-back with "POSSIBLE. NOT PROVEN.".

---

## Checks before accepting an image
Reject the image (one retry, after the owner agrees) if:
- **the tower is not recognisably Taipei 101**: not eight stacked flaring segments, a generic glass tower, the wrong number of segments, a missing spire, or a twisted or curved shape;
- **there's any text**, letters, numbers, signage or a watermark inside the image;
- **AI-3 or AI-4 shows cracks, an open chasm, lava, an explosion, collapse or a rupture.** The episode must not depict a confirmed rupture;
- **AI-4's fault isn't a single inclined plane**, for example a jagged web of glowing cracks;
- **a building is damaged**, or there's smoke or fire anywhere.

A slightly wrong segment count at a distance (AI-2, AI-4) is acceptable. AI-1 and AI-5 must read as Taipei 101 at a glance.
