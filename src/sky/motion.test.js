import { describe, expect, it } from "vitest";

import {
  sampleAtmospherePulse,
  sampleCameraDrift,
  sampleSkyDriftVelocity,
  sampleStarTwinkle,
} from "./motion.js";

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

describe("camera drift", () => {
  const driftConfig = {
    driftSeed: 1.7,
    cameraDriftAmount: 2.4,
    cameraDriftSpeed: 1,
  };

  it("stays within the configured amplitude", () => {
    for (let elapsed = 0; elapsed < 600; elapsed += 7.3) {
      const drift = sampleCameraDrift({ elapsed, config: driftConfig });

      expect(Math.abs(drift.azimuth)).toBeLessThanOrEqual(driftConfig.cameraDriftAmount);
      expect(Math.abs(drift.altitude)).toBeLessThanOrEqual(
        driftConfig.cameraDriftAmount * 0.55
      );
    }
  });

  it("moves over time", () => {
    const first = sampleCameraDrift({ elapsed: 0, config: driftConfig });
    const later = sampleCameraDrift({ elapsed: 120, config: driftConfig });

    expect(first.azimuth).not.toBeCloseTo(later.azimuth, 6);
  });

  it("is zero when the amount is zero", () => {
    const drift = sampleCameraDrift({
      elapsed: 42,
      config: { ...driftConfig, cameraDriftAmount: 0 },
    });

    expect(drift.azimuth).toBeCloseTo(0, 12);
    expect(drift.altitude).toBeCloseTo(0, 12);
  });
});
