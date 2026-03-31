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

const scheduleApply = (applyConfig) => {
  let pending = false;

  return () => {
    if (pending) {
      return;
    }

    pending = true;

    window.requestAnimationFrame(() => {
      pending = false;
      applyConfig();
    });
  };
};

const createSliderRow = ({ config, key, label, min, max, step, format, onChange }) => {
  const row = document.createElement("label");
  row.className = "control-row";

  const heading = document.createElement("span");
  heading.className = "control-label";
  heading.textContent = label;

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
    onChange();
  });

  row.append(heading, value, input);
  return { row, input, value };
};

export const createControls = (sky) => {
  const panel = document.createElement("section");
  panel.className = "controls";
  panel.setAttribute("aria-label", "Sky configuration controls");

  const title = document.createElement("h2");
  title.className = "controls-title";
  title.textContent = "Live controls";

  const description = document.createElement("p");
  description.className = "controls-description";
  description.textContent = "Adjust the sky directly while the background keeps moving.";

  const form = document.createElement("div");
  form.className = "controls-grid";

  const applyConfig = scheduleApply(sky.applyConfig);
  const controls = new Map();

  const syncStarBounds = (changedKey, nextValue) => {
    const minControl = controls.get("minStars");
    const maxControl = controls.get("maxStars");

    if (changedKey === "minStars" && nextValue > sky.config.maxStars) {
      sky.config.maxStars = nextValue;
      if (maxControl) {
        maxControl.input.value = String(nextValue);
        maxControl.value.textContent = formatValue(nextValue);
      }
    }

    if (changedKey === "maxStars" && nextValue < sky.config.minStars) {
      sky.config.minStars = nextValue;
      if (minControl) {
        minControl.input.value = String(nextValue);
        minControl.value.textContent = formatValue(nextValue);
      }
    }
  };

  const sliders = [
    {
      key: "density",
      label: "Density",
      min: 0.00005,
      max: 0.0006,
      step: 0.00001,
      format: (value) => `${value.toFixed(5)} / px`,
    },
    {
      key: "minStars",
      label: "Min stars",
      min: 200,
      max: 6000,
      step: 10,
    },
    {
      key: "maxStars",
      label: "Max stars",
      min: 600,
      max: 12000,
      step: 20,
    },
    {
      key: "motionScale",
      label: "Motion scale",
      min: 0.5,
      max: 6,
      step: 0.1,
    },
    {
      key: "rotationSpeed",
      label: "Rotation speed",
      min: 0.0002,
      max: 0.006,
      step: 0.00005,
      format: (value) => value.toFixed(4),
    },
    {
      key: "trailTimeWarp",
      label: "Trail warp",
      min: 0,
      max: 24,
      step: 0.1,
    },
    {
      key: "backgroundParallax",
      label: "Background parallax",
      min: 0,
      max: 0.15,
      step: 0.001,
      format: (value) => value.toFixed(3),
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

  sliders.forEach((slider) => {
    const control = createSliderRow({
      ...slider,
      config: sky.config,
      onChange: applyConfig,
    });

    controls.set(slider.key, control);

    control.input.addEventListener("input", () => {
      if (slider.key === "minStars" || slider.key === "maxStars") {
        syncStarBounds(slider.key, Number(control.input.value));
      }
    });

    form.append(control.row);
  });

  panel.append(title, description, form);
  return panel;
};
