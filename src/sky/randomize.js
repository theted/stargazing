import { applyCameraPreset, CAMERA_PRESET_KEYS } from "./presets.js";

const CAMERA_KEYS = new Set([
  "observerLatitude",
  "lookAzimuth",
  "lookAltitude",
  "lookRoll",
]);

const TOGGLE_PROBABILITIES = {
  sizeVariationEnabled: 0.92,
  timelapseEnabled: 0.94,
  atmosphereEnabled: 0.84,
  gravityEnabled: 0.72,
  meteorsEnabled: 0.78,
};

const hashSeed = (seedText) => {
  let hash = 1779033703 ^ seedText.length;

  for (let index = 0; index < seedText.length; index += 1) {
    hash = Math.imul(hash ^ seedText.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
};

const mulberry32 = (seed) => () => {
  let value = (seed += 0x6d2b79f5);
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};

const getStepPrecision = (step) => {
  const text = String(step);
  return text.includes(".") ? text.split(".")[1].length : 0;
};

const quantizeToStep = (value, min, step) => {
  const precision = getStepPrecision(step);
  const quantized = min + Math.round((value - min) / step) * step;
  return Number(quantized.toFixed(precision));
};

const randomBetween = (random, min, max) => min + (max - min) * random();

const randomizeSliderValue = (slider, random) => {
  const rangeMin = slider.randomMin ?? slider.min;
  const rangeMax = slider.randomMax ?? slider.max;
  const biasedUnit = (random() + random() + random()) / 3;
  const raw = randomBetween(random, rangeMin, rangeMax) * 0.35 + (rangeMin + (rangeMax - rangeMin) * biasedUnit) * 0.65;
  return quantizeToStep(raw, slider.min, slider.step);
};

export const createRandomSeed = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createSeededRandom = (seed) => {
  const seedFactory = hashSeed(String(seed));
  return mulberry32(seedFactory());
};

export const applySeededRandomization = ({
  config,
  sliders,
  seed,
  cameraPresetKeys = CAMERA_PRESET_KEYS,
}) => {
  const normalizedSeed = String(seed || "").trim() || createRandomSeed();
  const random = createSeededRandom(normalizedSeed);
  const cameraPreset =
    cameraPresetKeys[Math.floor(random() * cameraPresetKeys.length)] ??
    CAMERA_PRESET_KEYS[0];

  applyCameraPreset(config, cameraPreset);

  const sliderValues = {};

  sliders.forEach((slider) => {
    if (CAMERA_KEYS.has(slider.key)) {
      return;
    }

    const nextValue = randomizeSliderValue(slider, random);
    config[slider.key] = nextValue;
    sliderValues[slider.key] = nextValue;
  });

  const maxStarsSlider = sliders.find((slider) => slider.key === "maxStars");
  const minStarsSlider = sliders.find((slider) => slider.key === "minStars");

  if (maxStarsSlider && minStarsSlider) {
    config.maxStars = Math.max(config.maxStars, maxStarsSlider.min);
    config.minStars = quantizeToStep(
      randomBetween(random, minStarsSlider.min, Math.max(minStarsSlider.min, config.maxStars * 0.82)),
      minStarsSlider.min,
      minStarsSlider.step
    );
    config.minStars = Math.min(config.minStars, config.maxStars);
    sliderValues.maxStars = config.maxStars;
    sliderValues.minStars = config.minStars;
  }

  const toggleValues = {};

  Object.entries(TOGGLE_PROBABILITIES).forEach(([key, probability]) => {
    const value = random() <= probability;
    config[key] = value;
    toggleValues[key] = value;
  });

  return {
    seed: normalizedSeed,
    cameraPreset,
    sliderValues,
    toggleValues,
  };
};
