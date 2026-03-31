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
  Array.from({ length: count }, (_, index) => {
    const useBand = Math.random() < config.bandWeight;
    const hourOffset = Math.random() * TAU;
    const bandWave = Math.sin(hourOffset * config.bandFrequency + config.bandPhase);
    const bandNoise = randomNormal(Math.random, 0, config.bandSpread);
    const declinationSeed = useBand
      ? clamp(
          bandWave * config.bandAmplitude + bandNoise,
          -0.985,
          0.985
        )
      : Math.random() * 2 - 1;
    const sinDec = declinationSeed;
    const cosDec = Math.sqrt(1 - declinationSeed * declinationSeed);
    const brightness = 0.18 + Math.pow(Math.random(), 3.8) * 0.82;
    const size = lerp(config.baseStarSize, config.maxStarSize, Math.pow(Math.random(), 4.5));
    const warmthMix = Math.random();
    const coolMix = Math.random();
    const warmShift = blendColor(
      { r: 194, g: 214, b: 255 },
      { r: 255, g: 244, b: 214 },
      Math.pow(warmthMix, 3.2)
    );
    const color = blendColor(
      warmShift,
      { r: 232, g: 239, b: 255 },
      Math.pow(coolMix, 6)
    );

    return {
      hourOffset,
      sinDec,
      cosDec,
      brightness,
      size,
      twinklePhase: Math.random() * TAU,
      twinkleSpeed: lerp(config.twinkleSpeedMin, config.twinkleSpeedMax, Math.random()),
      trailScale: lerp(0.75, 1.35, Math.random()),
      driftFactor: lerp(0.9, 1.4, Math.random()) * (index % 3 === 0 ? 1.08 : 1),
      color,
    };
  });
