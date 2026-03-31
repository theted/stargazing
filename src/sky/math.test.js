import { describe, expect, it } from "vitest";

import { rotateAroundAxis } from "./math.js";

describe("math helpers", () => {
  it("rotates vectors around an axis", () => {
    const rotated = rotateAroundAxis({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, Math.PI / 2);

    expect(rotated.x).toBeCloseTo(0, 8);
    expect(rotated.y).toBeCloseTo(1, 8);
    expect(rotated.z).toBeCloseTo(0, 8);
  });
});
