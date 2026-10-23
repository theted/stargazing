---
name: sky-visual-tuning
description: Use when tuning the look, motion, atmosphere, places and perceived intensity of the stargazing sky.
---

# Sky Visual Tuning

Use this skill for aesthetic changes.

## Target Look

- A real night sky photographed beautifully: crisp stars with coloured halos, a Milky Way
  made of stars with dark dust, a luminous horizon behind dark silhouettes.
- Calm motion: the sky wheels slowly; transient events (meteors, satellites) are rare.
- Restraint: no hard spikes, no garish colour, no visible particles.

## Tune In This Order

1. Place framing: `view.azimuth`, `view.horizon`, `view.fov`, `startLst` in `places.js`.
2. Exposure and stars: `referenceMagnitude`, `psfSigma`, skirt and glow ratios and knees,
   `starSaturation` in `RENDER_TUNING`.
3. Milky Way: `milkyWayGain`, `fieldBoost`, `dustBoost`, then the bake shader and features.
4. Atmosphere: `airglow`, `lightDomes`, `extinction` per place; sky gradient in `sky.frag`.
5. Landscape: ridge layers, mist, trees and ground light per place.
6. Motion: `timeScale`, `trailGain`, `trailFade`, meteor and satellite rates.

## Guardrails

- Keep the zenith dark and the horizon luminous enough for silhouettes to read.
- Bright stars must stay rare; glows fade out below their knee.
- Check a wide desktop, a portrait phone and a zoomed-in view after major changes.

See [references/tuning-checklist.md](references/tuning-checklist.md).
