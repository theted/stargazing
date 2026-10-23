# Stargazing

A night sky whose only job is to be beautiful. The real stars of the Yale Bright Star
Catalogue turn slowly over a silhouetted horizon, the Milky Way rises with its dust lanes
and star clouds, meteors streak out of a shower radiant, satellites slide into Earth's
shadow, and in Lapland an aurora hangs its curtains over the spruce forest.

It runs in any browser with WebGL 2, with no runtime dependencies.

## Looking at it

```bash
npm install
npm run dev
```

- **Drag** to look around (it coasts when you let go), **scroll** or **pinch** to zoom.
  Zooming in reveals fainter stars, as binoculars would.
- **Double-click** the sky to make a wish: a meteor streaks through that spot.
- The button in the corner opens a small panel: place, the speed of time, long-exposure
  trails, and the individual layers.
- Keys: `Space` pause, `T` cycle exposure, `1` / `2` places, `R` reset view,
  `M` meteor, `F` full screen, `H` hide everything.

The interface fades away while you are just looking. Choices are remembered per browser.
URL parameters override them, which is handy for sharing a view:

```
?place=lapland&speed=120&trails=60&az=350&alt=30&fov=90&lst=4.5&intro=0&ui=0
```

## How it is made

Everything is drawn in physically motivated linear light and tone mapped with
`1 − e^−x`. That curve makes it possible to draw each star *already tone mapped*
into an sRGB target with `ONE, ONE_MINUS_SRC_COLOR` blending: because
`1 − (1 − a)(1 − b) = 1 − e^−(x + y)`, overlapping light combines exactly as if it had
been summed first, with no float render targets needed.

- **Stars.** The 9,096 catalogue stars keep their real positions, magnitudes and colours.
  Colours come from B−V through blackbody chromaticity. Each star is a point-spread
  function: a pin-sharp core, a skirt and a soft glow, like a lens with a light diffusion
  filter. Only bright stars bloom, and their cores burn white while their halos keep the
  colour. Twinkling is gentle overhead and lively near the horizon, where bright stars
  also flicker in colour.
- **The Milky Way** is described as data: named star clouds, dark nebulae such as the Coalsack
  and the Great Rift, emission nebulae, and the Magellanic Clouds, Andromeda and Omega
  Centauri, all in galactic or equatorial coordinates. A shader adds the procedural band,
  mottling and dust filaments, and bakes the whole galaxy once into a cube map in a few
  tiles per frame. Its light is then read back so that ~140,000 field stars and ~360,000
  faint "dust" stars can be scattered along it. That is why the band reads as a river of
  stars rather than smoke.
- **Atmosphere.** Starlight dims and reddens toward the horizon with air mass. Airglow
  rises in a faint green band with slow gravity-wave ripples, distant towns leave warm
  light domes, and the background sky deepens toward the zenith.
- **Places** are pure data in [`src/sky/places.js`](src/sky/places.js): latitude, a horizon
  composed like a photograph, layered ridges with valley mist, a volcano or a spruce
  treeline, the shower radiant and whether there is an aurora.
- **Aurora** curtains are meandering sheets of light hanging from ~100 km. Every view ray
  is intersected with every sheet, rather than marched through a volume, which gives a
  green lower edge with a pink fringe, red tops, drifting rays and bright folds where a
  curtain is seen edge-on.
- **Long exposure.** Trails are drawn analytically as ribbons along each star's circle around
  the pole, so they stay crisp while the camera moves. The Milky Way smears with them.
- **Projection** is a blend between stereographic and rectilinear
  (`r = scale·tan(αθ)/2α`), so wide skies keep star patterns intact while the horizon
  only bends gently.

The sky turns 36× faster than reality by default, one sidereal hour every 100 seconds.
Twinkle, meteors and the aurora stay in real time. With
`prefers-reduced-motion`, the sky slows to real time and transient effects are disabled.

## Project structure

| Path | Role |
|---|---|
| `src/main.js` | Bootstrap: preferences, URL options, sky, interface |
| `src/ui/` | Caption, settings panel, keyboard, preferences |
| `src/sky/createSky.js` | Runtime: WebGL context, input, time, events, per-frame state |
| `src/sky/config.js` | Tuning surface: defaults, the look, quality tiers |
| `src/sky/places.js` | Observing sites |
| `src/sky/astro.js` | Celestial frames, sidereal time, extinction, star colour |
| `src/sky/projection.js` | Camera projection and composition |
| `src/sky/stars.js` | Catalogue decoding, field and dust star generation |
| `src/sky/milkyway.js` | The galaxy's named features |
| `src/sky/events.js` | Meteors and satellites |
| `src/sky/camera.js` | Drag, inertia, zoom, glides |
| `src/sky/render/` | WebGL resources, passes and shaders (`shaders/*.glsl`) |
| `src/sky/data/bright-stars.js` | Generated catalogue (see below) |

## Quality and performance

`quality: "auto"` picks a tier from the device (`low`, `medium` or `high` in
`QUALITY_TIERS`). The tier sets the pixel-ratio cap, star counts, cube-map size and trail
detail. Faint stars are generated a few milliseconds per frame while the intro fades in, so
start-up never stutters. On an integrated laptop GPU the high tier holds 60 fps at 1600×900
with ~510,000 stars.

## Embedding

`npm run build:embed` writes a single self-contained file, `dist/embed/sky.js` (~83 KB
gzipped, ~56 KB of it the star catalogue). It needs no CSS and no UI:

```html
<canvas class="sky"></canvas>   <!-- optional: created if missing -->
<script src="sky.js"></script>
```

Options are baked in from `embed-config.json`, using any key of `SKY_DEFAULTS`
(`place`, `timeScale`, `trails`, `layers`, `quality`, `interactive`, `intro`). The sky is
exposed as `window.sky`, with `setPlace`, `setTimeScale`, `setTrails`, `setLayer`,
`resetView`, `triggerMeteor`, `getStats` and `dispose`. The same API is `window.sky` on
the main page.

## Scripts

```bash
npm test             # Vitest: frames, projection, catalogue, generation, camera, events
npm run build        # site, GitHub Pages aware (see vite.config.js)
npm run build:embed  # single-file embed
node scripts/build-star-catalog.mjs [catalog.gz]   # regenerate the star data
```

## Credits

Star positions, magnitudes and colours are from the Yale Bright Star Catalogue, 5th
Revised Edition (Hoffleit & Warren, 1991), retrieved from CDS VizieR (catalogue V/50).
