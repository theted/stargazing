import { SKY_CONFIG } from "./sky/config.js";
import { readSkyConfigFromStorage } from "./sky/config-storage.js";
import { createSky } from "./sky/createSky.js";
import { createControls } from "./ui/createControls.js";

const canvas = document.querySelector(".sky");
const content = document.querySelector(".content");

if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Expected a .sky canvas element.");
}

const savedConfig = readSkyConfigFromStorage();

if (savedConfig && typeof savedConfig === "object") {
  Object.assign(SKY_CONFIG, savedConfig);
}

const sky = createSky(canvas, SKY_CONFIG);

window.skyDemo = sky;

if (content instanceof HTMLElement) {
  content.insertAdjacentElement("afterend", createControls(sky));
}
