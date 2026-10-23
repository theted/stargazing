import { defineConfig } from "vite";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Options baked into the bundle (see SKY_DEFAULTS in src/sky/config.js for every key).
const configPath = resolve(__dirname, "embed-config.json");
const embedConfig = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf-8")) : {};

export default defineConfig({
  define: {
    __EMBED_CONFIG__: JSON.stringify(embedConfig),
  },
  build: {
    outDir: "dist/embed",
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/embed.js"),
      formats: ["iife"],
      // IIFE name is required by Rollup; unused since the file has no exports.
      name: "StarSky",
      fileName: () => "sky.js",
    },
    minify: "esbuild",
    target: "es2020",
  },
});
