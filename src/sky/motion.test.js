import { describe, expect, it } from "vitest";

import { sampleAtmospherePulse, sampleSkyDriftVelocity } from "./motion.js";

const config = {
  backgroundParallax: 0.085,
  driftSeed: 1.7,
};

describe("sky motion", () => {
  it("produces a forward-only drift velocity", () => {
    const first = sampleSkyDriftVelocity({ elapsed: 0, config });
    const later = sampleSkyDriftVelocity({ elapsed: 180, config });

    expect(first).toBeGreaterThan(0);
    expect(later).toBeGreaterThan(0);
  });

  it("keeps atmosphere pulse in a restrained range", () => {
    const pulse = sampleAtmospherePulse({ elapsed: 42, config });

    expect(pulse).toBeGreaterThanOrEqual(0.72);
    expect(pulse).toBeLessThanOrEqual(1.02);
  });
});
