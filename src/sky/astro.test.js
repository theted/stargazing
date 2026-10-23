import { describe, expect, it } from "vitest";

import {
  EQUATORIAL_TO_GALACTIC,
  airmass,
  bvToTemperature,
  bvToLinearRgb,
  equatorialToHorizontalMatrix,
  galacticToVector,
  horizontalToAltAz,
  localSiderealTime,
  raDecToVector,
  vectorToGalactic,
} from "./astro.js";
import { DEG, mat3Row, mat3TransformVec3 } from "./math.js";

const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe("galactic frame", () => {
  // Matrices are Float32Array (they go straight to the GPU), so ~6 digits is the limit.
  it("is a rotation", () => {
    for (let row = 0; row < 3; row += 1) {
      const r = mat3Row(EQUATORIAL_TO_GALACTIC, row);
      expect(Math.hypot(...r)).toBeCloseTo(1, 6);
    }
  });

  it("puts Sagittarius A* at the galactic centre", () => {
    const { l, b } = vectorToGalactic(raDecToVector(266.405 * DEG, -28.936 * DEG));
    expect(Math.min(l, 2 * Math.PI - l) / DEG).toBeLessThan(0.1);
    expect(Math.abs(b) / DEG).toBeLessThan(0.1);
  });

  it("round-trips galactic coordinates", () => {
    const { l, b } = vectorToGalactic(galacticToVector(1.2, -0.4));
    expect(l).toBeCloseTo(1.2, 6);
    expect(b).toBeCloseTo(-0.4, 6);
  });
});

describe("horizontal frame", () => {
  it("puts a star at declination = latitude on the meridian at the zenith", () => {
    const latitude = 52 * DEG;
    const lst = 3.1;
    const m = equatorialToHorizontalMatrix(lst, latitude);
    const h = mat3TransformVec3(m, raDecToVector(lst, latitude));
    expect(h[2]).toBeCloseTo(1, 6);
  });

  it("puts the celestial pole at an altitude equal to the latitude, due north", () => {
    const latitude = 68.35 * DEG;
    const { altitude, azimuth } = horizontalToAltAz(mat3TransformVec3(equatorialToHorizontalMatrix(1.7, latitude), [0, 0, 1]));
    expect(altitude).toBeCloseTo(latitude, 6);
    expect(Math.min(azimuth, 2 * Math.PI - azimuth)).toBeLessThan(1e-5);
  });

  it("rises in the east", () => {
    const latitude = 0;
    const lst = 0;
    // Six hours east of the meridian on the equator sits on the eastern horizon.
    const h = mat3TransformVec3(equatorialToHorizontalMatrix(lst, latitude), raDecToVector(Math.PI / 2, 0));
    expect(h[0]).toBeCloseTo(1, 6);
    expect(h[2]).toBeCloseTo(0, 6);
  });
});

describe("sidereal time", () => {
  it("matches GMST at the J2000 epoch", () => {
    const lst = localSiderealTime(new Date(Date.UTC(2000, 0, 1, 12)), 0);
    expect(lst / DEG).toBeCloseTo(280.46061837, 4);
  });

  it("adds east longitude", () => {
    const date = new Date(Date.UTC(2026, 9, 7, 3));
    const difference = localSiderealTime(date, 15) - localSiderealTime(date, 0);
    expect(((difference + 2 * Math.PI) % (2 * Math.PI)) / DEG).toBeCloseTo(15, 6);
  });
});

describe("air mass", () => {
  it("is one overhead and grows toward the horizon without blowing up", () => {
    expect(airmass(90 * DEG)).toBeCloseTo(1, 3);
    expect(airmass(30 * DEG)).toBeCloseTo(2, 1);
    expect(airmass(0)).toBeGreaterThan(30);
    expect(airmass(0)).toBeLessThan(45);
  });
});

describe("star colour", () => {
  it("gives the Sun its temperature", () => {
    expect(bvToTemperature(0.65)).toBeGreaterThan(5650);
    expect(bvToTemperature(0.65)).toBeLessThan(5900);
  });

  it("makes hot stars blue and cool stars orange at unit luminance", () => {
    const hot = bvToLinearRgb(-0.2);
    const cool = bvToLinearRgb(1.6);
    expect(hot[2]).toBeGreaterThan(hot[0]);
    expect(cool[0]).toBeGreaterThan(cool[2]);
    expect(luminance(hot)).toBeCloseTo(1, 5);
    expect(luminance(cool)).toBeCloseTo(1, 5);
  });

  it("exaggerates hue without changing luminance", () => {
    const plain = bvToLinearRgb(1.2, 1);
    const vivid = bvToLinearRgb(1.2, 1.5);
    expect(vivid[0] - vivid[2]).toBeGreaterThan(plain[0] - plain[2]);
    expect(luminance(vivid)).toBeCloseTo(1, 5);
  });
});
