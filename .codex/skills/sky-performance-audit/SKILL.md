---
name: sky-performance-audit
description: Use when profiling, reducing jank, stress-testing, or benchmarking the stargazing canvas renderer and its config ranges.
---

# Sky Performance Audit

Use this skill when the task is about smoothness, frame time, hot-loop cost, or high-end stress presets.

## Audit Order

1. Check the active render path in `src/sky/createSky.js`, `src/sky/renderer.js`, `src/sky/projection.js`, `src/sky/atmosphere.js`, and `src/sky/meteors.js`.
2. Look for per-frame allocations, repeated string or gradient creation, repeated expensive math, and avoidable canvas path work.
3. Check whether work scales with viewport size, `dprCap`, `density`, `minStars`, `maxStars`, glow usage, and trail usage.
4. Prefer pruning or caching work before reducing the visual ambition of the scene.
5. Verify with `npm test -- --run` and `npm run build`.

## Hot-Path Priorities

- Reuse scratch objects in star and projection loops.
- Avoid rebuilding gradients, color strings, and other immutable draw resources every frame.
- Skip work for stars that are too dim or too small to justify trail or glow rendering.
- Prefer cheap primitives for tiny stars.
- Avoid regenerating stars except on resize or config changes that require it.
- Treat `dprCap`, star count, trail work, and glow work as the main performance levers.

## Benchmark Workflow

1. Compare the scene in fullscreen and the `300 x 300` stage mode.
2. Read the FPS badge together with render size and star count.
3. Stress-test using high `maxStars`, high `density`, high `trailTimeWarp`, and high `glowScale`.
4. If performance regresses, identify whether the bottleneck is star population, canvas fill rate, projection math, or expensive draw calls.

## Guardrails

- Keep the motion calm; do not “optimize” by making the scene visibly more static.
- Preserve the transparent canvas contract.
- Prefer deterministic math changes over hidden heuristics.
- If a shortcut changes the look, state the tradeoff explicitly.

See [references/perf-checklist.md](references/perf-checklist.md) for a quick review pass.
