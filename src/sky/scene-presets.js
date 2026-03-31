import { applyCameraPreset } from "./presets.js";

export const SCENE_PRESETS = {
  "cinematic-zenith": {
    label: "Cinematic Zenith",
    cameraPreset: "zenith-drift",
    values: {
      density: 0.00125,
      minStars: 6200,
      maxStars: 22000,
      motionScale: 6.8,
      timelapseIntensity: 2.6,
      rotationSpeed: 0.0035,
      trailTimeWarp: 14.5,
      baseStarSize: 0.92,
      maxStarSize: 4.8,
      starSizeVariation: 2.8,
      screenCoverageBoost: 0.42,
      edgeMagnification: 0.3,
      horizonMagnification: 0.36,
      meteorsEnabled: true,
      meteorRate: 2,
    },
  },
  "polar-cathedral": {
    label: "Polar Cathedral",
    cameraPreset: "polar-arc",
    values: {
      density: 0.00092,
      minStars: 5400,
      maxStars: 16000,
      motionScale: 4.6,
      timelapseIntensity: 1.9,
      rotationSpeed: 0.00255,
      trailTimeWarp: 18,
      backgroundParallax: 0.05,
      screenCoverageBoost: 0.22,
      edgeMagnification: 0.14,
      horizonMagnification: 0.18,
      atmosphereStrength: 0.98,
      gravityStrength: 0.18,
      meteorsEnabled: false,
      meteorRate: 0,
    },
  },
  "meteor-surge": {
    label: "Meteor Surge",
    cameraPreset: "equatorial-sweep",
    values: {
      density: 0.00145,
      minStars: 7600,
      maxStars: 26000,
      motionScale: 8.2,
      timelapseIntensity: 3.2,
      rotationSpeed: 0.0048,
      trailTimeWarp: 12,
      glowScale: 5.5,
      atmosphereStrength: 1.24,
      gravityStrength: 0.36,
      meteorsEnabled: true,
      meteorRate: 9.5,
      meteorTrailLength: 0.42,
      meteorGlow: 1.55,
      meteorWidth: 2.65,
      maxActiveMeteors: 4,
    },
  },
  "benchmark-redline": {
    label: "Benchmark Redline",
    cameraPreset: "zenith-drift",
    values: {
      density: 0.0032,
      minStars: 16000,
      maxStars: 68000,
      dprCap: 1.75,
      motionScale: 11.5,
      timelapseIntensity: 4.6,
      rotationSpeed: 0.0068,
      trailTimeWarp: 28,
      backgroundParallax: 0.18,
      baseStarSize: 1.18,
      maxStarSize: 6.8,
      starSizeVariation: 3.6,
      bandAmplitude: 0.72,
      starSpread: 1.55,
      atmosphereStrength: 1.8,
      gravityStrength: 0.52,
      screenCoverageBoost: 1.2,
      edgeMagnification: 0.85,
      horizonMagnification: 1.1,
      meteorsEnabled: true,
      meteorRate: 16,
      meteorTrailLength: 0.58,
      meteorGlow: 2.1,
      meteorWidth: 3.4,
      maxActiveMeteors: 6,
    },
  },
};

export const SCENE_PRESET_KEYS = Object.keys(SCENE_PRESETS);

export const applyScenePreset = (config, presetKey) => {
  const preset = SCENE_PRESETS[presetKey] ?? SCENE_PRESETS["cinematic-zenith"];
  applyCameraPreset(config, preset.cameraPreset);
  Object.assign(config, preset.values);
  return config;
};
