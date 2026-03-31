import { describe, expect, it } from "vitest";

import { rotateAroundAxis, valueNoise1D } from "./math.js";

describe("math helpers", () => {
  it("rotates vectors around an axis", () => {
    const rotated = rotateAroundAxis({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, Math.PI / 2);

    expect(rotated.x).toBeCloseTo(0, 8);
    expect(rotated.y).toBeCloseTo(1, 8);
    expect(rotated.z).toBeCloseTo(0, 8);
  });

  it("creates stable bounded value noise", () => {
    const left = valueNoise1D(3.75, 1.7);
    const right = valueNoise1D(3.75, 1.7);

    expect(left).toBeGreaterThanOrEqual(0);
    expect(left).toBeLessThanOrEqual(1);
    expect(left).toBeCloseTo(right, 12);
  });
});
