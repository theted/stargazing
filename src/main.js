import { SKY_CONFIG } from "./sky/config.js";
import { readSkyConfigFromStorage } from "./sky/config-storage.js";
import { applyCameraPreset } from "./sky/presets.js";
import { createSky } from "./sky/createSky.js";
import { createControls } from "./ui/createControls.js";
import { createFpsCounter } from "./ui/createFpsCounter.js";

const canvas = document.querySelector(".sky");
const content = document.querySelector(".content");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected a .sky canvas element.");
}

const savedConfig = readSkyConfigFromStorage();

if (savedConfig && typeof savedConfig === "object") {
  Object.assign(SKY_CONFIG, savedConfig);
}

if (SKY_CONFIG.cameraPreset && SKY_CONFIG.cameraPreset !== "custom") {
  applyCameraPreset(SKY_CONFIG, SKY_CONFIG.cameraPreset);
}

const sky = createSky(canvas, SKY_CONFIG);

const setDisplayMode = (mode) => {
  const nextMode = mode === "boxed" ? "boxed" : "fullscreen";
  document.body.dataset.stageMode = nextMode;
  sky.resize();
};

sky.getDisplayMode = () => document.body.dataset.stageMode || "fullscreen";
sky.setDisplayMode = setDisplayMode;

setDisplayMode("fullscreen");

window.skyDemo = sky;

if (content instanceof HTMLElement) {
  content.insertAdjacentElement("afterend", createControls(sky));
}

document.body.append(createFpsCounter(sky));
