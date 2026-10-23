import { describe, expect, it } from "vitest";

import { PLACES, PLACE_KEYS, getPlace } from "./places.js";
import { MILKY_WAY_FEATURES, packMilkyWayFeatures } from "./milkyway.js";
import { createPlaceUniforms } from "./render/placeUniforms.js";

describe("places", () => {
  it.each(PLACE_KEYS)("%s describes a plausible site", (key) => {
    const place = PLACES[key];
    expect(Math.abs(place.latitude)).toBeLessThanOrEqual(90);
    expect(place.startLst).toBeGreaterThanOrEqual(0);
    expect(place.startLst).toBeLessThan(24);
    expect(place.landscape.ridges.length).toBeGreaterThan(0);
    expect(place.label.length).toBeGreaterThan(0);
  });

  it.each(PLACE_KEYS)("%s packs into finite shader uniforms", (key) => {
    const uniforms = createPlaceUniforms(PLACES[key]);
    for (const value of Object.values(uniforms)) {
      const values = typeof value === "number" ? [value] : Array.from(value);
      values.forEach((number) => expect(Number.isFinite(number)).toBe(true));
    }
    expect(uniforms.landscapeTop).toBeGreaterThan(0);
  });

  it("falls back to the first place for unknown keys", () => {
    expect(getPlace("nowhere")).toBe(PLACES[PLACE_KEYS[0]]);
  });
});

describe("Milky Way features", () => {
  it("pack with axes tangent to the sky", () => {
    const { data, count } = packMilkyWayFeatures();
    expect(count).toBe(MILKY_WAY_FEATURES.length);
    for (let index = 0; index < count; index += 1) {
      const centre = data.slice(index * 16, index * 16 + 3);
      const axis1 = data.slice(index * 16 + 4, index * 16 + 7);
      const axis2 = data.slice(index * 16 + 8, index * 16 + 11);
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      expect(dot(centre, centre)).toBeCloseTo(1, 5);
      expect(dot(centre, axis1)).toBeCloseTo(0, 5);
      expect(dot(centre, axis2)).toBeCloseTo(0, 5);
      expect(dot(axis1, axis2)).toBeCloseTo(0, 5);
    }
  });
});
