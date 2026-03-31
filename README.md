# Stargazing

`stargazing` is a small canvas-based night-sky background study for portfolio-style pages. It renders a transparent fullscreen starfield with slow celestial motion, subtle twinkle, and timelapse-style trails over a dark radial backdrop.

## What It Is

The effect is designed to be understated rather than flashy:

- fullscreen canvas with transparent rendering
- dark page background with a soft radial gradient
- star distribution biased toward natural variation
- slow sky rotation with long exposure-style motion trails
- subtle atmospheric projection warp that stretches the sky toward the edges
- rare meteor streaks for occasional higher-energy moments
- modest glow and twinkle to keep the field alive without dominating content
- live controls for tuning the scene directly in the browser
- camera presets, scene presets, saved settings, and clipboard export for config snippets
- seeded randomization for reproducible exploration
- a small FPS overlay for quick performance checks while tuning

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

Build with the GitHub Pages base path logic applied:

```bash
GITHUB_ACTIONS=true GITHUB_REPOSITORY="<owner>/<repo>" npm run build
```

Preview the production build:

```bash
npm run preview
```

Run the test suite:

```bash
npm test
```

## GitHub Pages

The repo is now prepared for GitHub Pages with:

- dynamic Vite `base` handling in [`vite.config.js`](/home/fredrik/Documents/playground/stargazing/vite.config.js)
- a deploy workflow in [`.github/workflows/deploy.yml`](/home/fredrik/Documents/playground/stargazing/.github/workflows/deploy.yml)

The Vite base is resolved automatically:

- `https://<user>.github.io/` or a custom domain builds with `/`
- `https://<user>.github.io/<repo>/` builds with `/<repo>/`

To enable deployment on GitHub:

1. Push the repository to GitHub.
2. In `Settings -> Pages`, set `Source` to `GitHub Actions`.
3. Push to `master` or `main`, or run the workflow manually from the `Actions` tab.

The workflow installs dependencies, runs `npm test -- --run`, builds the site, uploads `dist`, and deploys it with the official GitHub Pages actions.

## Project Structure

- [`index.html`](/home/fredrik/Documents/playground/stargazing/index.html) is the Vite entry page and mounts the fullscreen canvas.
- [`vite.config.js`](/home/fredrik/Documents/playground/stargazing/vite.config.js) configures the deployment base path, including GitHub Pages support.
- [`src/main.js`](/home/fredrik/Documents/playground/stargazing/src/main.js) boots the sky effect and exposes `window.skyDemo`.
- [`src/styles.css`](/home/fredrik/Documents/playground/stargazing/src/styles.css) defines the page background, layout, and canvas sizing.
- [`src/sky/config.js`](/home/fredrik/Documents/playground/stargazing/src/sky/config.js) contains the main tuning constants.
- [`src/sky/config-source.js`](/home/fredrik/Documents/playground/stargazing/src/sky/config-source.js) formats the config as source code for clipboard export.
- [`src/sky/config-storage.js`](/home/fredrik/Documents/playground/stargazing/src/sky/config-storage.js) persists the current controls to `localStorage`.
- [`src/sky/presets.js`](/home/fredrik/Documents/playground/stargazing/src/sky/presets.js) defines the camera presets.
- [`src/sky/scene-presets.js`](/home/fredrik/Documents/playground/stargazing/src/sky/scene-presets.js) defines named high-impact scene presets.
- [`src/sky/randomize.js`](/home/fredrik/Documents/playground/stargazing/src/sky/randomize.js) provides deterministic seeded config randomization.
- [`src/sky/atmosphere.js`](/home/fredrik/Documents/playground/stargazing/src/sky/atmosphere.js) adds atmosphere and gravity-style projection distortion.
- [`src/sky/meteors.js`](/home/fredrik/Documents/playground/stargazing/src/sky/meteors.js) manages rare meteor streaks and their rendering.
- [`src/sky/createSky.js`](/home/fredrik/Documents/playground/stargazing/src/sky/createSky.js) owns canvas lifecycle, resize handling, and animation loop setup.
- [`src/sky/projection.js`](/home/fredrik/Documents/playground/stargazing/src/sky/projection.js) handles camera setup and star projection math.
- [`src/sky/stars.js`](/home/fredrik/Documents/playground/stargazing/src/sky/stars.js) generates the star particles and color variation.
- [`src/sky/renderer.js`](/home/fredrik/Documents/playground/stargazing/src/sky/renderer.js) draws trails, glows, and star cores for each frame.
- [`src/sky/math.js`](/home/fredrik/Documents/playground/stargazing/src/sky/math.js) provides the shared math helpers.
- [`src/ui/createControls.js`](/home/fredrik/Documents/playground/stargazing/src/ui/createControls.js) mounts the live control panel.
- [`src/ui/display-state.js`](/home/fredrik/Documents/playground/stargazing/src/ui/display-state.js) persists benchmark-box display mode and size state.
- [`src/ui/createFpsCounter.js`](/home/fredrik/Documents/playground/stargazing/src/ui/createFpsCounter.js) shows the smoothed frame rate and live star count.
- [`tests/sky.test.js`](/home/fredrik/Documents/playground/stargazing/tests/sky.test.js) verifies the core geometry and projection behavior.

## Tuning Controls

The main configuration lives in [`src/sky/config.js`](/home/fredrik/Documents/playground/stargazing/src/sky/config.js). The most useful knobs are:

- `density`, `minStars`, `maxStars`: controls star count by viewport size.
- `observerLatitude`: changes the sky orientation and trail feel.
- `lookAzimuth`, `lookAltitude`, `lookRoll`: sets the camera angle.
- `fieldOfView`: changes how wide the sky appears.
- `rotationSpeed`: controls how quickly the starfield turns.
- `motionScale`, `timelapseEnabled`, `timelapseIntensity`: controls the speed-up used for the timelapse feel.
- `trailExposureSeconds`, `trailTimeWarp`: controls trail length and perceived exposure.
- `baseStarSize`, `maxStarSize`, `starSizeVariation`, `sizeVariationEnabled`, `glowScale`: changes visual weight and softness.
- `twinkleAmount`, `twinkleSpeedMin`, `twinkleSpeedMax`: controls subtle star shimmer.
- `bandWeight`, `bandAmplitude`, `bandSpread`, `starSpread`: controls how clustered and varied the star distribution feels.
- `atmosphereEnabled`, `atmosphereStrength`, `gravityEnabled`, `gravityStrength`: controls the stronger atmospheric and lensing effects.
- `screenCoverageBoost`, `edgeMagnification`, `horizonMagnification`: pushes the illusion of scale toward the screen edges.
- `meteorsEnabled`, `meteorRate`, `meteorTrailLength`, `meteorGlow`: controls the meteor layer.
- `horizonFadeStart`, `horizonFadeEnd`, `edgeFadeStart`, `edgeFadeEnd`: adjusts visibility falloff near the horizon and frame edges.
- `dprCap`: caps device pixel ratio for performance.
- `cameraPreset`: selects the initial camera pose on the globe.
- named scene presets provide curated looks, and the seeded randomizer lets you revisit any generated configuration by reusing the same seed.

At runtime, the app instance is exposed as `window.skyDemo` with:

- `window.skyDemo.regenerate()` to rebuild the stars
- `window.skyDemo.applyConfig()` to re-sync derived values after changing `window.skyDemo.config`
- `window.skyDemo.copyConfigToClipboard()` to copy the current config as a source snippet
- `window.skyDemo.getConfigSource()` to inspect the current config string in code format
- `window.skyDemo.getStats()` to inspect smoothed FPS, star count, and active meteors
- `window.skyDemo.dispose()` to stop the animation and remove listeners

The live control panel also saves to `localStorage` automatically, so the next reload starts with the same values. Use the reset button in the panel to clear the stored settings. The panel can be collapsed when you want an unobstructed look at the sky, many slider ranges are intentionally broad enough for stress-testing and extreme tuning passes, and the randomizer now supports explicit seeds so you can keep or share a generated look.

## Embedding

If you want the effect in another project, import the sky bootstrap and mount it on a canvas:

```js
import { SKY_CONFIG } from "./src/sky/config.js";
import { createSky } from "./src/sky/createSky.js";

const sky = createSky(document.querySelector(".sky"), SKY_CONFIG);
```

If you want the example controls too, mount `src/main.js` or wire `src/ui/createControls.js` next to the canvas. The controls are optional and the core sky renderer is separate.

## Project Skills

The repo includes project-local Codex skills for future work:

- [`.codex/skills/sky-engine-dev/SKILL.md`](/home/fredrik/Documents/playground/stargazing/.codex/skills/sky-engine-dev/SKILL.md) for architecture, math, rendering, and validation changes
- [`.codex/skills/sky-visual-tuning/SKILL.md`](/home/fredrik/Documents/playground/stargazing/.codex/skills/sky-visual-tuning/SKILL.md) for aesthetic and performance tuning passes

## Visual And Performance Goals

The target is a background effect that feels atmospheric but stays out of the way of the page content. The implementation keeps the rendering pipeline simple: one canvas, one animation loop, batched drawing per star, capped device pixel ratio, and a limited star count based on viewport area.

The default camera is pitched to feel like an interesting sky view rather than a flat top-down starfield, and the trail length is tuned to read as time-lapse motion instead of full streaks. The current defaults are more cinematic and more screen-filling than the original subtle pass, but they still keep the star count and DPR bounded so the effect remains practical as a background layer. The production build is Vite-optimized and minified, while the runtime keeps rendering bounded by capping DPR and star counts.

If you want a more subtle backdrop, reduce `density`, `rotationSpeed`, `motionScale`, `trailExposureSeconds`, `glowScale`, and `screenCoverageBoost` first, or disable meteors entirely.
