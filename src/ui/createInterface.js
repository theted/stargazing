// The quiet layer of interface over the sky: a museum-label caption (place, coordinates,
// sidereal time) and a small panel behind a single button. Everything fades away while
// the viewer is just looking.

import { PLACES, PLACE_KEYS } from "../sky/places.js";
import { formatSexagesimal } from "../sky/astro.js";
import { EXPOSURES, formatTimeScale, sliderToTimeScale, timeScaleToSlider } from "./preferences.js";

const IDLE_SECONDS = 3.5;

const LAYERS = [
  { key: "milkyWay", label: "Milky Way" },
  { key: "atmosphere", label: "Atmosphere" },
  { key: "landscape", label: "Landscape" },
  { key: "aurora", label: "Aurora" },
  { key: "meteors", label: "Meteors" },
  { key: "satellites", label: "Satellites" },
  { key: "twinkle", label: "Twinkle" },
];

const element = (tag, { className, text, attributes = {} } = {}, children = []) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  node.append(...children);
  return node;
};

const formatLatitude = (degrees) => `${formatSexagesimal(Math.abs(degrees))} ${degrees < 0 ? "S" : "N"}`;
const formatLongitude = (degrees) => `${formatSexagesimal(Math.abs(degrees))} ${degrees < 0 ? "W" : "E"}`;
const formatSiderealTime = (radians) => `LST ${formatSexagesimal((radians / (Math.PI * 2)) * 24, { hours: true })}`;

const SETTINGS_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l1.6 6.3 6.4 1.7-6.4 1.7L12 18.5l-1.6-6.3L4 10.5l6.4-1.7z" fill="currentColor"/><circle cx="19" cy="19" r="1.3" fill="currentColor"/><circle cx="5" cy="19.5" r="0.9" fill="currentColor"/></svg>`;

// A row of mutually exclusive buttons.
const createSegmented = (label, options, current, onSelect) => {
  const group = element("div", { className: "segmented", attributes: { role: "radiogroup", "aria-label": label } });
  const buttons = options.map(({ value, text }) => {
    const button = element("button", { className: "segment", text, attributes: { type: "button", role: "radio" } });
    button.addEventListener("click", () => onSelect(value));
    group.append(button);
    return { value, button };
  });

  const sync = (selected) => {
    buttons.forEach(({ value, button }) => button.setAttribute("aria-checked", String(value === selected)));
  };

  sync(current);
  return { group, sync };
};

export const createInterface = ({ sky, root = document.body, visible = true, onChange = () => {} }) => {
  const settings = sky.settings;
  let lastSpeed = settings.timeScale > 0 ? settings.timeScale : 36;

  // ─── Caption ──────────────────────────────────────────────────────────────
  const captionName = element("p", { className: "caption-name" });
  const captionRegion = element("span");
  const captionCoordinates = element("span");
  const captionClock = element("span", { className: "caption-clock" });
  const caption = element("figure", { className: "caption", attributes: { "aria-live": "off" } }, [
    captionName,
    element("p", { className: "caption-meta" }, [captionRegion, captionCoordinates, captionClock]),
  ]);

  let captionPlace = null;
  const syncCaption = () => {
    if (captionPlace !== sky.place) {
      captionPlace = sky.place;
      captionName.textContent = captionPlace.name;
      captionRegion.textContent = captionPlace.region;
      captionCoordinates.textContent = `${formatLatitude(captionPlace.latitude)}  ${formatLongitude(captionPlace.longitude)}`;
    }
    captionClock.textContent = formatSiderealTime(sky.localSiderealTime);
  };

  // ─── Panel ────────────────────────────────────────────────────────────────
  const toggle = element("button", {
    className: "hud-button",
    attributes: { type: "button", "aria-label": "Sky settings", "aria-expanded": "false", "aria-controls": "sky-panel" },
  });
  toggle.innerHTML = SETTINGS_ICON;

  const places = createSegmented(
    "Place",
    PLACE_KEYS.map((key) => ({ value: key, text: PLACES[key].label })),
    settings.place,
    (key) => {
      sky.setPlace(key);
      places.sync(key);
      onChange();
    }
  );

  const speedValue = element("output", { className: "panel-value" });
  const speed = element("input", {
    className: "slider",
    attributes: { type: "range", min: "0", max: "1", step: "0.001", "aria-label": "Speed of the sky" },
  });
  const syncSpeed = () => {
    speed.value = String(timeScaleToSlider(settings.timeScale));
    speedValue.textContent = formatTimeScale(settings.timeScale);
  };
  speed.addEventListener("input", () => {
    sky.setTimeScale(sliderToTimeScale(Number(speed.value)));
    if (settings.timeScale > 0) lastSpeed = settings.timeScale;
    speedValue.textContent = formatTimeScale(settings.timeScale);
    onChange();
  });

  const exposure = createSegmented(
    "Exposure",
    EXPOSURES.map(({ minutes, label }) => ({ value: minutes, text: label })),
    settings.trails,
    (minutes) => {
      sky.setTrails(minutes);
      exposure.sync(minutes);
      onChange();
    }
  );

  const layerButtons = LAYERS.map(({ key, label }) => {
    const button = element("button", { className: "chip", text: label, attributes: { type: "button" } });
    button.addEventListener("click", () => {
      sky.setLayer(key, !settings.layers[key]);
      syncLayers();
      onChange();
    });
    return { key, button };
  });
  const syncLayers = () => {
    layerButtons.forEach(({ key, button }) => {
      button.setAttribute("aria-pressed", String(Boolean(settings.layers[key])));
      button.hidden = key === "aurora" && !(sky.place.atmosphere.aurora > 0);
    });
  };

  const resetButton = element("button", { className: "text-button", text: "Reset view", attributes: { type: "button" } });
  resetButton.addEventListener("click", () => sky.resetView());
  const fullscreenButton = element("button", { className: "text-button", text: "Full screen", attributes: { type: "button" } });
  fullscreenButton.addEventListener("click", () => toggleFullscreen());

  const group = (label, control, value) =>
    element("div", { className: "panel-group" }, [
      element("div", { className: "panel-label" }, value ? [element("span", { text: label }), value] : [element("span", { text: label })]),
      control,
    ]);

  const panel = element("section", { className: "panel", attributes: { id: "sky-panel", "aria-label": "Sky settings" } }, [
    group("Place", places.group),
    group("Time", speed, speedValue),
    group("Exposure", exposure.group),
    group("Layers", element("div", { className: "chips" }, layerButtons.map(({ button }) => button))),
    element("div", { className: "panel-actions" }, [resetButton, fullscreenButton]),
    element("p", {
      className: "panel-hint",
      text: "Drag to look around, scroll to zoom, double-click to make a wish. H hides everything.",
    }),
  ]);
  panel.hidden = true;

  const hud = element("div", { className: "hud" }, [caption, toggle, panel]);
  root.append(hud);

  // ─── Behaviour ────────────────────────────────────────────────────────────
  const setPanelOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    root.dataset.panel = open ? "open" : "closed";
    if (open) {
      places.sync(settings.place);
      exposure.sync(settings.trails);
      syncSpeed();
      syncLayers();
    }
  };
  toggle.addEventListener("click", () => setPanelOpen(panel.hidden));

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  let idleTimer = 0;
  const wake = (seconds = IDLE_SECONDS) => {
    root.dataset.idle = "false";
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      if (panel.hidden) root.dataset.idle = "true";
    }, seconds * 1000);
  };
  const handleActivity = () => wake();

  const setVisible = (show) => {
    root.dataset.hud = show ? "visible" : "hidden";
    if (!show) setPanelOpen(false);
  };

  const cycleExposure = () => {
    const index = EXPOSURES.findIndex(({ minutes }) => minutes === settings.trails);
    const next = EXPOSURES[(index + 1) % EXPOSURES.length].minutes;
    sky.setTrails(next);
    exposure.sync(next);
  };

  const handleKey = (event) => {
    if (event.target instanceof HTMLInputElement && event.target.type !== "range") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    let handled = true;

    if (key === " ") {
      if (settings.timeScale > 0) {
        lastSpeed = settings.timeScale;
        sky.setTimeScale(0);
      } else {
        sky.setTimeScale(lastSpeed);
      }
      syncSpeed();
    } else if (key === "t") {
      cycleExposure();
    } else if (key === "h") {
      setVisible(root.dataset.hud === "hidden");
    } else if (key === "f") {
      toggleFullscreen();
    } else if (key === "r") {
      sky.resetView();
    } else if (key === "m") {
      sky.triggerMeteor();
    } else if (key === "escape") {
      setPanelOpen(false);
    } else if (/^[1-9]$/.test(key) && PLACE_KEYS[Number(key) - 1]) {
      sky.setPlace(PLACE_KEYS[Number(key) - 1]);
      places.sync(PLACE_KEYS[Number(key) - 1]);
    } else {
      handled = false;
    }

    if (handled) {
      event.preventDefault();
      onChange();
      wake();
    }
  };

  window.addEventListener("keydown", handleKey);
  window.addEventListener("pointermove", handleActivity, { passive: true });
  window.addEventListener("pointerdown", handleActivity, { passive: true });

  syncCaption();
  const clock = window.setInterval(() => {
    syncCaption();
    if (!panel.hidden) syncLayers();
  }, 500);

  // The caption arrives once the eyes have adjusted to the dark, and lingers a while.
  const captionDelay = settings.intro ? 3.2 : 0;
  setVisible(visible);
  setPanelOpen(false);
  wake(captionDelay + 7);
  window.setTimeout(() => (root.dataset.intro = "done"), captionDelay * 1000);

  return {
    dispose: () => {
      window.clearInterval(clock);
      window.clearTimeout(idleTimer);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("pointermove", handleActivity);
      window.removeEventListener("pointerdown", handleActivity);
      hud.remove();
    },
  };
};
