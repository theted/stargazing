# Module Map

Use this reference when a change crosses module boundaries.

## Runtime Flow

1. `src/main.js` boots the app and mounts optional controls.
2. `src/sky/createSky.js` owns resize, visibility, and animation lifecycle.
3. `src/sky/stars.js` creates the star set and its distribution.
4. `src/sky/projection.js` handles celestial-to-screen transforms.
5. `src/sky/renderer.js` draws stars, trails, and atmosphere overlays.
6. `src/sky/config.js` holds the tuning constants.

## Editing Guide

- New motion or visibility math belongs in `src/sky/projection.js`.
- New draw passes belong in `src/sky/renderer.js`.
- New star distribution behavior belongs in `src/sky/stars.js`.
- New shared numeric helpers belong in `src/sky/math.js`.
- New lifecycle or pause/resume behavior belongs in `src/sky/createSky.js`.
- New user-facing knobs belong in `src/sky/config.js` and, if exposed, the controls UI.

## Testing Guide

- Prefer tests that validate geometry, basis vectors, and visibility rules.
- Test behavior with explicit numbers, not screenshots.
- If randomness matters, test ranges and invariants.
