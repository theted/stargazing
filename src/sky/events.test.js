import { describe, expect, it } from "vitest";

import {
  createMeteorSystem,
  createSatelliteSystem,
  satellitePosition,
  satelliteVisibility,
  spawnMeteor,
  spawnSatellite,
  updateMeteors,
  updateSatellites,
} from "./events.js";
import { createRandom, dot3 } from "./math.js";

const separation = (a, b) => Math.acos(Math.min(1, Math.max(-1, dot3(a, b))));

describe("meteors", () => {
  it("streak away from the shower radiant", () => {
    const radiant = [0, 0.6, 0.8];
    const random = createRandom(5);
    let fromShower = 0;
    for (let index = 0; index < 200; index += 1) {
      const meteor = spawnMeteor(random, radiant);
      expect(meteor.start[2]).toBeGreaterThan(0);
      expect(meteor.duration).toBeGreaterThan(0);
      if (separation(meteor.end, radiant) > separation(meteor.start, radiant) + 1e-6) fromShower += 1;
    }
    // Most belong to the shower; sporadics head anywhere.
    expect(fromShower).toBeGreaterThan(120);
  });

  it("can be aimed through a chosen point", () => {
    const near = [0.2, 0.7, 0.68];
    const length = Math.hypot(...near);
    const target = near.map((value) => value / length);
    const meteor = spawnMeteor(createRandom(9), null, target);
    expect(separation(meteor.start, target)).toBeLessThan(0.1);
  });

  it("spawn on schedule and burn out", () => {
    const system = createMeteorSystem({ random: createRandom(2), rate: 60 });
    updateMeteors(system, 10, [0, 0, 1]);
    expect(system.active.length).toBeGreaterThan(0);
    expect(system.active.length).toBeLessThanOrEqual(3);
    system.rate = 0;
    system.cooldown = Infinity;
    for (let step = 0; step < 100; step += 1) updateMeteors(system, 0.2, [0, 0, 1]);
    expect(system.active).toHaveLength(0);
  });
});

describe("satellites", () => {
  it("glide along great circles and fade at both ends", () => {
    const satellite = spawnSatellite(createRandom(4));
    const start = satellitePosition(satellite);
    satellite.age = satellite.duration / 2;
    const middle = satellitePosition(satellite);
    expect(Math.hypot(...middle)).toBeCloseTo(1, 6);
    expect(separation(start, middle)).toBeCloseTo((satellite.speed * satellite.duration) / 2, 6);
    expect(satelliteVisibility(satellite)).toBe(1);
    satellite.age = 0;
    expect(satelliteVisibility(satellite)).toBe(0);
  });

  it("come and go", () => {
    const system = createSatelliteSystem({ random: createRandom(8), rate: 30 });
    updateSatellites(system, 5);
    expect(system.active.length).toBeGreaterThan(0);
    system.cooldown = Infinity;
    updateSatellites(system, 120);
    expect(system.active).toHaveLength(0);
  });
});
