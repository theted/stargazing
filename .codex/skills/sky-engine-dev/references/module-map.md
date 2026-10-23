# Module Map

## Runtime Flow

1. `src/main.js` reads preferences and URL options, creates the sky and the interface.
2. `src/sky/createSky.js` creates the renderer, places the camera and runs the loop:
   time → camera → events → frame state → `renderer.draw(frame)`.
3. `src/sky/render/renderer.js` draws each frame:
   - star pass into an sRGB target with screen blending: dust stars (points), trails,
     meteors, catalogue and field stars, meteor heads and satellites;
   - aurora at half resolution when the place has one;
   - composite (`sky.frag`): sky glow, baked Milky Way, stars, aurora, landscape,
     vignette, dither.
4. `src/sky/render/milkyWayBaker.js` bakes the galaxy cube map in tiles at start-up and
   reads its light back asynchronously so `stars.js` can scatter faint stars along it.

## Editing Guide

- Look and motion constants: `src/sky/config.js`.
- A new site: `src/sky/places.js` (packed by `render/placeUniforms.js`).
- Galaxy features: `src/sky/milkyway.js` (packed into a float texture for the bake).
- Celestial maths: `src/sky/astro.js`; camera maths: `src/sky/projection.js`.
- Star populations: `src/sky/stars.js`; transient events: `src/sky/events.js`.
- New draw passes: `src/sky/render/` with shaders in `render/shaders/`.

## Testing Guide

- Test geometry, frames and invariants with explicit numbers.
- Seeded randomness (`createRandom`) keeps generation testable.
- Shaders are checked visually; `?debug=allsky|stars|dust` isolates layers.
