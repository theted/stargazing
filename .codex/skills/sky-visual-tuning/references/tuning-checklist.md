# Tuning Checklist

## First Pass

- Frame each place: horizon on the lower third, the hero (galactic core, pole, aurora)
  in view at `startLst`.
- Check star exposure: mag 0 stars bloom softly, mag 6 stars are just visible.

## Second Pass

- Milky Way: dust lanes read, the band resolves into stars when zoomed in.
- Atmosphere: zenith deep blue, airglow band low and subtle, light domes warm and small.

## Third Pass

- Trails (`?trails=90`): concentric arcs, smeared galaxy, faint stars faded.
- Meteors (`sky.triggerMeteor({ fireball: true, x, y })`): head blooms, wake tapers.
- Lapland aurora: bright lower edge, rays, no speckles where curtains are seen edge-on.

## Final Check

- `npm test`, `npm run build`.
- Desktop (1600×900), portrait phone (390×844 at DPR 2), zoom (`fov=30`).
