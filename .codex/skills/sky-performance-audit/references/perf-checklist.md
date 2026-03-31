# Performance Checklist

## First Pass

- Check for per-star object allocation in projection and rendering.
- Check for per-frame gradient creation and per-star string construction.
- Check whether tiny or dim stars still pay for glow and trail work.

## Second Pass

- Compare fullscreen against `300 x 300` stage mode.
- Inspect FPS together with render size, star count, and meteor count.
- Stress `dprCap`, `density`, `maxStars`, `trailTimeWarp`, and `glowScale`.

## Third Pass

- Look for opportunities to quantize or cache twinkle, trail, or atmosphere work.
- Prefer pixel fills for tiny stars before reducing total star count.
- Revisit meteors only after the star field hot path is under control.

## Final Check

- Run `npm test -- --run`.
- Run `npm run build`.
- Call out the top 1-3 remaining bottlenecks and the config knobs that affect them most.
