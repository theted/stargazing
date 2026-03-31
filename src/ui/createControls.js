import { copySkyConfigSourceToClipboard } from "../sky/config-source.js";
import { clearSkyConfigStorage, writeSkyConfigToStorage } from "../sky/config-storage.js";
import { applyCameraPreset, CAMERA_PRESET_KEYS } from "../sky/presets.js";

const STORAGE_NOTICE = "Settings save automatically in localStorage.";

const formatValue = (value, format) => {
  if (typeof format === "function") {
    return format(value);
  }

  if (typeof format === "string") {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: format === "percent" ? 1 : 2,
    }).format(format === "percent" ? value * 100 : value);
  }

  return String(value);
};

const scheduleApply = (applyConfig, persistConfig) => {
  let pending = false;

  return () => {
    if (pending) {
      return;
    }

    pending = true;

    window.requestAnimationFrame(() => {
      pending = false;
      applyConfig();
      persistConfig();
    });
  };
};

const createRow = (className, labelText) => {
  const row = document.createElement("label");
  row.className = className;

  const label = document.createElement("span");
  label.className = "control-label";
  label.textContent = labelText;

  return { row, label };
};

const createSliderRow = ({ config, key, label, min, max, step, format, onChange }) => {
  const { row, label: heading } = createRow("control-row", label);

  const value = document.createElement("output");
  value.className = "control-value";
  value.textContent = formatValue(config[key], format);

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(config[key]);
  input.dataset.key = key;

  input.addEventListener("input", () => {
    const nextValue = Number(input.value);
    config[key] = nextValue;
    value.textContent = formatValue(nextValue, format);
    onChange(key, nextValue);
  });

  row.append(heading, value, input);
  return { row, input, value, format };
};

const createToggleRow = ({ config, key, label, onChange }) => {
  const { row, label: heading } = createRow("control-row control-row--toggle", label);

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(config[key]);
  input.dataset.key = key;

  input.addEventListener("change", () => {
    config[key] = input.checked;
    onChange(key, input.checked);
  });

  row.append(heading, input);
  return { row, input };
};

const createSelectRow = ({ config, key, label, options, onChange }) => {
  const { row, label: heading } = createRow("control-row", label);

  const select = document.createElement("select");

  options.forEach((option) => {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  });

  select.value = String(config[key]);

  select.addEventListener("change", () => {
    const nextValue = select.value;
    config[key] = nextValue;
    onChange(key, nextValue);
  });

  row.append(heading, select);
  return { row, select };
};

const createButtonRow = (buttons) => {
  const row = document.createElement("div");
  row.className = "control-actions";

  buttons.forEach((button) => {
    row.append(button);
  });

  return row;
};

const syncCameraInputs = (controls, config) => {
  const cameraKeys = ["observerLatitude", "lookAzimuth", "lookAltitude", "lookRoll"];

  cameraKeys.forEach((key) => {
    const control = controls.get(key);

    if (!control) {
      return;
    }

    control.input.value = String(config[key]);
    control.value.textContent = formatValue(config[key], control.format);
  });
};

const syncSelectValue = (controls, key, value) => {
  const control = controls.get(key);

  if (control) {
    control.select.value = value;
  }
};

const syncStarBounds = (controls, config, changedKey, nextValue) => {
  const minControl = controls.get("minStars");
  const maxControl = controls.get("maxStars");

  if (changedKey === "minStars" && nextValue > config.maxStars) {
    config.maxStars = nextValue;
    if (maxControl) {
      maxControl.input.value = String(nextValue);
      maxControl.value.textContent = formatValue(nextValue, maxControl.format);
    }
  }

  if (changedKey === "maxStars" && nextValue < config.minStars) {
    config.minStars = nextValue;
    if (minControl) {
      minControl.input.value = String(nextValue);
      minControl.value.textContent = formatValue(nextValue, minControl.format);
    }
  }
};

export const createControls = (sky) => {
  const panel = document.createElement("section");
  panel.className = "controls";
  panel.setAttribute("aria-label", "Sky configuration controls");
  panel.classList.toggle("controls--collapsed", false);

  const header = document.createElement("div");
  header.className = "controls-header";

  const title = document.createElement("h2");
  title.className = "controls-title";
  title.textContent = "Live controls";

  const toggleButton = document.createElement("button");
  toggleButton.type = "button";
  toggleButton.className = "controls-toggle";
  toggleButton.setAttribute("aria-expanded", "true");
  toggleButton.textContent = "Hide";

  const description = document.createElement("p");
  description.className = "controls-description";
  description.textContent = "Adjust the sky directly while the background keeps moving.";

  const notice = document.createElement("p");
  notice.className = "controls-notice";
  notice.textContent = STORAGE_NOTICE;

  const form = document.createElement("div");
  form.className = "controls-grid";

  const controls = new Map();
  const persistConfig = () => writeSkyConfigToStorage(sky.config);
  const applyAndPersist = scheduleApply(sky.applyConfig, persistConfig);
  let collapsed = false;

  const syncCollapsedState = () => {
    panel.classList.toggle("controls--collapsed", collapsed);
    toggleButton.textContent = collapsed ? "Show" : "Hide";
    toggleButton.setAttribute("aria-expanded", String(!collapsed));
  };

  toggleButton.addEventListener("click", () => {
    collapsed = !collapsed;
    syncCollapsedState();
  });

  const presetControl = createSelectRow({
    config: sky.config,
    key: "cameraPreset",
    label: "Camera preset",
    options: [
      { value: "custom", label: "Custom" },
      ...CAMERA_PRESET_KEYS.map((key) => ({
        value: key,
        label: key.replaceAll("-", " "),
      })),
    ],
    onChange: (_, nextValue) => {
      if (nextValue !== "custom") {
        applyCameraPreset(sky.config, nextValue);
        syncCameraInputs(controls, sky.config);
        syncSelectValue(controls, "cameraPreset", nextValue);
      }

      applyAndPersist();
    },
  });

  const sliders = [
    {
      key: "density",
      label: "Density",
      min: 0.00005,
      max: 0.005,
      step: 0.00001,
      format: (value) => `${value.toFixed(5)} / px`,
    },
    {
      key: "minStars",
      label: "Min stars",
      min: 0,
      max: 50000,
      step: 25,
    },
    {
      key: "maxStars",
      label: "Max stars",
      min: 100,
      max: 90000,
      step: 50,
    },
    {
      key: "baseStarSize",
      label: "Base star size",
      min: 0.15,
      max: 2.5,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "maxStarSize",
      label: "Max star size",
      min: 0.6,
      max: 10,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "starSizeVariation",
      label: "Star variation",
      min: 0,
      max: 6,
      step: 0.05,
      format: (value) => value.toFixed(2),
    },
    {
      key: "motionScale",
      label: "Motion scale",
      min: 0.4,
      max: 20,
      step: 0.1,
      format: (value) => value.toFixed(1),
    },
    {
      key: "timelapseIntensity",
      label: "Timelapse",
      min: 0.5,
      max: 8,
      step: 0.05,
      format: (value) => value.toFixed(2),
    },
    {
      key: "rotationSpeed",
      label: "Rotation speed",
      min: 0.0002,
      max: 0.02,
      step: 0.00005,
      format: (value) => value.toFixed(4),
    },
    {
      key: "trailTimeWarp",
      label: "Trail warp",
      min: 0,
      max: 80,
      step: 0.1,
      format: (value) => value.toFixed(1),
    },
    {
      key: "backgroundParallax",
      label: "Background parallax",
      min: 0,
      max: 0.45,
      step: 0.001,
      format: (value) => value.toFixed(3),
    },
    {
      key: "bandWeight",
      label: "Star band weight",
      min: 0,
      max: 1,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "bandAmplitude",
      label: "Band amplitude",
      min: 0,
      max: 1.5,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "screenCoverageBoost",
      label: "Coverage boost",
      min: 0,
      max: 4,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "edgeMagnification",
      label: "Edge magnification",
      min: 0,
      max: 4,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "horizonMagnification",
      label: "Horizon magnification",
      min: 0,
      max: 5,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "starSpread",
      label: "Star spread",
      min: 0,
      max: 2.5,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "atmosphereStrength",
      label: "Atmosphere strength",
      min: 0,
      max: 3.5,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "gravityStrength",
      label: "Gravity strength",
      min: 0,
      max: 1.6,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "meteorRate",
      label: "Meteors / min",
      min: 0,
      max: 24,
      step: 0.1,
      format: (value) => value.toFixed(1),
    },
    {
      key: "meteorTrailLength",
      label: "Meteor trail",
      min: 0.05,
      max: 0.8,
      step: 0.01,
      format: (value) => value.toFixed(2),
    },
    {
      key: "meteorGlow",
      label: "Meteor glow",
      min: 0.4,
      max: 3.2,
      step: 0.05,
      format: (value) => value.toFixed(2),
    },
    {
      key: "meteorWidth",
      label: "Meteor width",
      min: 0.5,
      max: 4.5,
      step: 0.05,
      format: (value) => value.toFixed(2),
    },
    {
      key: "maxActiveMeteors",
      label: "Max meteors",
      min: 0,
      max: 8,
      step: 1,
    },
    {
      key: "observerLatitude",
      label: "Latitude",
      min: -90,
      max: 90,
      step: 1,
    },
    {
      key: "lookAltitude",
      label: "Look altitude",
      min: 5,
      max: 89,
      step: 1,
    },
    {
      key: "lookAzimuth",
      label: "Look azimuth",
      min: -180,
      max: 180,
      step: 1,
    },
    {
      key: "lookRoll",
      label: "Roll",
      min: -30,
      max: 30,
      step: 1,
    },
  ];

  const toggleRows = [
    { key: "sizeVariationEnabled", label: "Enable size variation" },
    { key: "timelapseEnabled", label: "Enable timelapse" },
    { key: "atmosphereEnabled", label: "Enable atmosphere" },
    { key: "gravityEnabled", label: "Enable gravity" },
    { key: "meteorsEnabled", label: "Enable meteors" },
  ].map((toggle) =>
    createToggleRow({
      config: sky.config,
      key: toggle.key,
      label: toggle.label,
      onChange: () => applyAndPersist(),
    })
  );

  sliders.forEach((slider) => {
    const control = createSliderRow({
      ...slider,
      config: sky.config,
      onChange: (key, nextValue) => {
        if (key === "minStars" || key === "maxStars") {
          syncStarBounds(controls, sky.config, key, nextValue);
        }

        if (
          key === "observerLatitude" ||
          key === "lookAzimuth" ||
          key === "lookAltitude" ||
          key === "lookRoll"
        ) {
          sky.config.cameraPreset = "custom";
          syncSelectValue(controls, "cameraPreset", "custom");
        }

        applyAndPersist();
      },
    });

    controls.set(slider.key, control);
    form.append(control.row);
  });

  controls.set("cameraPreset", presetControl);
  form.insertBefore(presetControl.row, form.firstChild);

  toggleRows.forEach((toggleRow) => {
    form.append(toggleRow.row);
  });

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "control-button";
  copyButton.textContent = "Copy config";
  copyButton.addEventListener("click", async () => {
    try {
      await sky.copyConfigToClipboard();
      copyButton.textContent = "Copied";
      window.setTimeout(() => {
        copyButton.textContent = "Copy config";
      }, 1200);
    } catch {
      copyButton.textContent = "Copy failed";
      window.setTimeout(() => {
        copyButton.textContent = "Copy config";
      }, 1200);
    }
  });

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "control-button control-button--ghost";
  resetButton.textContent = "Reset saved settings";
  resetButton.addEventListener("click", () => {
    clearSkyConfigStorage();
    window.location.reload();
  });

  form.append(createButtonRow([copyButton, resetButton]));

  header.append(title, toggleButton);
  panel.append(header, description, notice, form);
  syncCollapsedState();
  return panel;
};
