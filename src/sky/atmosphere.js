import { clamp, lerp, smoothstep } from "./math.js";
import { sampleAtmospherePulse } from "./motion.js";

export const createAtmosphereCache = () => ({
  width: 0,
  height: 0,
  haze: null,
  glow: null,
  horizonY: 0,
});

const assignProjection = (target, visible, x, y, scale, fade) => {
  target.visible = visible;
  target.x = x;
  target.y = y;
  target.scale = scale;
  target.fade = fade;
  return target;
};

export const warpSkyProjection = ({
  projection,
  projectionX,
  projectionY,
  projectionScale,
  projectionFade,
  direction,
  viewX,
  viewY,
  viewZ,
  viewport,
  config,
  target = {
    visible: false,
    x: 0,
    y: 0,
    scale: 1,
    fade: 0,
  },
}) => {
  const coverageStrength = config.screenCoverageBoost ?? 0;
  const edgeStrength = config.edgeMagnification ?? 0;
  const horizonStrength = config.horizonMagnification ?? 0;
  const baseVisible = projection?.visible ?? true;
  const baseX = projection?.x ?? projectionX;
  const baseY = projection?.y ?? projectionY;
  const baseScale = projection?.scale ?? projectionScale;
  const baseFade = projection?.fade ?? projectionFade;

  if (
    !config.atmosphereEnabled &&
    !config.gravityEnabled &&
    coverageStrength <= 0 &&
    edgeStrength <= 0 &&
    horizonStrength <= 0
  ) {
    return assignProjection(
      target,
      baseVisible,
      baseX,
      baseY,
      baseScale,
      baseFade
    );
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

  return assignProjection(
    target,
    baseVisible,
    viewport.cx +
      (baseX - viewport.cx) * centerPull * coverageBoost * edgeBoost +
      shimmer * 0.5,
    baseY + lift - gravity * viewport.height * 0.012 * horizonBoost,
    baseScale *
      (1 + atmosphere * 0.18 + gravity * 0.08) *
      coverageBoost *
      horizonBoost,
    baseFade * (1 - atmosphere * 0.16)
  );
};

const ensureAtmosphereCache = (cache, ctx, viewport) => {
  if (cache.width === viewport.width && cache.height === viewport.height) {
    return cache;
  }

  const horizonY = viewport.height * 0.28;
  const haze = ctx.createLinearGradient(0, horizonY, 0, viewport.height);
  haze.addColorStop(0, "rgba(126, 170, 255, 0.01)");
  haze.addColorStop(0.45, "rgba(52, 92, 182, 0.09)");
  haze.addColorStop(1, "rgba(10, 18, 38, 0.28)");

  const glow = ctx.createRadialGradient(
    viewport.cx,
    viewport.height * 0.34,
    0,
    viewport.cx,
    viewport.height * 0.34,
    viewport.width * 0.82
  );
  glow.addColorStop(0, "rgba(124, 166, 255, 0.05)");
  glow.addColorStop(0.35, "rgba(68, 108, 198, 0.08)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");

  cache.width = viewport.width;
  cache.height = viewport.height;
  cache.horizonY = horizonY;
  cache.haze = haze;
  cache.glow = glow;
  return cache;
};

export const drawAtmosphere = (
  ctx,
  viewport,
  config,
  elapsed,
  cache = createAtmosphereCache()
) => {
  if (!config.atmosphereEnabled) {
    return;
  }

  const pulse = sampleAtmospherePulse({ elapsed, config });
  const hazeAlpha = 0.18 * config.atmosphereStrength * config.atmosphereGlow * pulse;
  const atmosphereCache = ensureAtmosphereCache(cache, ctx, viewport);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = hazeAlpha;
  ctx.fillStyle = atmosphereCache.haze;
  ctx.fillRect(
    0,
    atmosphereCache.horizonY,
    viewport.width,
    viewport.height - atmosphereCache.horizonY
  );
  ctx.fillStyle = atmosphereCache.glow;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.restore();
};
