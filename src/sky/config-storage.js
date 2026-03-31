const STORAGE_KEY = "stargazing.sky-config";

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const readSkyConfigFromStorage = () => {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeSkyConfigToStorage = (config) => {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
};

export const clearSkyConfigStorage = () => {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};
