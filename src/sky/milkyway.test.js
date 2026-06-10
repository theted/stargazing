import { describe, expect, it } from "vitest";

import { createMilkyWay, MILKY_WAY_PATCH_COUNT } from "./milkyway.js";

const config = {
  driftSeed: 1.7,
  bandFrequency: 2.15,
  bandAmplitude: 0.5,
  bandSpread: 0.28,
  bandPhase: 0.85,
};

describe("milky way patches", () => {
  it("creates the full patch ring", () => {
    expect(createMilkyWay(config)).toHaveLength(MILKY_WAY_PATCH_COUNT);
  });

  it("is deterministic for the same seed", () => {
    expect(createMilkyWay(config)).toEqual(createMilkyWay(config));
  });

  it("keeps patches inside the star band envelope", () => {
    const maxDeviation = config.bandAmplitude + config.bandSpread * 0.4 + 1e-9;

    for (const patch of createMilkyWay(config)) {
      const bandWave = Math.sin(patch.hourOffset * config.bandFrequency + config.bandPhase);
      const deviation = Math.abs(patch.sinDec - bandWave * config.bandAmplitude);

      expect(deviation).toBeLessThanOrEqual(config.bandSpread * 0.4 + 1e-9);
      expect(Math.abs(patch.sinDec)).toBeLessThanOrEqual(maxDeviation);
      expect(patch.cosDec).toBeCloseTo(Math.sqrt(1 - patch.sinDec ** 2), 10);
    }
  });

  it("produces unit-consistent angular radii and alphas", () => {
    for (const patch of createMilkyWay(config)) {
      expect(patch.angularRadius).toBeGreaterThan(0);
      expect(patch.angularRadius).toBeLessThan(Math.PI / 8);
      expect(patch.alpha).toBeGreaterThan(0);
      expect(patch.alpha).toBeLessThanOrEqual(1);
      expect([0, 1, 2]).toContain(patch.spriteIndex);
    }
  });
});
