---
name: sky-visual-tuning
description: Use when tuning the look, motion, atmosphere, and perceived intensity of the stargazing background.
---

# Sky Visual Tuning

Use this skill for aesthetic changes to the background effect.

## Target Look

- Full-screen portfolio background.
- Calm, celestial, and slightly dramatic.
- Trails should read like timelapse exposure, not noisy streaks.
- Motion should feel slow even when the scene is visually rich.

## Tune In This Order

1. Camera and sky position: `observerLatitude`, `lookAzimuth`, `lookAltitude`, `lookRoll`, `fieldOfView`.
2. Motion feel: `rotationSpeed`, `motionScale`, `timelapseEnabled`, `timelapseIntensity`.
3. Trail length: `trailExposureSeconds`, `trailTimeWarp`.
4. Population: `density`, `minStars`, `maxStars`, `bandWeight`, `bandAmplitude`, `starSpread`.
5. Star presence: `baseStarSize`, `maxStarSize`, `starSizeVariation`, `glowScale`, `twinkleAmount`.
6. Atmosphere and distortion: `atmosphereEnabled`, `atmosphereStrength`, `gravityEnabled`, `gravityStrength`.
7. Page atmosphere: `src/styles.css`.

## Guardrails

- Keep the most active region away from the main text by default.
- Keep large stars rare.
- Keep twinkle subtle.
- Prefer broader composition changes over increasing raw particle count.
- If the effect feels heavy, reduce star count and trail work before changing projection math.

## Validation

- Run `npm test`.
- Run `npm run build`.
- Check desktop and mobile after major visual changes.

See [references/tuning-checklist.md](references/tuning-checklist.md) for a quick pass order.
