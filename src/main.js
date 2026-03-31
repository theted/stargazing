import { SKY_CONFIG } from "./sky/config.js";
import { readSkyConfigFromStorage } from "./sky/config-storage.js";
import { applyCameraPreset } from "./sky/presets.js";
import { createSky } from "./sky/createSky.js";
import { createControls } from "./ui/createControls.js";
import { createFpsCounter } from "./ui/createFpsCounter.js";
import {
  readDisplayStateFromStorage,
  normalizeDisplayState,
  writeDisplayStateToStorage,
} from "./ui/display-state.js";

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

const displayState = readDisplayStateFromStorage();

const applyDisplayState = (state) => {
  const nextState = normalizeDisplayState(state);
  document.body.dataset.stageMode = nextState.mode;
  document.body.style.setProperty("--boxed-stage-size", `${nextState.boxedSize}px`);
  return nextState;
};

let runtimeDisplayState = applyDisplayState(displayState);

const sky = createSky(canvas, SKY_CONFIG);

const setDisplayMode = (mode) => {
  runtimeDisplayState = applyDisplayState({
    ...runtimeDisplayState,
    mode,
  });
  writeDisplayStateToStorage(runtimeDisplayState);
  sky.resize();
};

const setBoxedStageSize = (boxedSize) => {
  runtimeDisplayState = applyDisplayState({
    ...runtimeDisplayState,
    boxedSize,
  });
  writeDisplayStateToStorage(runtimeDisplayState);

  if (runtimeDisplayState.mode === "boxed") {
    sky.resize();
  }
};

sky.getDisplayMode = () => runtimeDisplayState.mode;
sky.getBoxedStageSize = () => runtimeDisplayState.boxedSize;
sky.setDisplayMode = setDisplayMode;
sky.setBoxedStageSize = setBoxedStageSize;

window.skyDemo = sky;

if (content instanceof HTMLElement) {
  content.insertAdjacentElement("afterend", createControls(sky));
}

document.body.append(createFpsCounter(sky));
