# Stargazing

`stargazing` is a small canvas-based night-sky background study for portfolio-style pages. It renders a transparent fullscreen starfield with slow celestial motion, subtle twinkle, and timelapse-style trails over a dark radial backdrop.

## What It Is

The effect is designed to be understated rather than flashy:

- fullscreen canvas with transparent rendering
- dark page background with a soft radial gradient
- star distribution biased toward natural variation
- slow sky rotation with long exposure-style motion trails
- modest glow and twinkle to keep the field alive without dominating content

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run the test suite:

```bash
npm test
```

## Project Structure

- [`index.html`](/home/fredrik/Documents/playground/stargazing/index.html) is the Vite entry page and mounts the fullscreen canvas.
- [`src/main.js`](/home/fredrik/Documents/playground/stargazing/src/main.js) boots the sky effect and exposes `window.skyDemo`.
- [`src/styles.css`](/home/fredrik/Documents/playground/stargazing/src/styles.css) defines the page background, layout, and canvas sizing.
- [`src/sky/config.js`](/home/fredrik/Documents/playground/stargazing/src/sky/config.js) contains the main tuning constants.
- [`src/sky/createSky.js`](/home/fredrik/Documents/playground/stargazing/src/sky/createSky.js) owns canvas lifecycle, resize handling, and animation loop setup.
- [`src/sky/projection.js`](/home/fredrik/Documents/playground/stargazing/src/sky/projection.js) handles camera setup and star projection math.
- [`src/sky/stars.js`](/home/fredrik/Documents/playground/stargazing/src/sky/stars.js) generates the star particles and color variation.
- [`src/sky/renderer.js`](/home/fredrik/Documents/playground/stargazing/src/sky/renderer.js) draws trails, glows, and star cores for each frame.
- [`src/sky/math.js`](/home/fredrik/Documents/playground/stargazing/src/sky/math.js) provides the shared math helpers.
- [`tests/sky.test.js`](/home/fredrik/Documents/playground/stargazing/tests/sky.test.js) verifies the core geometry and projection behavior.

## Tuning Controls

The main configuration lives in [`src/sky/config.js`](/home/fredrik/Documents/playground/stargazing/src/sky/config.js). The most useful knobs are:

- `density`, `minStars`, `maxStars`: controls star count by viewport size.
- `observerLatitude`: changes the sky orientation and trail feel.
- `lookAzimuth`, `lookAltitude`, `lookRoll`: sets the camera angle.
- `fieldOfView`: changes how wide the sky appears.
- `rotationSpeed`: controls how quickly the starfield turns.
- `trailExposureSeconds`, `trailTimeWarp`: controls trail length and perceived exposure.
- `baseStarSize`, `maxStarSize`, `glowScale`: changes visual weight and softness.
- `twinkleAmount`, `twinkleSpeedMin`, `twinkleSpeedMax`: controls subtle star shimmer.
- `horizonFadeStart`, `horizonFadeEnd`, `edgeFadeStart`, `edgeFadeEnd`: adjusts visibility falloff near the horizon and frame edges.
- `dprCap`: caps device pixel ratio for performance.

At runtime, the app instance is exposed as `window.skyDemo` with:

- `window.skyDemo.regenerate()` to rebuild the stars
- `window.skyDemo.applyConfig()` to re-sync derived values after changing `window.skyDemo.config`
- `window.skyDemo.dispose()` to stop the animation and remove listeners

## Visual And Performance Goals

The target is a background effect that feels atmospheric but stays out of the way of the page content. The implementation keeps the rendering pipeline simple: one canvas, one animation loop, batched drawing per star, capped device pixel ratio, and a limited star count based on viewport area.

The default camera is pitched to feel like an interesting sky view rather than a flat top-down starfield, and the trail length is tuned to read as time-lapse motion instead of full streaks. If you want a more subtle backdrop, reduce `density`, `rotationSpeed`, `trailExposureSeconds`, and `glowScale` first.
