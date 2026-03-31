export const BOXED_STAGE_SIZE_MIN = 120;
export const BOXED_STAGE_SIZE_MAX = 1200;
export const BOXED_STAGE_SIZE_STEP = 10;
export const BOXED_STAGE_SIZE_DEFAULT = 300;

const STORAGE_KEY = "stargazing.display-state";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const canUseStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const normalizeDisplayState = (state = {}) => ({
  mode: state?.mode === "boxed" ? "boxed" : "fullscreen",
  boxedSize: clamp(
    Math.round(Number(state?.boxedSize) || BOXED_STAGE_SIZE_DEFAULT),
    BOXED_STAGE_SIZE_MIN,
    BOXED_STAGE_SIZE_MAX
  ),
});

export const readDisplayStateFromStorage = () => {
  if (!canUseStorage()) {
    return normalizeDisplayState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeDisplayState(JSON.parse(raw)) : normalizeDisplayState();
  } catch {
    return normalizeDisplayState();
  }
};

export const writeDisplayStateToStorage = (state) => {
  if (!canUseStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeDisplayState(state)));
    return true;
  } catch {
    return false;
  }
};

export const clearDisplayStateStorage = () => {
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
