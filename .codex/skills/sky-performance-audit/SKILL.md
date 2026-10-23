---
name: sky-performance-audit
description: Use when profiling, reducing jank, stress-testing, or benchmarking the stargazing WebGL renderer.
---

# Sky Performance Audit

Use this skill when the task is about smoothness, frame time or start-up cost.

## Audit Order

1. Measure: `window.sky.getStats()` (fps, star counts, quality tier); record frame
   intervals from page load to catch start-up stalls.
2. Identify the pass: star pass (vertex count × quad size), aurora (half-res fragment
   cost), composite (full-screen fragment cost), bake (start-up tiles).
3. Check per-frame allocations and uniform churn in `createSky.js` and `renderer.js`.
4. Verify with `npm test` and `npm run build`.

## Levers

- `QUALITY_TIERS` in `config.js`: pixel-ratio cap, field and dust star counts, bake size,
  trail stars and segments.
- Faint stars are culled in the vertex shader below the visibility threshold.
- Start-up work is sliced: bake tiles per frame, faint-star generation per ~5 ms.

## Guardrails

- Keep the look: prefer culling and slicing over visibly reducing detail.
- Never reintroduce synchronous readbacks or one-frame generation of large star sets.

See [references/perf-checklist.md](references/perf-checklist.md).
