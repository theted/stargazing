const formatPrimitive = (value) => {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : Number(value).toString();
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return JSON.stringify(value);
};

export const formatSkyConfigSource = (config) => {
  const lines = Object.entries(config)
    .filter(([, value]) => typeof value !== "undefined")
    .map(([key, value]) => `  ${key}: ${formatPrimitive(value)},`);

  return `export const SKY_CONFIG = {\n${lines.join("\n")}\n};\n`;
};

export const copySkyConfigSourceToClipboard = async (config) => {
  const source = formatSkyConfigSource(config);
  await navigator.clipboard.writeText(source);
  return source;
};
