import { describe, expect, it } from "vitest";

import { sampleAtmospherePulse, sampleSkyDriftVelocity, sampleStarTwinkle } from "./motion.js";

const config = {
  backgroundParallax: 0.085,
  driftSeed: 1.7,
  twinkleAmount: 0.36,
};

const star = {
  twinkleSeed: 321.5,
  twinkleSpeed: 2.4,
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

  it("creates restrained non-sinusoidal star twinkle", () => {
    const first = sampleStarTwinkle({
      time: 10,
      star,
      config,
      timelapseFactor: 2.1,
    });
    const later = sampleStarTwinkle({
      time: 160,
      star,
      config,
      timelapseFactor: 2.1,
    });

    expect(first).toBeGreaterThanOrEqual(1 - config.twinkleAmount * 0.42);
    expect(first).toBeLessThanOrEqual(1 + config.twinkleAmount * 0.12);
    expect(later).toBeGreaterThanOrEqual(1 - config.twinkleAmount * 0.42);
    expect(later).toBeLessThanOrEqual(1 + config.twinkleAmount * 0.12);
    expect(first).not.toBeCloseTo(later, 6);
  });
});
