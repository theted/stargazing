import { describe, expect, it } from "vitest";

import { DEG } from "./config.js";
import {
  createProjectionTarget,
  createDerivedScene,
  createViewport,
  equatorialToHorizontal,
  projectDirection,
} from "./projection.js";

const config = {
  observerLatitude: 11,
  lookAzimuth: 28,
  lookAltitude: 61,
  lookRoll: -7,
  fieldOfView: 92,
  rotationSpeed: 0.00072,
  trailExposureSeconds: 18,
  trailTimeWarp: 7.5,
  horizonFadeStart: -0.08,
  horizonFadeEnd: 0.22,
  edgeFadeStart: 0.06,
  edgeFadeEnd: 0.94,
};

describe("projection", () => {
  it("puts a matching declination star at zenith on the meridian", () => {
    const derived = createDerivedScene(config);
    const direction = equatorialToHorizontal({
      star: {
        sinDec: Math.sin(config.observerLatitude * DEG),
        cosDec: Math.cos(config.observerLatitude * DEG),
      },
      hourAngle: 0,
      derived,
    });

    expect(direction.x).toBeCloseTo(0, 8);
    expect(direction.y).toBeCloseTo(1, 8);
    expect(direction.z).toBeCloseTo(0, 8);
  });

  it("projects the camera forward direction to the center of the viewport", () => {
    const derived = createDerivedScene(config);
    const viewport = createViewport(1440, 900, config.fieldOfView);
    const projection = projectDirection({
      direction: derived.camera.forward,
      derived,
      viewport,
      config,
    });

    expect(projection.visible).toBe(true);
    expect(projection.x).toBeCloseTo(viewport.cx, 8);
    expect(projection.y).toBeCloseTo(viewport.cy, 8);
  });

  it("rejects directions behind the camera", () => {
    const derived = createDerivedScene(config);
    const viewport = createViewport(1440, 900, config.fieldOfView);
    const projection = projectDirection({
      direction: {
        x: -derived.camera.forward.x,
        y: -derived.camera.forward.y,
        z: -derived.camera.forward.z,
      },
      derived,
      viewport,
      config,
    });

    expect(projection.visible).toBe(false);
  });

  it("can project into a reusable target without allocating a new result", () => {
    const derived = createDerivedScene(config);
    const viewport = createViewport(1440, 900, config.fieldOfView);
    const target = createProjectionTarget();
    const projection = projectDirection({
      direction: derived.camera.forward,
      derived,
      viewport,
      config,
      target,
    });

    expect(projection).toBe(target);
    expect(projection.visible).toBe(true);
  });
});
