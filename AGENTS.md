# AGENTS.md

Repository guidance for coding agents working on the stargazing sky.

## Scope

- A Vite-built, browser-only WebGL 2 visualisation of the night sky. Its only goal is
  to be beautiful; realism is the means, not the end.
- No runtime dependencies. Shaders are plain `.glsl` files imported with `?raw`.
- Do not overwrite or revert unrelated changes in other files.

## JavaScript Style

- Modern ES modules and arrow functions (generator functions where work is sliced).
- `const` unless reassignment is required.
- Small, pure helpers for math, astronomy and projection; keep them deterministic.
- Matrices are column-major `Float32Array(9)`s that go straight to `uniformMatrix3fv`.

## Module Boundaries

- `src/main.js` is bootstrap only.
- `src/sky/createSky.js` owns the WebGL context, input, time, events and the per-frame
  state handed to the renderer.
- `src/sky/config.js` is the tuning surface (`SKY_DEFAULTS`, `RENDER_TUNING`, `QUALITY_TIERS`).
- `src/sky/places.js` holds observing sites as data; `src/sky/milkyway.js` the galaxy's
  named features.
- `src/sky/astro.js` (frames, sidereal time, colour) and `src/sky/projection.js` (camera
  projection) stay pure and mirror the GLSL in `render/shaders/common.glsl`.
- `src/sky/stars.js` generates star data; `src/sky/events.js` meteors and satellites.
- `src/sky/render/` creates GPU resources up front in `createRenderer`; `draw()` only binds,
  sets uniforms and draws. Shaders live in `render/shaders/`.
- `src/ui/` is DOM only and talks to the sky through its public API.

## Rendering Contract

- Light is linear and tone mapped with `1 − e^−x`. Point-like light (stars, trails,
  meteors, dust stars) is written already tone mapped into an sRGB target with
  `ONE, ONE_MINUS_SRC_COLOR` blending, which is exactly equivalent to summing first.
  Keep new point-like layers in that pass, and diffuse light in the composite (`sky.frag`).
- Celestial things are positioned in the equatorial frame and rotate with the sky;
  atmospheric things (meteors, satellites, aurora, airglow) live in the horizontal frame.
- The landscape is drawn last in the composite, so it occludes everything above.

## Performance Constraints

- Hold 60 fps on integrated GPUs at the `high` tier and stay usable on phones at `low`.
- No per-frame allocations in the render path; reuse the frame object and typed arrays.
- Expensive one-off work (the Milky Way bake, faint-star generation) is spread across
  frames during the intro. Do not add synchronous work that stalls a frame.
- Prefer analytic rendering (trails, aurora sheets) over accumulation buffers or volume
  marching.

## Testing Expectations

- `npm test` after changes to math, astronomy, projection, generation, camera or events.
- `npm run build` (and `npm run build:embed` when touching `src/embed.js` or shared code).
- Shaders cannot be unit tested: check them visually. Headless Chromium can use the real
  GPU (`--use-angle=vulkan --enable-features=Vulkan --ignore-gpu-blocklist`). Drive it over
  the DevTools protocol and wait for `window.sky.getStats().dustStars > 0` before capturing,
  because faint stars arrive a moment after start-up. `?intro=0&speed=0` gives stable frames,
  and `?debug=allsky|stars|dust` shows the baked galaxy, the star buffer and dust transmission.

## When Editing

- New knobs go in `src/sky/config.js`; new sites in `src/sky/places.js`.
- New visual feature? First decide whether it is data (places, galaxy features),
  generation, per-frame state, or a render pass.
- Keep the JS and GLSL versions of the projection in step (`projection.js` and `common.glsl`).
- Regenerate the catalogue with `scripts/build-star-catalog.mjs`, never by hand.
