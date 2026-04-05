import { SKY_CONFIG } from "./sky/config.js";
import { createSky } from "./sky/createSky.js";

// Config is replaced at build time with the contents of embed-config.json.
// Falls back to empty object (all defaults) when running outside the embed build.
const BAKED_CONFIG = typeof __EMBED_CONFIG__ !== "undefined" ? __EMBED_CONFIG__ : {};
const config = Object.assign({}, SKY_CONFIG, BAKED_CONFIG);

// Inject the minimal canvas style so the embed works without any external CSS.
const style = document.createElement("style");
style.textContent =
  ".sky{position:fixed;inset:0;width:100%;height:100%;display:block;}";
document.head.appendChild(style);

// Reuse an existing .sky canvas or prepend a new one.
let canvas = document.querySelector("canvas.sky");
if (!canvas) {
  canvas = document.createElement("canvas");
  canvas.className = "sky";
  document.body.insertBefore(canvas, document.body.firstChild);
}

// Expose the sky instance for programmatic control.
window.sky = createSky(canvas, config);
