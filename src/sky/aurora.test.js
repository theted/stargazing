import { describe, expect, it } from "vitest";

import { auroraEdgeOffset, createAuroraBands } from "./aurora.js";

const config = {
  driftSeed: 1.7,
  auroraBands: 3,
};

describe("aurora bands", () => {
  it("creates the configured number of bands", () => {
    expect(createAuroraBands(config)).toHaveLength(3);
    expect(createAuroraBands({ ...config, auroraBands: 1 })).toHaveLength(1);
  });

  it("clamps the band count to a sane range", () => {
    expect(createAuroraBands({ ...config, auroraBands: 99 })).toHaveLength(4);
    expect(createAuroraBands({ ...config, auroraBands: 0 })).toHaveLength(1);
  });

  it("is deterministic for the same seed", () => {
    const first = createAuroraBands(config);
    const second = createAuroraBands(config);

    expect(first).toEqual(second);
  });

  it("changes layout with the seed", () => {
    const first = createAuroraBands(config);
    const second = createAuroraBands({ ...config, driftSeed: 9.4 });

    expect(first[0].baseY).not.toBeCloseTo(second[0].baseY, 8);
  });

  it("keeps band parameters in usable ranges", () => {
    for (const band of createAuroraBands({ ...config, auroraBands: 4 })) {
      expect(band.baseY).toBeGreaterThan(0.3);
      expect(band.baseY).toBeLessThan(0.95);
      expect(band.heightScale).toBeGreaterThan(0.5);
      expect(band.heightScale).toBeLessThan(1.5);
      expect(band.alpha).toBeGreaterThan(0);
      expect(band.alpha).toBeLessThanOrEqual(1);
    }
  });
});

describe("aurora edge offset", () => {
  it("stays normalized and animates over time", () => {
    const [band] = createAuroraBands(config);
    let moved = false;

    for (let step = 0; step <= 20; step += 1) {
      const x = step / 20;
      const now = auroraEdgeOffset(x, 5, band);
      const later = auroraEdgeOffset(x, 90, band);

      expect(now).toBeGreaterThanOrEqual(0);
      expect(now).toBeLessThanOrEqual(1);
      moved ||= Math.abs(now - later) > 0.01;
    }

    expect(moved).toBe(true);
  });
});
