import { clamp } from "./math.js";

export const QUALITY_MIN = 0.3;
const DROP_STEP = 0.08;
const RECOVER_STEP = 0.03;

export const createQualityController = () => ({ level: 1 });

// Called on each FPS sample (~4x per second). Sheds drawn-star fraction fast
// when below target, recovers slowly to avoid oscillation.
export const updateQualityLevel = (controller, { fps, config }) => {
  if (!config.adaptiveQualityEnabled) {
    controller.level = 1;
    return controller.level;
  }

  const target = config.targetFps ?? 50;

  if (fps < target - 4) {
    controller.level = clamp(controller.level - DROP_STEP, QUALITY_MIN, 1);
  } else if (fps > target + 8) {
    controller.level = clamp(controller.level + RECOVER_STEP, QUALITY_MIN, 1);
  }

  return controller.level;
};
