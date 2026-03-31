export const CAMERA_PRESETS = {
  "equatorial-night": {
    observerLatitude: 11,
    lookAzimuth: 28,
    lookAltitude: 61,
    lookRoll: -7,
  },
  "equatorial-sweep": {
    observerLatitude: 2,
    lookAzimuth: 34,
    lookAltitude: 56,
    lookRoll: -12,
  },
  "northern-crown": {
    observerLatitude: 52,
    lookAzimuth: 16,
    lookAltitude: 67,
    lookRoll: -5,
  },
  "southern-crown": {
    observerLatitude: -34,
    lookAzimuth: 142,
    lookAltitude: 58,
    lookRoll: 8,
  },
  "polar-arc": {
    observerLatitude: 71,
    lookAzimuth: 12,
    lookAltitude: 78,
    lookRoll: 0,
  },
  "zenith-drift": {
    observerLatitude: 0,
    lookAzimuth: 0,
    lookAltitude: 84,
    lookRoll: 0,
  },
};

export const CAMERA_PRESET_KEYS = Object.keys(CAMERA_PRESETS);

export const applyCameraPreset = (config, presetKey) => {
  const preset = CAMERA_PRESETS[presetKey] ?? CAMERA_PRESETS["equatorial-night"];
  Object.assign(config, preset);
  config.cameraPreset = presetKey in CAMERA_PRESETS ? presetKey : "equatorial-night";
  return config;
};
