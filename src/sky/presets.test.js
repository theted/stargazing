import { describe, expect, it } from "vitest";

import { applyCameraPreset, CAMERA_PRESETS } from "./presets.js";

describe("camera presets", () => {
  it("applies a preset to a config object", () => {
    const config = {
      observerLatitude: 0,
      lookAzimuth: 0,
      lookAltitude: 0,
      lookRoll: 0,
      cameraPreset: "custom",
    };

    applyCameraPreset(config, "northern-crown");

    expect(config.cameraPreset).toBe("northern-crown");
    expect(config.observerLatitude).toBe(CAMERA_PRESETS["northern-crown"].observerLatitude);
    expect(config.lookAltitude).toBe(CAMERA_PRESETS["northern-crown"].lookAltitude);
  });
});
