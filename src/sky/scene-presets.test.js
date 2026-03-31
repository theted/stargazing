import { describe, expect, it } from "vitest";

import { applyScenePreset, SCENE_PRESETS } from "./scene-presets.js";

describe("scene presets", () => {
  it("applies a named scene preset and its camera preset", () => {
    const config = {
      cameraPreset: "custom",
      observerLatitude: 0,
      lookAzimuth: 0,
      lookAltitude: 0,
      lookRoll: 0,
      density: 0,
      meteorRate: 0,
    };

    applyScenePreset(config, "meteor-surge");

    expect(config.cameraPreset).toBe(SCENE_PRESETS["meteor-surge"].cameraPreset);
    expect(config.density).toBe(SCENE_PRESETS["meteor-surge"].values.density);
    expect(config.meteorRate).toBe(SCENE_PRESETS["meteor-surge"].values.meteorRate);
  });
});
