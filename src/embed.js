import { createSky } from "./sky/createSky.js";

// Options are replaced at build time with the contents of embed-config.json.
const BAKED_OPTIONS = typeof __EMBED_CONFIG__ !== "undefined" ? __EMBED_CONFIG__ : {};

const style = document.createElement("style");
style.textContent = ".sky{position:fixed;inset:0;width:100%;height:100%;display:block;}";
document.head.appendChild(style);

let canvas = document.querySelector("canvas.sky");
if (!canvas) {
  canvas = document.createElement("canvas");
  canvas.className = "sky";
  document.body.insertBefore(canvas, document.body.firstChild);
}

// A background should not capture pointer input unless asked to.
window.sky = createSky(canvas, { interactive: false, ...BAKED_OPTIONS });
