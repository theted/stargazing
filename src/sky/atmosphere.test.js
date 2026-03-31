import { describe, expect, it } from "vitest";

import { warpSkyProjection } from "./atmosphere.js";

const viewport = {
  width: 1440,
  height: 900,
  cx: 720,
  cy: 450,
};

const projection = {
  visible: true,
  x: 980,
  y: 240,
  scale: 1,
  fade: 0.9,
};

describe("atmosphere warp", () => {
  it("leaves the projection unchanged when all warp effects are disabled", () => {
    const warped = warpSkyProjection({
      projection,
      direction: { x: 0.3, y: 0.82, z: 0.48 },
      viewX: 0.3,
      viewY: 0.12,
      viewZ: 0.78,
      viewport,
      config: {
        atmosphereEnabled: false,
        gravityEnabled: false,
      },
    });

    expect(warped).toEqual(projection);
  });

  it("supports magnification boosts even when atmosphere and gravity are off", () => {
    const warped = warpSkyProjection({
      projection,
      direction: { x: 0.5, y: 0.12, z: 0.42 },
      viewX: 0.52,
      viewY: 0.16,
      viewZ: 0.42,
      viewport,
      config: {
        atmosphereEnabled: false,
        gravityEnabled: false,
        screenCoverageBoost: 0.4,
        edgeMagnification: 0.25,
        horizonMagnification: 0.32,
      },
    });

    expect(warped.x).toBeGreaterThan(projection.x);
    expect(warped.scale).toBeGreaterThan(projection.scale);
  });

  it("defaults optional magnification strengths to zero without producing NaN values", () => {
    const warped = warpSkyProjection({
      projection,
      direction: { x: 0.18, y: 0.24, z: 0.56 },
      viewX: 0.14,
      viewY: 0.09,
      viewZ: 0.56,
      viewport,
      config: {
        atmosphereEnabled: true,
        atmosphereStrength: 1,
        gravityEnabled: true,
        gravityStrength: 0.2,
      },
    });

    expect(Number.isFinite(warped.x)).toBe(true);
    expect(Number.isFinite(warped.y)).toBe(true);
    expect(Number.isFinite(warped.scale)).toBe(true);
  });
});
