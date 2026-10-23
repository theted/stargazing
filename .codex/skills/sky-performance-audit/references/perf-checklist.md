# Performance Checklist

## First Pass

- Frame intervals during start-up: only the first frame (shader compilation) may be long.
- Steady state at 60 fps on the high tier at 1600×900.

## Second Pass

- Star pass: dust and field counts per tier, quad sizes (glow radius only for bright stars).
- Composite: landscape evaluation is skipped above `landscapeTop`.
- Aurora: only rendered for places that have one, at half resolution.

## Third Pass

- Trails: instance count × segments; long exposures on low tiers.
- Phones: `low`/`medium` tier, pixel-ratio cap, portrait framing.

## Final Check

- `npm test` and `npm run build`.
- Name the top bottleneck and the tier setting that controls it.
