import { describe, expect, it } from "vitest";

import {
  createRandom,
  damp,
  dot3,
  mat3FromRows,
  mat3Multiply,
  mat3Row,
  mat3TransformVec3,
  mat3Transpose,
  slerp3,
  wrapAngle,
} from "./math.js";

describe("mat3", () => {
  const rows = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 10],
  ];

  it("stores rows column-major and reads them back", () => {
    const m = mat3FromRows(...rows);
    expect(Array.from(m)).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 10]);
    expect(mat3Row(m, 1)).toEqual([4, 5, 6]);
  });

  it("transforms vectors like M · v", () => {
    expect(mat3TransformVec3(mat3FromRows(...rows), [1, 0, -1])).toEqual([-2, -2, -3]);
  });

  it("multiplies and transposes consistently", () => {
    const a = mat3FromRows(...rows);
    const b = mat3FromRows([0, 1, 0], [-1, 0, 0], [0, 0, 1]);
    const v = [0.3, -0.2, 0.9];
    const viaProduct = mat3TransformVec3(mat3Multiply(a, b), v);
    const stepwise = mat3TransformVec3(a, mat3TransformVec3(b, v));
    viaProduct.forEach((value, index) => expect(value).toBeCloseTo(stepwise[index], 5));
    expect(mat3Row(mat3Transpose(a), 0)).toEqual([1, 4, 7]);
  });
});

describe("helpers", () => {
  it("produces the same sequence for the same seed", () => {
    const left = createRandom(42);
    const right = createRandom(42);
    const values = Array.from({ length: 5 }, () => left());
    expect(values).toEqual(Array.from({ length: 5 }, () => right()));
    values.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    });
  });

  it("slerps along the unit sphere", () => {
    const halfway = slerp3([1, 0, 0], [0, 1, 0], 0.5);
    expect(Math.hypot(...halfway)).toBeCloseTo(1, 10);
    expect(dot3(halfway, [1, 0, 0])).toBeCloseTo(Math.SQRT1_2, 10);
  });

  it("damps toward a target independently of frame rate", () => {
    const oneStep = damp(0, 1, 3, 0.1);
    const twoSteps = damp(damp(0, 1, 3, 0.05), 1, 3, 0.05);
    expect(oneStep).toBeCloseTo(twoSteps, 10);
  });

  it("wraps angles into (-π, π]", () => {
    expect(wrapAngle(3 * Math.PI)).toBeCloseTo(-Math.PI, 10);
    expect(wrapAngle(-0.5)).toBeCloseTo(-0.5, 10);
  });
});
