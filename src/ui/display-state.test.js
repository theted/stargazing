import { describe, expect, it } from "vitest";

import {
  BOXED_STAGE_SIZE_DEFAULT,
  BOXED_STAGE_SIZE_MAX,
  BOXED_STAGE_SIZE_MIN,
  normalizeDisplayState,
} from "./display-state.js";

describe("display state", () => {
  it("defaults to fullscreen with the default boxed size", () => {
    expect(normalizeDisplayState()).toEqual({
      mode: "fullscreen",
      boxedSize: BOXED_STAGE_SIZE_DEFAULT,
    });
  });

  it("preserves boxed mode and clamps the boxed size", () => {
    expect(normalizeDisplayState({ mode: "boxed", boxedSize: BOXED_STAGE_SIZE_MAX + 400 })).toEqual({
      mode: "boxed",
      boxedSize: BOXED_STAGE_SIZE_MAX,
    });

    expect(normalizeDisplayState({ mode: "boxed", boxedSize: BOXED_STAGE_SIZE_MIN - 40 })).toEqual({
      mode: "boxed",
      boxedSize: BOXED_STAGE_SIZE_MIN,
    });
  });
});
