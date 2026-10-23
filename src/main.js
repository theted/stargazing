import { createSky } from "./sky/createSky.js";
import { createInterface } from "./ui/createInterface.js";
import { readPreferences, readUrlOptions, snapshotPreferences, writePreferences } from "./ui/preferences.js";

const canvas = document.querySelector("canvas.sky");
const { interface: showInterface, ...urlOptions } = readUrlOptions(window.location.search);
const saved = readPreferences();
const defined = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));

try {
  const sky = createSky(canvas, { ...saved, ...defined(urlOptions), layers: { ...saved.layers } });

  window.sky = sky;

  createInterface({
    sky,
    visible: showInterface !== false,
    onChange: () => writePreferences(snapshotPreferences(sky.settings)),
  });
} catch (error) {
  console.error(error);
  document.body.dataset.fallback = "true";
}
