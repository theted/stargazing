import { TAU } from "./config.js";
import { createAtmosphereCache, drawAtmosphere } from "./atmosphere.js";
import { drawMeteors, updateMeteorSystem } from "./meteors.js";
import { sampleStarTwinkle } from "./motion.js";
import { createDirectionTarget, createProjectionTarget, projectStar } from "./projection.js";

const MIN_VISIBLE_ALPHA = 0.015;
const MIN_TRAIL_ALPHA = 0.02;
const MIN_TRAIL_RADIUS = 0.55;
const MIN_GLOW_ALPHA = 0.05;
const MIN_GLOW_RADIUS = 0.9;
const PIXEL_CORE_RADIUS = 0.85;

export const createRenderScratch = () => ({
  atmosphere: createAtmosphereCache(),
  currentDirection: createDirectionTarget(),
  currentProjection: createProjectionTarget(),
  trailDirection: createDirectionTarget(),
  trailProjection: createProjectionTarget(),
});

export const drawSkyFrame = ({
  ctx,
  stars,
  config,
  derived,
  meteorSystem,
  scratch,
  skyDrift,
  viewport,
  elapsed,
  delta,
}) => {
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  const time = elapsed * config.motionScale;
  const timelapseFactor = config.timelapseEnabled ? config.timelapseIntensity : 0.45;
  const rotation = time * timelapseFactor * config.rotationSpeed + skyDrift;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  drawAtmosphere(ctx, viewport, config, elapsed, scratch.atmosphere);
  updateMeteorSystem({
    system: meteorSystem,
    viewport,
    config,
    delta,
  });

  const twinkleTick = Math.floor(time * timelapseFactor * 18);

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

    if (!current.visible) {
      continue;
    }

    if (star.twinkleTick !== twinkleTick) {
      star.twinkleValue = sampleStarTwinkle({
        time,
        star,
        config,
        timelapseFactor,
      });
      star.twinkleTick = twinkleTick;
    }

    const alpha = star.brightness * current.fade * star.twinkleValue;
    if (alpha <= MIN_VISIBLE_ALPHA) {
      continue;
    }

    const lineAlpha = alpha * 0.18;
    const coreRadius = star.size * current.scale;
    const glowRadius = coreRadius * config.glowScale;
    const shouldDrawTrail = lineAlpha > MIN_TRAIL_ALPHA && coreRadius > MIN_TRAIL_RADIUS;
    const shouldDrawGlow = alpha > MIN_GLOW_ALPHA && glowRadius > MIN_GLOW_RADIUS;

    ctx.strokeStyle = star.colorCss;
    ctx.fillStyle = star.colorCss;

    if (shouldDrawTrail) {
      const trail = projectStar({
        star,
        rotation,
        offset: -derived.trailAngle * star.trailScale,
        derived,
        viewport,
        config,
        directionTarget: scratch.trailDirection,
        target: scratch.trailProjection,
      });

      if (trail.visible) {
        ctx.globalAlpha = lineAlpha;
        ctx.lineWidth = Math.max(0.35, star.size * 0.55 * current.scale);
        ctx.beginPath();
        ctx.moveTo(trail.x, trail.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
      }
    }

    if (shouldDrawGlow) {
      ctx.globalAlpha = alpha * 0.08;
      ctx.beginPath();
      ctx.arc(current.x, current.y, glowRadius, 0, TAU);
      ctx.fill();
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

  ctx.globalAlpha = 1;
  drawMeteors({
    ctx,
    system: meteorSystem,
  });

  ctx.restore();
};
