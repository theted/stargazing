import { describe, expect, it } from "vitest";

import { altitudeForHorizon, createViewport, horizontalToViewMatrix, projectDirection, unprojectPoint } from "./projection.js";
import { DEG, dot3, mat3Row, mat3TransformVec3 } from "./math.js";

const directionAt = (angleFromCentre, azimuth) => [
  Math.sin(angleFromCentre) * Math.cos(azimuth),
  Math.sin(angleFromCentre) * Math.sin(azimuth),
  Math.cos(angleFromCentre),
];

describe("projection", () => {
  it("maps the view centre to the screen centre", () => {
    const viewport = createViewport(1600, 900, 104, 0.72);
    expect(projectDirection([0, 0, 1], viewport)).toEqual([800, 450]);
  });

  it("spans the field of view across the geometric mean of the screen", () => {
    for (const alpha of [0.5, 0.72, 1]) {
      const viewport = createViewport(1200, 1200, 90, alpha);
      const [x] = projectDirection(directionAt(45 * DEG, 0), viewport);
      expect(x).toBeCloseTo(1200, 6);
    }
  });

  it("round-trips screen points for every projection in the family", () => {
    for (const alpha of [0.5, 0.72, 1]) {
      const viewport = createViewport(1280, 720, 110, alpha);
      for (const [x, y] of [[100, 80], [640, 360], [1250, 700], [900, 20]]) {
        const [px, py] = projectDirection(unprojectPoint(x, y, viewport), viewport);
        expect(px).toBeCloseTo(x, 6);
        expect(py).toBeCloseTo(y, 6);
      }
    }
  });

  it("rejects directions the projection cannot show", () => {
    const viewport = createViewport(1280, 720, 100, 0.72);
    expect(projectDirection([0, 0, -1], viewport)).toBeNull();
  });

  it("keeps the horizon flatter than a stereographic view", () => {
    // A point on the horizon at the screen edge, camera pitched up 30°.
    const camera = horizontalToViewMatrix(0, 30);
    const edgeOfHorizon = mat3TransformVec3(camera, [Math.sin(50 * DEG), Math.cos(50 * DEG), 0]);
    const centreOfHorizon = mat3TransformVec3(camera, [0, 1, 0]);
    const sag = (alpha) => {
      const viewport = createViewport(1600, 900, 104, alpha);
      return projectDirection(edgeOfHorizon, viewport)[1] - projectDirection(centreOfHorizon, viewport)[1];
    };
    expect(sag(0.72)).toBeLessThan(sag(0.5));
  });
});

describe("composition", () => {
  it("tilts the camera so the horizon lands where asked", () => {
    for (const [width, height] of [[1600, 900], [390, 844]]) {
      const altitude = altitudeForHorizon(width, height, 104, 0.72, 0.8);
      const camera = horizontalToViewMatrix(0, altitude);
      const viewport = createViewport(width, height, 104, 0.72);
      const [, y] = projectDirection(mat3TransformVec3(camera, [0, 1, 0]), viewport);
      // Screen y points up, so 80% down from the top is 20% up from the bottom.
      expect(y).toBeCloseTo(0.2 * height, 4);
    }
    expect(altitudeForHorizon(390, 844, 104, 0.72, 0.8)).toBeGreaterThan(altitudeForHorizon(1600, 900, 104, 0.72, 0.8));
  });
});

describe("camera", () => {
  it("is orthonormal and looks where it is pointed", () => {
    const m = horizontalToViewMatrix(128, 30, 4);
    const [right, up, forward] = [0, 1, 2].map((row) => mat3Row(m, row));
    expect(dot3(right, up)).toBeCloseTo(0, 6);
    expect(dot3(up, forward)).toBeCloseTo(0, 6);
    expect(Math.hypot(...forward)).toBeCloseTo(1, 6);
    expect(forward[2]).toBeCloseTo(Math.sin(30 * DEG), 6);
    expect(Math.atan2(forward[0], forward[1]) / DEG).toBeCloseTo(128, 4);
  });

  it("stays well defined looking straight up", () => {
    const m = horizontalToViewMatrix(45, 90);
    const [right, up] = [0, 1].map((row) => mat3Row(m, row));
    expect(Math.hypot(...right)).toBeCloseTo(1, 6);
    expect(Math.hypot(...up)).toBeCloseTo(1, 6);
  });
});
