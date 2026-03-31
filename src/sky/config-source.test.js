import { describe, expect, it } from "vitest";

import { formatSkyConfigSource } from "./config-source.js";

describe("config source formatting", () => {
  it("renders a config object as source code", () => {
    const source = formatSkyConfigSource({
      density: 0.00085,
      cameraPreset: "equatorial-night",
      timelapseEnabled: true,
    });

    expect(source).toContain("export const SKY_CONFIG = {");
    expect(source).toContain('  cameraPreset: "equatorial-night",');
    expect(source).toContain("  timelapseEnabled: true,");
  });
});
