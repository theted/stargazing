---
name: sky-engine-dev
description: Use when changing the stargazing engine, math, rendering, lifecycle, tests, or Vite wiring.
---

# Sky Engine Dev

Use this skill for structural or behavioral changes in the canvas background.

## Core Rules

- Prefer modern ES modules and arrow functions.
- Keep `src/main.js` as bootstrap only.
- Keep pure math and projection logic testable and deterministic.
- Put lifecycle and canvas orchestration in `src/sky/createSky.js`.
- Put screen-space math in `src/sky/projection.js`.
- Put drawing only in `src/sky/renderer.js`.
- Keep star generation in `src/sky/stars.js`.
- Keep reusable math helpers in `src/sky/math.js`.

## Workflow

1. Check the relevant module boundaries first.
2. Change the smallest module that owns the behavior.
3. Update or add Vitest coverage for deterministic logic.
4. Run `npm test` and `npm run build`.

## Validation Focus

- Camera basis orthogonality.
- Projection center points and horizon culling.
- Star generation invariants and sizing ranges.
- Import/build correctness under Vite.

## Constraints

- Keep the effect lightweight on desktop and mobile.
- Cap device pixel ratio where needed.
- Avoid extra allocations in hot loops.
- Keep the canvas transparent; atmosphere belongs in CSS or a dedicated overlay, not an opaque clear.

See [references/module-map.md](references/module-map.md) when a task spans multiple files.
