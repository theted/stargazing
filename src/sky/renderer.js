import { TAU } from "./config.js";
import { createAtmosphereCache, drawAtmosphere } from "./atmosphere.js";
import { drawMeteors, updateMeteorSystem } from "./meteors.js";
import { drawNebulae } from "./nebulae.js";
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

const drawStars = (ctx, { stars, config, derived, viewport, scratch, time, timelapseFactor, twinkleTick, rotation }) => {
  const twinkleEnabled = config.twinkleEnabled !== false;
  const spikesEnabled = config.diffractionSpikesEnabled !== false;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (const star of stars) {
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
    const alpha = star.brightness * current.fade * twinkle;
    if (alpha <= MIN_VISIBLE_ALPHA) continue;

    const coreRadius = star.size * current.scale;
    const glowRadius = coreRadius * config.glowScale;
    const shouldDrawGlow = alpha > MIN_GLOW_ALPHA && glowRadius > MIN_GLOW_RADIUS;

    ctx.strokeStyle = star.colorCss;
    ctx.fillStyle = star.colorCss;

    if (shouldDrawGlow) {
      ctx.globalAlpha = alpha * 0.08;
      ctx.beginPath();
      ctx.arc(current.x, current.y, glowRadius, 0, TAU);
      ctx.fill();

      if (star.brightness > 0.62) {
        ctx.globalAlpha = alpha * 0.025;
        ctx.beginPath();
        ctx.arc(current.x, current.y, glowRadius * 2.8, 0, TAU);
        ctx.fill();
      }
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
  config,
  derived,
  meteorSystem,
  scratch,
  trailCtx,
  skyDrift,
  viewport,
  elapsed,
  delta,
}) => {
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  const time = elapsed * config.motionScale;
  const timelapseFactor = config.timelapseEnabled ? config.timelapseIntensity : 0.45;
  const rotation = time * timelapseFactor * config.rotationSpeed + skyDrift;
  const twinkleTick = Math.floor(time * timelapseFactor * 18);
  const starArgs = { stars, config, derived, viewport, scratch, time, timelapseFactor, twinkleTick, rotation };

  drawAtmosphere(ctx, viewport, config, elapsed, scratch.atmosphere);
  updateMeteorSystem({ system: meteorSystem, viewport, config, delta });

  if (trailCtx && config.trailsEnabled) {
    // Fade the opaque buffer toward deep-space black (frame-rate independent exponential decay)
    const decayRate = TRAIL_DECAY_K / Math.max(0.1, config.trailLength);
    const fadeAlpha = 1 - Math.exp(-delta * decayRate);
    trailCtx.globalAlpha = Math.min(1, fadeAlpha);
    trailCtx.fillStyle = "#030509";
    trailCtx.fillRect(0, 0, viewport.width, viewport.height);
    trailCtx.globalAlpha = 1;

    // Accumulate nebulae + stars into the buffer
    if (nebulae?.length) {
      drawNebulae({ ctx: trailCtx, nebulae, rotation, derived, viewport, config });
    }
    drawStars(trailCtx, starArgs);

    // Composite the accumulated buffer onto the main canvas
    ctx.save();
    ctx.globalAlpha = config.trailIntensity ?? 0.85;
    ctx.drawImage(trailCtx.canvas, 0, 0, viewport.width, viewport.height);
    ctx.restore();
  } else {
    // ── Standard mode (no trails) ────────────────────────────────────────
    if (nebulae?.length) {
      drawNebulae({ ctx, nebulae, rotation, derived, viewport, config });
    }
    drawStars(ctx, starArgs);
  }

  ctx.save();
  ctx.globalAlpha = 1;
  drawMeteors({ ctx, system: meteorSystem });
  ctx.restore();
};
