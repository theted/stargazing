import { describe, expect, it } from "vitest";

import { applySeededRandomization, createSeededRandom } from "./randomize.js";

const sliders = [
  { key: "density", min: 0.00005, max: 0.005, step: 0.00001 },
  { key: "minStars", min: 0, max: 50000, step: 25 },
  { key: "maxStars", min: 100, max: 90000, step: 50 },
  { key: "motionScale", min: 0.4, max: 20, step: 0.1 },
  { key: "observerLatitude", min: -90, max: 90, step: 1 },
];

describe("seeded randomizer", () => {
  it("produces deterministic random sequences for the same seed", () => {
    const left = createSeededRandom("aurora-seed");
    const right = createSeededRandom("aurora-seed");

    expect(left()).toBeCloseTo(right(), 12);
    expect(left()).toBeCloseTo(right(), 12);
  });

  it("applies deterministic config changes for a given seed", () => {
    const configA = {
      density: 0,
      minStars: 0,
      maxStars: 0,
      motionScale: 0,
      cameraPreset: "custom",
    };
    const configB = structuredClone(configA);

    const resultA = applySeededRandomization({
      config: configA,
      sliders,
      seed: "night-rain",
      cameraPresetKeys: ["zenith-drift", "polar-arc"],
    });
    const resultB = applySeededRandomization({
      config: configB,
      sliders,
      seed: "night-rain",
      cameraPresetKeys: ["zenith-drift", "polar-arc"],
    });

    expect(resultA).toEqual(resultB);
    expect(configA).toEqual(configB);
    expect(configA.minStars).toBeLessThanOrEqual(configA.maxStars);
  });
});
