import { clamp, lerp, smoothstep } from "./math.js";

export const warpSkyProjection = ({
  projection,
  direction,
  viewX,
  viewY,
  viewZ,
  viewport,
  config,
}) => {
  const coverageStrength = config.screenCoverageBoost ?? 0;
  const edgeStrength = config.edgeMagnification ?? 0;
  const horizonStrength = config.horizonMagnification ?? 0;

  if (
    !config.atmosphereEnabled &&
    !config.gravityEnabled &&
    coverageStrength <= 0 &&
    edgeStrength <= 0 &&
    horizonStrength <= 0
  ) {
    return projection;
  }

  const horizon = clamp(1 - direction.y, 0, 1);
  const focus = clamp((Math.abs(viewX) + Math.abs(viewY)) * 6, 0, 1);
  const atmosphere = config.atmosphereEnabled
    ? smoothstep(0.02, 0.85, horizon) * config.atmosphereStrength * focus
    : 0;
  const gravity = config.gravityEnabled
    ? smoothstep(0.15, 1.1, 1 - viewZ) * config.gravityStrength * focus
    : 0;
  const coverageBoost = 1 + coverageStrength * smoothstep(0.08, 1, 1 - direction.y);
  const edgeBoost = 1 + edgeStrength * smoothstep(0.2, 1.15, 1 - viewZ);
  const horizonBoost = 1 + horizonStrength * smoothstep(-0.05, 0.3, horizon);
  const centerPull = lerp(0.96, 0.8, gravity);
  const lift = atmosphere * viewport.height * 0.018;
  const shimmer = atmosphere * Math.sin((viewX + viewY) * 10) * viewport.width * 0.0025;

  return {
    visible: projection.visible,
    x: viewport.cx + (projection.x - viewport.cx) * centerPull * coverageBoost * edgeBoost + shimmer * 0.5,
    y: projection.y + lift - gravity * viewport.height * 0.012 * horizonBoost,
    scale: projection.scale * (1 + atmosphere * 0.18 + gravity * 0.08) * coverageBoost * horizonBoost,
    fade: projection.fade * (1 - atmosphere * 0.16),
  };
};

export const drawAtmosphere = (ctx, viewport, config, elapsed) => {
  if (!config.atmosphereEnabled) {
    return;
  }

  const shimmer = Math.sin(elapsed * 0.55 + config.driftSeed) * 0.5 + 0.5;
  const hazeAlpha = 0.18 * config.atmosphereStrength * config.atmosphereGlow * (0.7 + shimmer * 0.3);
  const horizonY = viewport.height * 0.28;
  const bottomY = viewport.height;

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  const haze = ctx.createLinearGradient(0, horizonY, 0, bottomY);
  haze.addColorStop(0, `rgba(126, 170, 255, ${0.01 * hazeAlpha})`);
  haze.addColorStop(0.45, `rgba(52, 92, 182, ${0.09 * hazeAlpha})`);
  haze.addColorStop(1, `rgba(10, 18, 38, ${0.28 * hazeAlpha})`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizonY, viewport.width, bottomY - horizonY);

  const glow = ctx.createRadialGradient(
    viewport.cx,
    viewport.height * 0.34,
    0,
    viewport.cx,
    viewport.height * 0.34,
    viewport.width * 0.82
  );
  glow.addColorStop(0, `rgba(124, 166, 255, ${0.05 * hazeAlpha})`);
  glow.addColorStop(0.35, `rgba(68, 108, 198, ${0.08 * hazeAlpha})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.restore();
};
