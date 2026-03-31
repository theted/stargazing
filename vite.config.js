import { defineConfig } from "vite";

import { resolveGitHubPagesBase } from "./build/github-pages-base.js";

export default defineConfig(() => ({
  base: resolveGitHubPagesBase({
    repository: process.env.GITHUB_REPOSITORY,
    isGitHubActions: process.env.GITHUB_ACTIONS === "true",
  }),
}));
