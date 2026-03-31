import { describe, expect, it } from "vitest";

import {
  createMeteor,
  createMeteorDelay,
  createMeteorSystem,
  updateMeteorSystem,
} from "./meteors.js";

const createSequenceRandom = (...values) => {
  let index = 0;

  return () => {
    const nextValue = values[Math.min(index, values.length - 1)];
    index += 1;
    return nextValue;
  };
};

const config = {
  meteorsEnabled: true,
  meteorRate: 2.2,
  meteorDurationMin: 0.68,
  meteorDurationMax: 1.18,
  meteorTrailLength: 0.19,
  meteorGlow: 0.95,
  meteorWidth: 1.85,
  maxActiveMeteors: 2,
};

const viewport = {
  width: 1600,
  height: 900,
};

describe("meteor system", () => {
  it("creates a positive spawn delay", () => {
    const delay = createMeteorDelay(config, () => 0.5);

    expect(delay).toBeGreaterThan(0);
  });

  it("creates a normalized meteor heading and bounded duration", () => {
    const meteor = createMeteor({
      viewport,
      config,
      random: createSequenceRandom(0.9, 0.35, 0.55, 0.4, 0.62, 0.8, 0.25, 0.4, 0.6, 0.75),
    });

    expect(Math.hypot(meteor.direction.x, meteor.direction.y)).toBeCloseTo(1, 8);
    expect(meteor.duration).toBeGreaterThanOrEqual(config.meteorDurationMin);
    expect(meteor.duration).toBeLessThanOrEqual(config.meteorDurationMax);
    expect(meteor.trailLength).toBeGreaterThan(0);
  });

  it("spawns a meteor when the cooldown expires", () => {
    const system = createMeteorSystem(config, () => 0.5);
    system.cooldown = 0;

    updateMeteorSystem({
      system,
      viewport,
      config,
      delta: 0.016,
    });

    expect(system.active.length).toBe(1);
  });
});
