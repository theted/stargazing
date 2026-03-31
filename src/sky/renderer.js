import { TAU } from "./config.js";
import { projectStar } from "./projection.js";

export const drawSkyFrame = ({
  ctx,
  stars,
  config,
  derived,
  viewport,
  elapsed,
  delta,
}) => {
  ctx.clearRect(0, 0, viewport.width, viewport.height);

  const time = elapsed * config.motionScale;
  const frameDelta = delta * config.motionScale;
  const drift = Math.sin(time * 0.09 + config.driftSeed) * config.backgroundParallax;
  const rotation = time * config.rotationSpeed + drift;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const star of stars) {
    const current = projectStar({
      star,
      rotation,
      derived,
      viewport,
      config,
    });

    if (!current.visible) {
      continue;
    }

    const trail = projectStar({
      star,
      rotation,
      offset: -derived.trailAngle * star.trailScale,
      derived,
      viewport,
      config,
    });

    const twinkle =
      1 -
      config.twinkleAmount * 0.5 +
      Math.sin(time * star.twinkleSpeed + star.twinklePhase + frameDelta * star.driftFactor) *
        config.twinkleAmount *
        0.5;
    const alpha = star.brightness * current.fade * twinkle;
    const lineAlpha = alpha * 0.18;
    const { r, g, b } = star.color;

    if (trail.visible) {
      ctx.beginPath();
      ctx.moveTo(trail.x, trail.y);
      ctx.lineTo(current.x, current.y);
      ctx.lineWidth = Math.max(0.35, star.size * 0.55 * current.scale);
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${lineAlpha})`;
      ctx.stroke();
    }

    const glowRadius = star.size * current.scale * config.glowScale;
    const coreRadius = star.size * current.scale;

    ctx.beginPath();
    ctx.arc(current.x, current.y, glowRadius, 0, TAU);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.08})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(current.x, current.y, coreRadius, 0, TAU);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fill();
  }

  ctx.restore();
};
