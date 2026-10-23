import { describe, expect, it } from "vitest";

import { BRIGHT_STAR_COUNT } from "./data/bright-stars.js";
import { vectorToGalactic } from "./astro.js";
import { DEG, createRandom } from "./math.js";
import {
  STAR_STRIDE,
  createBrightStarData,
  createCubeDensitySampler,
  createDustStarData,
  createFieldStarData,
  cubeFaceDirection,
  decodeBrightStars,
  fieldLimitMagnitude,
} from "./stars.js";

describe("bright star catalogue", () => {
  const stars = decodeBrightStars();

  it("decodes every star, brightest first", () => {
    expect(stars).toHaveLength(BRIGHT_STAR_COUNT);
    expect(stars[0].magnitude).toBeLessThan(stars[100].magnitude);
  });

  it("puts Sirius where it belongs", () => {
    const sirius = stars[0];
    expect(sirius.magnitude).toBeCloseTo(-1.46, 1);
    expect(sirius.ra / DEG).toBeCloseTo(101.29, 1);
    expect(sirius.dec / DEG).toBeCloseTo(-16.72, 1);
  });

  it("packs unit directions and positive colours for the GPU", () => {
    const { data, count } = createBrightStarData();
    expect(data).toHaveLength(count * STAR_STRIDE);
    for (let index = 0; index < count; index += 997) {
      const offset = index * STAR_STRIDE;
      expect(Math.hypot(data[offset], data[offset + 1], data[offset + 2])).toBeCloseTo(1, 5);
      expect(Math.min(data[offset + 4], data[offset + 5], data[offset + 6])).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("field stars", () => {
  it("are deterministic for a seed", () => {
    const a = createFieldStarData({ count: 3000, seed: 11 });
    const b = createFieldStarData({ count: 3000, seed: 11 });
    expect(Array.from(a.data.slice(0, 64))).toEqual(Array.from(b.data.slice(0, 64)));
  });

  it("follow the real sky's counts down to their limiting magnitude", () => {
    const { data, count, limit } = createFieldStarData({ count: 20000 });
    expect(limit).toBeCloseTo(fieldLimitMagnitude(20000), 10);
    for (let index = 0; index < count; index += 1) {
      const magnitude = data[index * STAR_STRIDE + 3];
      expect(magnitude).toBeGreaterThanOrEqual(6.5);
      expect(magnitude).toBeLessThanOrEqual(limit + 1e-6);
    }
  });

  it("crowd toward the galactic plane", () => {
    const { data, count } = createFieldStarData({ count: 20000, clusterCount: 0 });
    let nearPlane = 0;
    let nearPoles = 0;
    for (let index = 0; index < count; index += 1) {
      const offset = index * STAR_STRIDE;
      const { b } = vectorToGalactic([data[offset], data[offset + 1], data[offset + 2]]);
      if (Math.abs(b) < 10 * DEG) nearPlane += 1;
      if (Math.abs(b) > 80 * DEG) nearPoles += 1;
    }
    // Equal-area bands: |b| < 10° covers ~17% of the sky, |b| > 80° only ~1.5%.
    expect(nearPlane / 0.1736).toBeGreaterThan((nearPoles / 0.0152) * 2);
  });
});

describe("cube density sampler", () => {
  it("uses the GL cube-map face layout", () => {
    expect(cubeFaceDirection(0, 0.5, 0.5)).toEqual([1, -0, -0]);
    expect(cubeFaceDirection(3, 0.5, 0.5)).toEqual([0, -1, -0]);
    expect(cubeFaceDirection(5, 0.5, 0.5)).toEqual([-0, -0, -1]);
  });

  it("only draws from where there is weight", () => {
    const size = 8;
    const weights = new Float32Array(6 * size * size);
    weights.fill(1, 4 * size * size, 5 * size * size); // all weight on +Z
    const sample = createCubeDensitySampler(weights, size);
    const random = createRandom(3);
    for (let draw = 0; draw < 500; draw += 1) {
      const direction = sample(random);
      expect(direction[2]).toBeGreaterThan(Math.max(Math.abs(direction[0]), Math.abs(direction[1])) - 1e-9);
    }
  });

  it("packs dust stars into eight bytes each", () => {
    const sample = createCubeDensitySampler(new Float32Array(6).fill(1), 1);
    const { data, count } = createDustStarData({ count: 1000, sampleBand: sample });
    expect(data.byteLength).toBe(count * 8);
  });
});
