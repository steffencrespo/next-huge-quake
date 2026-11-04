# EP 02 Oil Drilling: "We're Triggering Earthquakes. And We Know How." (image prompts)

**Generated manually by the owner in the ElevenLabs web UI. No image API calls and no other image service.** One attempt each; a second attempt only if a check below fails.

- **Model:** GPT Image 2.5 Sunburst, the model used for Taipei 101 (720×1280; the composition scales it to 1080×1920). If the UI no longer offers it, tell me before picking another. Use one model for every image.
- **Aspect ratio:** 9:16 portrait for every image.
- **Cost:** about 191 credits per image (the price confirmed on 2026-10-30; check the UI). Four required = about 764; with optional AI-5 = about 955.
- **Where files go:** `video/experiments/oil-drilling-cinematic/assets/ai/`, with these exact names:

| ID | File name | Scene | Required |
|---|---|---|---|
| AI-1 | `ai-1-oil-field-hero.png` | 0–6.4 s hook; returns at 22–25.6 s for the twist | yes |
| AI-2 | `ai-2-wastewater-injection.png` | 6.4–9.2 s injection; returns at 25.6–28 s | yes |
| AI-3 | `ai-3-fault-pressure.png` | 9.2–14.7 s pressure and slip | yes |
| AI-4 | `ai-4-pawnee-earthquake.png` | 19.4–22.1 s "Researchers linked…" | yes |
| AI-5 | `ai-5-closing.png` | 28–32.3 s ending | optional, recommended (AI-1 is reused if missing) |

**Why there's no text in the images:** every label, number and arrow ("M5.8", "WASTEWATER INJECTION", "PRE-EXISTING FAULT") is added by Remotion, where it can be fact-checked.

**AI-4 is not Pawnee.** Project policy forbids presenting an illustration as a specific real place. The real location is shown on a Natural Earth map with the USGS epicenter; AI-4 is a generic plains landscape, labelled on screen as an illustration. The file name is kept from the brief.

## Shared style (already included in each prompt)

> Premium cinematic science documentary, strong three-dimensional depth, dramatic but believable lighting, realistic materials, palette of deep blues, charcoal greys and earthy browns with restrained amber highlights, subtle film grain, vertical 9:16 mobile framing. No text, letters, numbers, labels, arrows, logos, signage, captions or watermarks anywhere in the image.

---

## AI-1: oil field hero → `ai-1-oil-field-hero.png`

```
Photorealistic cinematic wide shot of an American oil field on the flat Great Plains at the last light before a storm. Three large industrial oil pumpjacks stand in the lower-middle of the frame, the nearest one big and sharply detailed in the foreground on the right, the others receding across open prairie to show enormous scale. A towering dark supercell cloud fills the upper half of the frame, with a narrow band of amber sunset light along the horizon rim-lighting the steel of the pumpjacks. Low camera, about one metre above dry grass and red-brown soil, 24 mm lens, strong foreground and background separation. Ominous, powerful, attention-grabbing. The upper half of the frame is clear sky for on-screen titles; the lowest fifth is dark ground for captions. No people, no vehicles, no fire, no flare, no oil spill, no lightning strike. Premium cinematic science documentary, strong three-dimensional depth, dramatic but believable lighting, realistic materials, palette of deep blues, charcoal greys and earthy browns with restrained amber highlights, subtle film grain, vertical 9:16 mobile framing. No text, letters, numbers, labels, arrows, logos, signage, captions or watermarks anywhere in the image.
```

- **Composition and camera:** low wide angle; pumpjacks between 50% and 85% of the height; sky above.
- **Lighting and palette:** storm blue-charcoal, thin amber horizon.
- **Engineering constraints:** real pumpjack shape: walking beam, horsehead, counterweights, samson post.
- **How it's used:** a move from the storm sky down onto the pumpjacks, starting on the first frame, under "WE'RE TRIGGERING EARTHQUAKES." It returns darker and closer for "Not usually the drilling".
- **Accept if:** it grabs in the first second, the pumpjacks are mechanically believable, and the upper half is calm enough for white titles.
- **Reject if:** any text or logo, malformed pumpjacks (missing horsehead, fused parts), flames, gushers or tornadoes.

## AI-2: wastewater injection cutaway → `ai-2-wastewater-injection.png`

```
Sophisticated scientific CGI cross-section of the ground beneath an oil-field wastewater disposal site, side view, as in a high-end science documentary. The top quarter of the image is the surface at dusk: flat prairie, a low wastewater disposal facility with a few cylindrical steel storage tanks, pipes and a compact wellhead, seen in realistic detail; dark storm sky above. At the 25 percent line the ground is sliced open as a clean horizontal cut. Below the cut, realistic layered sedimentary rock in side view: brown and grey shale and limestone bands. A single thin vertical steel-cased well runs straight down from the wellhead, positioned about 40 percent of the way across the image from the left, ending at about 60 percent of the image height. There it enters a distinct thick band of pale, porous dolomite rock spanning the full width of the image between 57 and 68 percent of the image height; the rock around the bottom of the well is subtly darker and damp-looking, as water saturating the tiny pores of solid rock. Beneath that band is dark, massive crystalline basement rock, pinkish-grey granite, filling the rest of the image and fading into darkness at the bottom. In the basement, on the right side of the image and well away from the well, a single thin inclined fault, a natural old fracture plane, runs from the base of the pale band at about 75 percent across the image down and to the left to about 60 percent across at the bottom of the frame. Calm, precise, realistic rock textures. The cut faces have a faint cool-blue edge light. No cavern, no underground lake or river, no visible flowing water, no glow, no magma, no explosions, no cracks spreading from the well, no drill bit, no drilling rig, no pumpjack. Premium cinematic science documentary, strong three-dimensional depth, dramatic but believable lighting, realistic materials, palette of deep blues, charcoal greys and earthy browns with restrained amber highlights, subtle film grain, vertical 9:16 mobile framing. No text, letters, numbers, labels, arrows, logos, signage, captions or watermarks anywhere in the image.
```

- **Composition and camera:** flat side-on section; the surface in the top quarter, the well at about 40% across; the fault at lower right.
- **Lighting and palette:** dusk above, soft even light on the section.
- **Geological and engineering constraints:** a disposal well, not a drilling rig. Fluid sits in the pores of solid rock. The fault is natural and separate from the well; nothing connects them in the image.
- **How it's used:** a tilt down the well. Remotion adds the animated chevrons in the casing, pressure spreading through the pale band, "WASTEWATER INJECTION" and "NOT TO SCALE". It returns tighter on the bottom of the well for "deep underground afterward".
- **Accept if:** one clear vertical well, one distinct pale band, one separate inclined fault.
- **Reject if:** caverns or pools of water, glowing fluid, a drilling rig, a pumpjack on this well, several wells, or a fracture running from the well to the fault.

## AI-3: fault pressure → `ai-3-fault-pressure.png`

```
Sophisticated scientific CGI visualization deep underground, side view of massive layered crustal rock, realistic textures of dark grey granite and charcoal rock, lit like a science documentary. A single straight, ancient fault plane cuts diagonally through the rock from the upper left to the lower right, seen edge-on as a thin tight seam where two solid rock blocks meet; the seam starts about 10 percent across the image at 20 percent of its height and ends about 90 percent across at 74 percent of its height. The two blocks are tightly clamped together, with a very slight old offset along the seam and a thin band of crushed fault rock, so it reads as mechanically real and long established. Along the seam a very faint, restrained warm-amber tint, and in the rock a few delicate pale-blue hairline tones, suggesting stress rather than damage. Upper-right and lower-left areas are calm, even rock, leaving room for on-screen labels. Quiet, tense, mysterious. No magma, no lava, no fire, no explosion, no open chasm, no gap, no rupture, no shattering, no debris, no water, no glow brighter than the rock. Premium cinematic science documentary, strong three-dimensional depth, dramatic but believable lighting, realistic materials, palette of deep blues, charcoal greys and earthy browns with restrained amber highlights, subtle film grain, vertical 9:16 mobile framing. No text, letters, numbers, labels, arrows, logos, signage, captions or watermarks anywhere in the image.
```

- **Composition and camera:** side-on, one diagonal seam through the middle.
- **Lighting and palette:** cool charcoal and blue, a thin amber trace.
- **Geological constraints:** one closed, pre-existing fault. Remotion animates the pressure and slip, so the image must show neither.
- **How it's used:** a slow push. Remotion draws the pressure fronts, the dashed fault trace, "PRE-EXISTING FAULT · ALREADY STRESSED", then the slip arrows, a short jolt and "SLIP". I'll re-pin the overlay to the real seam.
- **Accept if:** the seam is a single clean line roughly on that diagonal and both sides look like solid rock.
- **Reject if:** a jagged web of glowing cracks, an open gap, lava or debris.

## AI-4: generic plains landscape → `ai-4-pawnee-earthquake.png`

```
Photorealistic cinematic landscape of rural Great Plains country at dusk: gently rolling prairie and wheat stubble under an enormous dramatic but believable sky of layered blue-grey clouds with a band of amber light low on the horizon. A straight empty two-lane country road with a wire fence runs from the foreground toward the distance, where a few small farm buildings, trees and two tiny, distant oil pumpjacks sit on the horizon, undamaged and calm. Eye-level camera, 35 mm lens, horizon at about 62 percent of the image height. An ordinary quiet evening, with nothing wrong in the scene. The upper half is sky for on-screen titles; the lowest fifth is dark ground for captions. No damage, no cracks in the road, no collapsed buildings, no smoke, no dust, no people, no vehicles, no identifiable real town or landmark. Premium cinematic science documentary, strong three-dimensional depth, dramatic but believable lighting, realistic materials, palette of deep blues, charcoal greys and earthy browns with restrained amber highlights, subtle film grain, vertical 9:16 mobile framing. No text, letters, numbers, labels, arrows, logos, signage, road signs, captions or watermarks anywhere in the image.
```

- **Composition and camera:** eye level, high sky, road leading the eye.
- **Lighting and palette:** dusk blue-grey with amber at the horizon.
- **Constraints:** a generic place, undamaged. This must never read as footage of 2016.
- **How it's used:** a slow push under "LINKED TO WASTEWATER", "APPEARS INDUCED · DISPOSAL WITHIN 10 KM", and "ILLUSTRATION · NOT PAWNEE · NOT FOOTAGE".
- **Accept if:** calm, believable, with a clear sky area.
- **Reject if:** any damage, road signs, town names or a recognizable real place.

## AI-5 (optional, recommended): closing hero → `ai-5-closing.png`

```
Cinematic split-level image of an American oil field at night with a subtle underground perspective. The upper 55 percent is dark, calm night sky with deep-blue clouds and clear negative space. At about 62 percent of the image height is the ground line, with three small pumpjacks and a low row of storage tanks silhouetted against a thin band of amber on the horizon. Below the ground line, the earth fades gently into a soft, semi-transparent side view of layered rock with a single thin inclined natural fault line far below, barely visible, dark and quiet, fading into black at the bottom of the frame. Elegant, memorable, ominous, a clean final frame. No glow in the rock, no lava, no explosions, no water, no fire, no flare. Premium cinematic science documentary, strong three-dimensional depth, dramatic but believable lighting, realistic materials, palette of deep blues, charcoal greys and earthy browns with restrained amber highlights, subtle film grain, vertical 9:16 mobile framing. No text, letters, numbers, labels, arrows, logos, signage, captions or watermarks anywhere in the image.
```

- **Composition and camera:** sky above, ground line at about 62%, faint rock below.
- **Lighting and palette:** deep blue night, a thin amber horizon.
- **Constraints:** the fault stays faint and separate from the surface equipment.
- **How it's used:** a slow pull-back under "HUMANS CAN TRIGGER EARTHQUAKES" with "NOT EVERY WELL · MOST AREN'T LINKED TO FELT QUAKES · USGS".
- **Accept if:** the upper half is clean for the titles.
- **Reject if:** anything glows underground, or a line joins a well to the fault.

---

## Checks before accepting any image
Reject the image (one retry, after the owner agrees) if there is any text, signage or watermark; any logo or real company branding; AI artifacts on the machinery; or any invented damage, lava, explosion or rupture.
