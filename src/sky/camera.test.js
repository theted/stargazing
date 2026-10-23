import { describe, expect, it } from "vitest";

import { CAMERA_LIMITS, createCamera, dragCamera, glideCamera, releaseCamera, updateCamera, zoomCamera } from "./camera.js";

describe("camera controller", () => {
  it("moves the sky with the pointer", () => {
    const camera = createCamera({ azimuth: 100, altitude: 30, fov: 100 });
    dragCamera(camera, 50, 20, 0.1, 1 / 60);
    // Dragging right turns the view left; dragging down tilts it up.
    expect(camera.azimuth).toBeCloseTo(95, 6);
    expect(camera.altitude).toBeCloseTo(32, 6);
  });

  it("keeps the view within its limits", () => {
    const camera = createCamera({ altitude: 80 });
    dragCamera(camera, 0, 500, 0.1, 1 / 60);
    expect(camera.altitude).toBe(CAMERA_LIMITS.maxAltitude);
    zoomCamera(camera, 0.01);
    expect(camera.targetFov).toBe(CAMERA_LIMITS.minFov);
  });

  it("coasts after a fling and settles", () => {
    const camera = createCamera({ azimuth: 0 });
    dragCamera(camera, -30, 0, 0.1, 1 / 60);
    releaseCamera(camera, 0);
    const before = camera.azimuth;
    updateCamera(camera, 0.1);
    expect(camera.azimuth).toBeGreaterThan(before);
    for (let step = 0; step < 300; step += 1) updateCamera(camera, 1 / 60);
    expect(Math.abs(camera.velocityAzimuth)).toBeLessThan(1e-3);
  });

  it("does not fling after the pointer came to rest", () => {
    const camera = createCamera();
    dragCamera(camera, 40, 0, 0.1, 1 / 60);
    releaseCamera(camera, 0.3);
    expect(camera.velocityAzimuth).toBe(0);
  });

  it("glides the short way round to a new framing", () => {
    const camera = createCamera({ azimuth: 350, altitude: 20, fov: 90 });
    glideCamera(camera, { azimuth: 10, altitude: 40, fov: 70 });
    updateCamera(camera, 0.05);
    expect(camera.azimuth === 0 || camera.azimuth > 350 || camera.azimuth < 10).toBe(true);
    for (let step = 0; step < 600; step += 1) updateCamera(camera, 1 / 60);
    expect(camera.azimuth).toBeCloseTo(10, 1);
    expect(camera.altitude).toBeCloseTo(40, 1);
    expect(camera.fov).toBeCloseTo(70, 1);
  });
});
