---
name: sky-engine-dev
description: Use when changing the stargazing engine, astronomy, projection, shaders, lifecycle, tests, or Vite wiring.
---

# Sky Engine Dev

Use this skill for structural or behavioural changes to the WebGL sky.

## Core Rules

- Modern ES modules and arrow functions; no runtime dependencies.
- Keep `src/main.js` as bootstrap only and `src/ui/` DOM-only.
- Pure, deterministic logic lives in `astro.js`, `projection.js`, `stars.js`, `camera.js`
  and `events.js`, and is unit tested.
- `createSky.js` owns lifecycle, input, time and per-frame state; `render/` owns GPU
  resources (created up front) and draw passes.
- The GLSL projection in `render/shaders/common.glsl` mirrors `projection.js`; change both.

## Workflow

1. Check the module map in [references/module-map.md](references/module-map.md).
2. Change the smallest module that owns the behaviour.
3. Add or update Vitest coverage for deterministic logic.
4. Run `npm test` and `npm run build` (plus `npm run build:embed` for shared code).
5. Check shaders visually on the real GPU (see AGENTS.md, "Testing Expectations").

## Validation Focus

- Frame conversions (equatorial, galactic, horizontal) and sidereal time.
- Projection round trips and composition (`altitudeForHorizon`).
- Catalogue decoding, generation invariants and determinism.
- Camera limits and inertia; meteor and satellite lifecycles.

## Constraints

- No per-frame allocations in the render path.
- One-off heavy work is sliced across frames (generators, tiled bakes).
- Point-like light goes through the tone-mapped screen-blend star pass; diffuse light
  goes through the composite.
