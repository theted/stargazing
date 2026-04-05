import { TAU } from "./config.js";
import { clamp, lerp, randomNormal } from "./math.js";

const blendColor = (from, to, amount) => ({
  r: Math.round(lerp(from.r, to.r, amount)),
  g: Math.round(lerp(from.g, to.g, amount)),
  b: Math.round(lerp(from.b, to.b, amount)),
});

export const getStarCount = ({ width, height }, config) => {
  const area = width * height;
  return Math.max(config.minStars, Math.min(config.maxStars, Math.round(area * config.density)));
};

export const createStars = (count, config) =>
  Array.from({ length: count }, () => {
    const useBand = Math.random() < config.bandWeight;
    const hourOffset = Math.random() * TAU;
    const bandWave = Math.sin(hourOffset * config.bandFrequency + config.bandPhase);
    const bandNoise = randomNormal(Math.random, 0, config.bandSpread);
    const spreadNoise = randomNormal(Math.random, 0, config.starSpread);
    const declinationSeed = clamp(
      (useBand ? bandWave * config.bandAmplitude : spreadNoise * 0.85) + bandNoise,
      -0.985,
      0.985
    );
    const sinDec = declinationSeed;
    const cosDec = Math.sqrt(1 - declinationSeed * declinationSeed);
    const brightness = 0.12 + Math.pow(Math.random(), 3.2) * 0.88;
    const sizeCurve = config.sizeVariationEnabled
      ? Math.max(1.5, 4.5 - config.starSizeVariation)
      : 8;
    const size = lerp(
      config.baseStarSize,
      config.maxStarSize,
      Math.pow(Math.random(), sizeCurve)
    );
    // Spectral classification — biased toward visual variety
    const spectralRoll = Math.random();
    let color;
    if (spectralRoll < 0.04) {
      // O/B-class: vivid blue (rare hot giants)
      const t = Math.random();
      color = { r: Math.round(lerp(130, 185, t)), g: Math.round(lerp(165, 210, t)), b: 255 };
    } else if (spectralRoll < 0.82) {
      // A/F/G-class: white to warm white (majority)
      const warmth = Math.pow(Math.random(), 3.2);
      const cool = Math.pow(Math.random(), 6);
      const warmShift = blendColor({ r: 194, g: 214, b: 255 }, { r: 255, g: 244, b: 214 }, warmth);
      color = blendColor(warmShift, { r: 232, g: 239, b: 255 }, cool);
    } else if (spectralRoll < 0.93) {
      // K-class: orange
      const t = Math.random();
      color = { r: 255, g: Math.round(lerp(185, 225, t)), b: Math.round(lerp(100, 160, t)) };
    } else {
      // M-class: red-orange (common but dim, visually striking)
      const t = Math.random();
      color = { r: 255, g: Math.round(lerp(115, 165, t)), b: Math.round(lerp(55, 100, t)) };
    }

    return {
      hourOffset,
      sinDec,
      cosDec,
      brightness,
      size,
      colorCss: `rgb(${color.r} ${color.g} ${color.b})`,
      twinkleSeed: Math.random() * 10_000,
      twinkleTick: -1,
      twinkleValue: 1,
      twinkleSpeed: lerp(config.twinkleSpeedMin, config.twinkleSpeedMax, Math.random()),
      trailScale: lerp(0.75, 1.35, Math.random()),
    };
  });
