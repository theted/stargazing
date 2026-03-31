import { describe, expect, it } from "vitest";

import { resolveGitHubPagesBase } from "./github-pages-base.js";

describe("github pages base resolver", () => {
  it("uses root locally", () => {
    expect(resolveGitHubPagesBase()).toBe("/");
  });

  it("uses the repo path for project pages deployments", () => {
    expect(
      resolveGitHubPagesBase({
        repository: "fredrik/stargazing",
        isGitHubActions: true,
      })
    ).toBe("/stargazing/");
  });

  it("uses root for user site deployments", () => {
    expect(
      resolveGitHubPagesBase({
        repository: "fredrik/fredrik.github.io",
        isGitHubActions: true,
      })
    ).toBe("/");
  });
});
