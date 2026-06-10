import { TAU } from "./config.js";
import { createAtmosphereCache, drawAtmosphere } from "./atmosphere.js";
import { drawAurora } from "./aurora.js";
import { drawMeteors, updateMeteorSystem } from "./meteors.js";
import { drawMilkyWay } from "./milkyway.js";
import { drawNebulae } from "./nebulae.js";
import { drawSatellites, updateSatelliteSystem } from "./satellites.js";
import { sampleStarTwinkle } from "./motion.js";
import { lerp, smoothstep } from "./math.js";
import { createDirectionTarget, createProjectionTarget, projectStar } from "./projection.js";

const MIN_VISIBLE_ALPHA = 0.015;
const MIN_GLOW_ALPHA = 0.05;
const MIN_GLOW_RADIUS = 0.9;
const PIXEL_CORE_RADIUS = 0.85;
const SPIKE_BRIGHTNESS_THRESHOLD = 0.52;

// Frame-rate-independent trail decay constant: 95% fades after `trailLength` real seconds
const TRAIL_DECAY_K = Math.log(20);

// Pre-rendered glow sprites, one per spectral class. A single scaled drawImage
// replaces the one or two arc fills per star and gives a softer bloom falloff.
const GLOW_SPRITE_SIZE = 64;
const GLOW_SPRITE_COLORS = [
  { r: 150, g: 190, b: 255 }, // O/B blue
  { r: 222, g: 232, b: 255 }, // A/F white
  { r: 255, g: 240, b: 208 }, // G warm white
  { r: 255, g: 205, b: 130 }, // K orange
  { r: 255, g: 145, b: 85 }, // M red
];
const glowSpriteCache = [];

const getGlowSprite = (index) => {
  if (!glowSpriteCache[index]) {
    const sprite = document.createElement("canvas");
    sprite.width = GLOW_SPRITE_SIZE;
    sprite.height = GLOW_SPRITE_SIZE;

    const spriteCtx = sprite.getContext("2d");
    const { r, g, b } = GLOW_SPRITE_COLORS[index] ?? GLOW_SPRITE_COLORS[1];
    const half = GLOW_SPRITE_SIZE / 2;
    const gradient = spriteCtx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.55)`);
    gradient.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, 0.18)`);
    gradient.addColorStop(0.62, `rgba(${r}, ${g}, ${b}, 0.05)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    spriteCtx.fillStyle = gradient;
    spriteCtx.fillRect(0, 0, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
    glowSpriteCache[index] = sprite;
  }

  return glowSpriteCache[index];
};

export const createRenderScratch = () => ({
  atmosphere: createAtmosphereCache(),
  currentDirection: createDirectionTarget(),
  currentProjection: createProjectionTarget(),
});

const drawDiffractionSpikes = (ctx, x, y, brightness, coreRadius, glowScale, colorCss, alpha) => {
  const spikeFraction = smoothstep(SPIKE_BRIGHTNESS_THRESHOLD, 1.0, brightness);
  const spikeLen = coreRadius * glowScale * lerp(1.2, 3.2, spikeFraction);
  const spikeAlpha = alpha * spikeFraction * 0.38;
  const spikeWidth = Math.max(0.22, coreRadius * 0.11);

  ctx.globalAlpha = spikeAlpha;
  ctx.lineWidth = spikeWidth;
  ctx.strokeStyle = colorCss;

  // Horizontal + vertical cross as a single stroke call
  ctx.beginPath();
  ctx.moveTo(x - spikeLen, y); ctx.lineTo(x + spikeLen, y);
  ctx.moveTo(x, y - spikeLen); ctx.lineTo(x, y + spikeLen);
  ctx.stroke();

  if (spikeFraction > 0.65) {
    const d = spikeLen * 0.62;
    ctx.globalAlpha = spikeAlpha * 0.55;
    ctx.beginPath();
    ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d);
    ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d);
    ctx.stroke();
  }
};

const drawStars = (ctx, { stars, config, derived, viewport, scratch, time, timelapseFactor, twinkleTick, rotation, alphaScale = 1, quality = 1 }) => {
  const twinkleEnabled = config.twinkleEnabled !== false;
  const spikesEnabled = config.diffractionSpikesEnabled !== false;
  // Stars are sorted brightest-first, so shedding quality drops the dimmest ones.
  const drawCount = quality >= 1 ? stars.length : Math.round(stars.length * quality);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (let index = 0; index < drawCount; index += 1) {
    const star = stars[index];
    const current = projectStar({
      star,
      rotation,
      derived,
      viewport,
      config,
      directionTarget: scratch.currentDirection,
      target: scratch.currentProjection,
    });

    if (!current.visible) continue;

    if (twinkleEnabled && star.twinkleTick !== twinkleTick) {
      star.twinkleValue = sampleStarTwinkle({ time, star, config, timelapseFactor });
      star.twinkleTick = twinkleTick;
    }

    const twinkle = twinkleEnabled ? star.twinkleValue : 1;
    const alpha = star.brightness * current.fade * twinkle * alphaScale;
    if (alpha <= MIN_VISIBLE_ALPHA) continue;

    const coreRadius = star.size * current.scale;
    const glowRadius =
      coreRadius * config.glowScale * lerp(1, 1.75, smoothstep(0.62, 1, star.brightness));
    const shouldDrawGlow = alpha > MIN_GLOW_ALPHA && glowRadius > MIN_GLOW_RADIUS;

    ctx.strokeStyle = star.colorCss;
    ctx.fillStyle = star.colorCss;

    if (shouldDrawGlow) {
      ctx.globalAlpha = Math.min(1, alpha * 0.55);
      ctx.drawImage(
        getGlowSprite(star.spriteIndex ?? 1),
        current.x - glowRadius,
        current.y - glowRadius,
        glowRadius * 2,
        glowRadius * 2
      );
    }

    if (spikesEnabled && star.brightness > SPIKE_BRIGHTNESS_THRESHOLD && coreRadius > 0.85) {
      drawDiffractionSpikes(ctx, current.x, current.y, star.brightness, coreRadius, config.glowScale, star.colorCss, alpha);
    }

    ctx.globalAlpha = alpha;

    if (coreRadius <= PIXEL_CORE_RADIUS) {
      const pixelSize = Math.max(1, coreRadius * 1.6);
      ctx.fillRect(
        current.x - pixelSize * 0.5,
        current.y - pixelSize * 0.5,
        pixelSize,
        pixelSize
      );
      continue;
    }

    ctx.beginPath();
    ctx.arc(current.x, current.y, coreRadius, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
};

export const drawSkyFrame = ({
  ctx,
  stars,
  nebulae,
  milkyWay,
  auroraBands,
  config,
  derived,
  meteorSystem,
  satelliteSystem,
  scratch,
  trailCtx,
  skyDrift,
  viewport,
  elapsed,
  delta,
  quality = 1,
}) => {
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  const time = elapsed * config.motionScale;
  const timelapseFactor = config.timelapseEnabled ? config.timelapseIntensity : 0.45;
  const rotation = time * timelapseFactor * config.rotationSpeed + skyDrift;
  const twinkleTick = Math.floor(time * timelapseFactor * 18);
  const starArgs = { stars, config, derived, viewport, scratch, time, timelapseFactor, twinkleTick, rotation, quality };
  const skyArgs = { rotation, derived, viewport, config };

  drawAtmosphere(ctx, viewport, config, elapsed, scratch.atmosphere);
  updateMeteorSystem({ system: meteorSystem, viewport, config, delta });

  if (satelliteSystem) {
    updateSatelliteSystem({ system: satelliteSystem, viewport, config, delta });
  }

  if (trailCtx && config.trailsEnabled) {
    // Fade the opaque buffer toward deep-space black (frame-rate independent exponential decay)
    const decayRate = TRAIL_DECAY_K / Math.max(0.1, config.trailLength);
    const fadeAlpha = 1 - Math.exp(-delta * decayRate);
    trailCtx.globalAlpha = Math.min(1, fadeAlpha);
    trailCtx.fillStyle = "#030509";
    trailCtx.fillRect(0, 0, viewport.width, viewport.height);
    trailCtx.globalAlpha = 1;

    // Auto-exposure: scale per-star alpha proportional to fadeAlpha so the
    // steady-state buffer brightness (alphaScale / fadeAlpha) stays constant
    // regardless of trail length. trailIntensity acts as a linear brightness gain.
    const alphaScale = fadeAlpha * (config.trailIntensity ?? 0.85) * 14;

    // Accumulate milky way + nebulae + stars into the buffer
    if (milkyWay?.length) {
      drawMilkyWay({ ctx: trailCtx, milkyWay, ...skyArgs, alphaScale });
    }
    if (nebulae?.length) {
      drawNebulae({ ctx: trailCtx, nebulae, ...skyArgs, alphaScale });
    }
    drawStars(trailCtx, { ...starArgs, alphaScale });

    // Composite the accumulated buffer onto the main canvas
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(trailCtx.canvas, 0, 0, viewport.width, viewport.height);
    ctx.restore();

    // Aurora must not accumulate in the trail buffer (it would smear),
    // so it is washed over the composited trails instead.
    drawAurora({ ctx, bands: auroraBands, viewport, config, elapsed });
  } else {
    // ── Standard mode (no trails) ────────────────────────────────────────
    drawAurora({ ctx, bands: auroraBands, viewport, config, elapsed });

    if (milkyWay?.length) {
      drawMilkyWay({ ctx, milkyWay, ...skyArgs });
    }
    if (nebulae?.length) {
      drawNebulae({ ctx, nebulae, ...skyArgs });
    }
    drawStars(ctx, starArgs);
  }

  ctx.save();
  ctx.globalAlpha = 1;

  if (satelliteSystem) {
    drawSatellites({ ctx, system: satelliteSystem, viewport });
  }

  drawMeteors({ ctx, system: meteorSystem });
  ctx.restore();
};
