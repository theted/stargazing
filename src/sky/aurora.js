import { clamp, hashNoise1D, lerp, smoothstep, valueNoise1D } from "./math.js";

const MAX_BANDS = 4;
const EDGE_STEPS = 24;

// Deterministic curtain parameters derived from the config seed, so the same
// seed always produces the same aurora layout.
export const createAuroraBands = (config) => {
  const count = clamp(Math.round(config.auroraBands ?? 3), 1, MAX_BANDS);
  const seed = (config.driftSeed ?? 0) * 13.7;

  return Array.from({ length: count }, (_, index) => {
    const sample = (key) => hashNoise1D(index * 7.31 + key, seed);

    return {
      seed: index * 19.7 + seed,
      baseY: lerp(0.64, 0.84, sample(1)) - index * 0.055,
      heightScale: lerp(0.7, 1.2, sample(2)),
      speed: lerp(0.7, 1.35, sample(3)),
      hueOffset: lerp(-16, 26, sample(4)),
      alpha: lerp(0.6, 1, sample(5)),
      waveFrequency: lerp(1.8, 3.2, sample(6)),
      phase: sample(7) * 10,
    };
  });
};

// Normalized (0..1) height of a curtain's upper edge at horizontal position x (0..1).
export const auroraEdgeOffset = (x, time, band) => {
  const base = valueNoise1D(
    x * band.waveFrequency + time * 0.05 * band.speed + band.phase,
    band.seed
  );
  const detail = valueNoise1D(
    x * band.waveFrequency * 3.1 - time * 0.085 * band.speed,
    band.seed + 11.3
  );

  return clamp(base * 0.72 + detail * 0.28, 0, 1);
};

const hsla = (hue, saturation, lightness, alpha) =>
  `hsla(${hue.toFixed(1)}, ${saturation}%, ${lightness}%, ${alpha.toFixed(3)})`;

export const drawAurora = ({ ctx, bands, viewport, config, elapsed }) => {
  if (!config.auroraEnabled || !bands?.length) {
    return;
  }

  const intensity = config.auroraIntensity ?? 0.5;
  // Curtains live near the horizon, so fade them out as the camera tilts to zenith.
  const altitudeFade = lerp(1, 0.4, smoothstep(45, 89, config.lookAltitude ?? 60));

  if (intensity * altitudeFade <= 0.015) {
    return;
  }

  const time = elapsed * (config.auroraSpeed ?? 1);
  const curtainHeightBase = viewport.height * (config.auroraHeight ?? 0.42);

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (const band of bands) {
    const alpha = 0.34 * intensity * band.alpha * altitudeFade;

    if (alpha <= 0.01) {
      continue;
    }

    const baseY = viewport.height * band.baseY;
    const curtainHeight = curtainHeightBase * band.heightScale;
    const hue = (config.auroraHue ?? 135) + band.hueOffset;

    const gradient = ctx.createLinearGradient(0, baseY - curtainHeight, 0, baseY);
    gradient.addColorStop(0, hsla(hue + 30, 90, 60, 0));
    gradient.addColorStop(0.45, hsla(hue + 14, 88, 52, alpha * 0.35));
    gradient.addColorStop(0.85, hsla(hue, 95, 56, alpha));
    gradient.addColorStop(1, hsla(hue - 8, 90, 72, alpha * 0.85));

    ctx.beginPath();

    // Lower edge, gently waving around the curtain base
    for (let step = 0; step <= EDGE_STEPS; step += 1) {
      const unit = step / EDGE_STEPS;
      const x = viewport.width * (unit * 1.1 - 0.05);
      const wobble = valueNoise1D(unit * 2.4 + time * 0.03 * band.speed, band.seed + 5.7);
      const y = baseY + curtainHeight * 0.07 * wobble;

      if (step === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    // Upper edge, traced right-to-left with the stronger curtain ripple
    for (let step = EDGE_STEPS; step >= 0; step -= 1) {
      const unit = step / EDGE_STEPS;
      const x = viewport.width * (unit * 1.1 - 0.05);
      const y = baseY - curtainHeight * (0.35 + 0.65 * auroraEdgeOffset(unit, time, band));
      ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  ctx.restore();
};
