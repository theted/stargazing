import { describe, expect, it } from "vitest";

import { createQualityController, QUALITY_MIN, updateQualityLevel } from "./quality.js";

const config = {
  adaptiveQualityEnabled: true,
  targetFps: 50,
};

describe("adaptive quality", () => {
  it("starts at full quality", () => {
    expect(createQualityController().level).toBe(1);
  });

  it("sheds quality when fps is below target", () => {
    const controller = createQualityController();

    updateQualityLevel(controller, { fps: 30, config });

    expect(controller.level).toBeLessThan(1);
  });

  it("never drops below the floor", () => {
    const controller = createQualityController();

    for (let i = 0; i < 100; i += 1) {
      updateQualityLevel(controller, { fps: 10, config });
    }

    expect(controller.level).toBeCloseTo(QUALITY_MIN, 8);
  });

  it("recovers slowly once fps is comfortably above target", () => {
    const controller = createQualityController();
    updateQualityLevel(controller, { fps: 30, config });
    const degraded = controller.level;

    updateQualityLevel(controller, { fps: 60, config });

    expect(controller.level).toBeGreaterThan(degraded);
    expect(controller.level).toBeLessThanOrEqual(1);
  });

  it("holds steady inside the hysteresis window", () => {
    const controller = createQualityController();
    updateQualityLevel(controller, { fps: 30, config });
    const degraded = controller.level;

    updateQualityLevel(controller, { fps: 51, config });

    expect(controller.level).toBe(degraded);
  });

  it("resets to full quality when disabled", () => {
    const controller = createQualityController();
    updateQualityLevel(controller, { fps: 20, config });

    updateQualityLevel(controller, {
      fps: 20,
      config: { ...config, adaptiveQualityEnabled: false },
    });

    expect(controller.level).toBe(1);
  });
});
