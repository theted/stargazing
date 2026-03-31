import { describe, expect, it } from "vitest";

import { DEG, SKY_CONFIG } from "../src/sky/config.js";
import { dot } from "../src/sky/math.js";
import {
  buildCamera,
  createDerivedScene,
  createViewport,
  projectStar,
} from "../src/sky/projection.js";

const lengthOf = (vector) => Math.hypot(vector.x, vector.y, vector.z);

describe("camera basis", () => {
  it("stays normalized and orthogonal", () => {
    const camera = buildCamera({
      azimuth: 28 * DEG,
      altitude: 61 * DEG,
      roll: -7 * DEG,
    });

    expect(lengthOf(camera.forward)).toBeCloseTo(1, 8);
    expect(lengthOf(camera.right)).toBeCloseTo(1, 8);
    expect(lengthOf(camera.up)).toBeCloseTo(1, 8);
    expect(dot(camera.forward, camera.right)).toBeCloseTo(0, 8);
    expect(dot(camera.forward, camera.up)).toBeCloseTo(0, 8);
    expect(dot(camera.right, camera.up)).toBeCloseTo(0, 8);
  });

  it("handles a straight-up camera without collapsing the basis", () => {
    const camera = buildCamera({
      azimuth: 0,
      altitude: 90 * DEG,
      roll: 0,
    });

    expect(lengthOf(camera.right)).toBeCloseTo(1, 8);
    expect(lengthOf(camera.up)).toBeCloseTo(1, 8);
  });
});

describe("derived scene", () => {
  it("computes the configured trail angle", () => {
    const derived = createDerivedScene(SKY_CONFIG);
    const expected = SKY_CONFIG.rotationSpeed * SKY_CONFIG.trailExposureSeconds * SKY_CONFIG.trailTimeWarp;

    expect(derived.trailAngle).toBeCloseTo(expected, 8);
  });
});

describe("star projection", () => {
  it("centers an overhead star when the camera looks straight up", () => {
    const config = {
      ...SKY_CONFIG,
      lookAzimuth: 0,
      lookAltitude: 90,
      lookRoll: 0,
    };
    const derived = createDerivedScene(config);
    const viewport = createViewport(1280, 720, config.fieldOfView);
    const latitude = config.observerLatitude * DEG;
    const star = {
      hourOffset: 0,
      sinDec: Math.sin(latitude),
      cosDec: Math.cos(latitude),
    };

    const projection = projectStar({
      star,
      rotation: 0,
      derived,
      viewport,
      config,
    });

    expect(projection.visible).toBe(true);
    expect(projection.x).toBeCloseTo(viewport.cx, 5);
    expect(projection.y).toBeCloseTo(viewport.cy, 5);
  });

  it("hides stars that are below the horizon", () => {
    const derived = createDerivedScene(SKY_CONFIG);
    const viewport = createViewport(1280, 720, SKY_CONFIG.fieldOfView);
    const star = {
      hourOffset: 0,
      sinDec: -1,
      cosDec: 0,
    };

    const projection = projectStar({
      star,
      rotation: 0,
      derived,
      viewport,
      config: SKY_CONFIG,
    });

    expect(projection.visible).toBe(false);
  });
});
