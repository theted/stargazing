import { describe, expect, it } from "vitest";

import {
  createSatellite,
  createSatelliteDelay,
  createSatelliteSystem,
  getSatelliteAlpha,
  updateSatelliteSystem,
} from "./satellites.js";

const viewport = { width: 1280, height: 720 };

const config = {
  satellitesEnabled: true,
  satelliteRate: 2,
  maxActiveSatellites: 3,
};

const createSequenceRandom = (values) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe("satellite spawning", () => {
  it("returns an infinite delay when disabled", () => {
    expect(createSatelliteDelay({ ...config, satellitesEnabled: false })).toBe(
      Number.POSITIVE_INFINITY
    );
    expect(createSatelliteDelay({ ...config, satelliteRate: 0 })).toBe(
      Number.POSITIVE_INFINITY
    );
  });

  it("scales the delay with the spawn rate", () => {
    const random = () => 0.5;
    expect(createSatelliteDelay(config, random)).toBeCloseTo(30, 6);
    expect(createSatelliteDelay({ ...config, satelliteRate: 6 }, random)).toBeCloseTo(10, 6);
  });

  it("creates satellites that cross the frame interior", () => {
    const satellite = createSatellite({ viewport, config, random: () => 0.5 });
    const midX = satellite.x + satellite.direction.x * satellite.speed * (satellite.duration / 2);
    const midY = satellite.y + satellite.direction.y * satellite.speed * (satellite.duration / 2);

    expect(midX).toBeGreaterThanOrEqual(0);
    expect(midX).toBeLessThanOrEqual(viewport.width);
    expect(midY).toBeGreaterThanOrEqual(0);
    expect(midY).toBeLessThanOrEqual(viewport.height);
    expect(satellite.duration).toBeGreaterThanOrEqual(18);
    expect(satellite.duration).toBeLessThanOrEqual(40);
  });
});

describe("satellite system", () => {
  it("respects the max active limit", () => {
    const system = createSatelliteSystem(config, () => 0.5);
    system.cooldown = -1000;

    updateSatelliteSystem({ system, viewport, config, delta: 0.016 });

    expect(system.active.length).toBeLessThanOrEqual(config.maxActiveSatellites);
    expect(system.active.length).toBeGreaterThan(0);
  });

  it("expires satellites at the end of their pass", () => {
    const system = createSatelliteSystem(config, () => 0.5);
    system.active.push(createSatellite({ viewport, config, random: () => 0.5 }));
    system.cooldown = 1e9;

    updateSatelliteSystem({ system, viewport, config, delta: 1000 });

    expect(system.active).toHaveLength(0);
  });

  it("clears all satellites when disabled mid-flight", () => {
    const system = createSatelliteSystem(config, () => 0.5);
    system.active.push(createSatellite({ viewport, config, random: () => 0.5 }));

    updateSatelliteSystem({
      system,
      viewport,
      config: { ...config, satellitesEnabled: false },
      delta: 0.016,
    });

    expect(system.active).toHaveLength(0);
  });
});

describe("satellite brightness", () => {
  it("keeps alpha clamped through the whole pass, including flares", () => {
    const random = createSequenceRandom([0.5, 0.5, 0.5, 0.5, 0.5, 0.1, 0.5, 0.5, 0.9, 0.5, 0.5]);
    const satellite = createSatellite({ viewport, config, random });

    for (let step = 0; step <= 100; step += 1) {
      satellite.age = (step / 100) * satellite.duration;
      const { alpha } = getSatelliteAlpha(satellite);

      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });

  it("fades in and out at the pass edges", () => {
    const satellite = createSatellite({ viewport, config, random: () => 0.5 });

    satellite.age = 0;
    expect(getSatelliteAlpha(satellite).alpha).toBe(0);

    satellite.age = satellite.duration;
    expect(getSatelliteAlpha(satellite).alpha).toBe(0);
  });
});
