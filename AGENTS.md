# AGENTS.md

Repository guidance for future coding agents working on the stargazing background.

## Scope

- Treat this as a Vite-based, browser-only canvas project.
- Do not overwrite or revert unrelated changes in other files.
- Keep changes small and local unless the user explicitly asks for a broader refactor.

## JavaScript Style

- Prefer modern ES modules and arrow functions by default.
- Use `const` for bindings unless reassignment is required.
- Keep functions small and composable; prefer pure helpers for math and projection logic.
- Avoid adding dependencies unless they materially improve the implementation.

## Module Boundaries

- `src/main.js` is bootstrap only.
- `src/sky/createSky.js` owns runtime setup, resize/visibility handling, and animation orchestration.
- `src/sky/config.js` is the central tuning surface for density, motion, camera angle, and rendering thresholds.
- `src/sky/math.js` should stay deterministic and reusable.
- `src/sky/projection.js` should own celestial-to-screen transforms and visibility/fade logic.
- `src/sky/stars.js` should handle star generation and distribution.
- `src/sky/renderer.js` should draw only, with no stateful setup.

## Visual Goals

- The result should read as a subtle full-screen portfolio background, not a foreground demo.
- Favor slow celestial motion, soft glow, and timelapse-style trails over obvious particle effects.
- Keep the camera angle interesting, with an equatorial or near-equatorial feel.
- Preserve the dark radial background treatment and make sure the canvas remains transparent over it.

## Performance Constraints

- Keep the effect lightweight on desktop and mobile.
- Cap device pixel ratio, avoid expensive per-frame allocations, and keep the draw path simple.
- Prefer math that can be reused across stars instead of recomputing expensive constants in loops.
- Avoid heavy post-processing, blur filters, or large offscreen buffers unless specifically needed.

## Testing Expectations

- Run `npm test -- --run` after changes that affect math, projection, camera, or star generation.
- Run `npm run build` after changes that affect structure, imports, or the Vite setup.
- Add or update Vitest coverage for deterministic behavior when changing projection or geometry code.
- Prefer tests that validate vector math, camera basis, horizon culling, and projection center points.

## When Editing

- Keep config changes in `src/sky/config.js` unless there is a strong reason not to.
- If adding a new visual feature, first ask whether it belongs in generation, projection, or rendering.
- Favor explicit names over clever math when both are readable.
