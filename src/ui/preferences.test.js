import { describe, expect, it } from "vitest";

import { SPEED_MAX, formatTimeScale, readUrlOptions, sliderToTimeScale, timeScaleToSlider } from "./preferences.js";
import { mergeSettings } from "../sky/createSky.js";
import { SKY_DEFAULTS } from "../sky/config.js";

describe("speed slider", () => {
  it("holds still at the left edge and reaches full speed at the right", () => {
    expect(sliderToTimeScale(0)).toBe(0);
    expect(sliderToTimeScale(0.02)).toBeCloseTo(1, 6);
    expect(sliderToTimeScale(1)).toBeCloseTo(SPEED_MAX, 6);
  });

  it("round-trips speeds", () => {
    for (const scale of [1, 36, 400]) {
      expect(sliderToTimeScale(timeScaleToSlider(scale))).toBeCloseTo(scale, 6);
    }
  });

  it("labels speeds for people", () => {
    expect(formatTimeScale(0)).toBe("Still");
    expect(formatTimeScale(1)).toBe("Real time");
    expect(formatTimeScale(36.4)).toBe("36×");
  });
});

describe("URL options", () => {
  it("reads a view and switches", () => {
    const options = readUrlOptions("?place=lapland&az=10&fov=80&speed=60&intro=0&ui=0");
    expect(options.place).toBe("lapland");
    expect(options.view).toEqual({ azimuth: 10, altitude: 30, fov: 80 });
    expect(options.timeScale).toBe(60);
    expect(options.intro).toBe(false);
    expect(options.interface).toBe(false);
  });

  it("leaves absent options undefined", () => {
    const options = readUrlOptions("");
    expect(options.place).toBeUndefined();
    expect(options.view).toBeUndefined();
    expect(options.intro).toBeUndefined();
  });
});

describe("settings", () => {
  it("ignore undefined options instead of wiping the defaults", () => {
    const settings = mergeSettings({ timeScale: undefined, place: undefined, layers: { meteors: false, aurora: undefined } });
    expect(settings.timeScale).toBe(SKY_DEFAULTS.timeScale);
    expect(settings.place).toBe(SKY_DEFAULTS.place);
    expect(settings.layers.meteors).toBe(false);
    expect(settings.layers.aurora).toBe(true);
  });
});
