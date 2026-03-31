import { describe, expect, it } from "vitest";

import { buildCamera, createViewport } from "./projection.js";
import { dot } from "./math.js";

describe("camera basis", () => {
  it("stays orthonormal after yaw, pitch, and roll", () => {
    const camera = buildCamera({
      azimuth: Math.PI / 4,
      altitude: Math.PI / 3,
      roll: Math.PI / 12,
    });

    expect(dot(camera.forward, camera.right)).toBeCloseTo(0, 8);
    expect(dot(camera.forward, camera.up)).toBeCloseTo(0, 8);
    expect(dot(camera.right, camera.up)).toBeCloseTo(0, 8);
    expect(dot(camera.forward, camera.forward)).toBeCloseTo(1, 8);
    expect(dot(camera.right, camera.right)).toBeCloseTo(1, 8);
    expect(dot(camera.up, camera.up)).toBeCloseTo(1, 8);
  });

  it("creates a centered viewport model", () => {
    const viewport = createViewport(1280, 720, 92);

    expect(viewport.cx).toBe(640);
    expect(viewport.cy).toBe(360);
    expect(viewport.focal).toBeGreaterThan(0);
  });
});
