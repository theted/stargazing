// Viewer preferences (saved per browser) and options from the URL, which win over them.

const STORAGE_KEY = "stargazing.preferences";

export const SPEED_MAX = 1200;

export const EXPOSURES = [
  { minutes: 0, label: "Pinpoint" },
  { minutes: 15, label: "15 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 180, label: "3 hours" },
];

// The speed slider is logarithmic: the left edge holds the sky still, then real time,
// up to SPEED_MAX× at the right.
export const sliderToTimeScale = (value) =>
  value < 0.02 ? 0 : Math.pow(10, ((value - 0.02) / 0.98) * Math.log10(SPEED_MAX));

export const timeScaleToSlider = (scale) =>
  scale <= 0 ? 0 : 0.02 + (0.98 * Math.log10(Math.max(scale, 1))) / Math.log10(SPEED_MAX);

export const formatTimeScale = (scale) => {
  if (scale <= 0) return "Still";
  if (scale < 1.5) return "Real time";
  return `${scale < 10 ? scale.toFixed(1) : Math.round(scale)}×`;
};

export const readPreferences = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const writePreferences = (preferences) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Private windows and blocked storage simply don't remember.
  }
};

export const snapshotPreferences = (settings) => ({
  place: settings.place,
  timeScale: settings.timeScale,
  trails: settings.trails,
  layers: { ...settings.layers },
});

const numberOrUndefined = (value) => {
  if (value === null || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

// ?place=lapland&speed=60&trails=60&az=10&alt=30&fov=90&lst=4.5&intro=0&ui=0&quality=high
export const readUrlOptions = (search) => {
  const params = new URLSearchParams(search);
  const azimuth = numberOrUndefined(params.get("az"));
  const altitude = numberOrUndefined(params.get("alt"));
  const fov = numberOrUndefined(params.get("fov"));
  const hasView = azimuth !== undefined || altitude !== undefined || fov !== undefined;

  return {
    place: params.get("place") ?? undefined,
    lst: numberOrUndefined(params.get("lst")),
    timeScale: numberOrUndefined(params.get("speed")),
    trails: numberOrUndefined(params.get("trails")),
    quality: params.get("quality") ?? undefined,
    debug: params.get("debug") ?? undefined,
    intro: params.get("intro") === "0" ? false : undefined,
    interface: params.get("ui") === "0" ? false : undefined,
    view: hasView ? { azimuth: azimuth ?? 0, altitude: altitude ?? 30, fov: fov ?? 100 } : undefined,
  };
};
