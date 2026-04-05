import { defineConfig } from "vite";
import { readFileSync, existsSync } from "fs";
import { resolve, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the user's saved embed config (or fall back to empty object = all defaults).
const configPath = resolve(__dirname, "embed-config.json");
const embedConfig = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, "utf-8"))
  : {};

// Module stubs: replace disabled-feature modules with no-op equivalents so
// Rollup never bundles their code (data arrays, draw loops, etc.).
const FEATURE_STUBS = [
  {
    module: "nebulae.js",
    enabled: embedConfig.nebulaEnabled !== false,
  },
  {
    module: "meteors.js",
    enabled: embedConfig.meteorsEnabled !== false,
  },
  {
    module: "atmosphere.js",
    enabled: embedConfig.atmosphereEnabled !== false,
  },
];

// config-source is never needed in a compiled embed (no copy-to-clipboard UI).
const ALWAYS_STUBBED = ["config-source.js"];

const featureStubPlugin = {
  name: "embed-feature-stubs",
  enforce: "pre",
  resolveId(id, importer) {
    if (!importer) return null;
    const name = basename(id);

    if (ALWAYS_STUBBED.includes(name)) {
      return resolve(__dirname, `src/sky/stubs/${name}`);
    }

    for (const { module, enabled } of FEATURE_STUBS) {
      if (!enabled && name === module) {
        return resolve(__dirname, `src/sky/stubs/${module}`);
      }
    }

    return null;
  },
};

export default defineConfig({
  plugins: [featureStubPlugin],

  define: {
    // Bake the config object directly into the bundle as a literal.
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
    target: "es2019",
  },
});
