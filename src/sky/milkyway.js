import { DEG, TAU } from "./config.js";
import { clamp, hashNoise1D, lerp } from "./math.js";
import {
  createDirectionTarget,
  createProjectionTarget,
  equatorialToHorizontal,
  projectDirection,
} from "./projection.js";

export const MILKY_WAY_PATCH_COUNT = 22;

// Soft glow palette: warm star-cloud core, cool dust haze, faint violet wisps
const SPRITE_COLORS = [
  { r: 255, g: 232, b: 198 },
  { r: 168, g: 196, b: 255 },
  { r: 222, g: 204, b: 255 },
];
const SPRITE_SIZE = 128;

// Glow patches that trace the same wavy declination band the stars cluster
// around, so the milky way reads as the source of the dense star lane.
export const createMilkyWay = (config) => {
  const seed = (config.driftSeed ?? 0) * 7.3;
  const patches = [];

  for (let index = 0; index < MILKY_WAY_PATCH_COUNT; index += 1) {
    const sample = (key) => hashNoise1D(index * 3.77 + key, seed);
    const hourOffset = (index / MILKY_WAY_PATCH_COUNT) * TAU + (sample(1) - 0.5) * 0.5;
    const bandWave = Math.sin(hourOffset * config.bandFrequency + config.bandPhase);
    const sinDec = clamp(
      bandWave * config.bandAmplitude + (sample(2) - 0.5) * config.bandSpread * 0.8,
      -0.98,
      0.98
    );
    const colorRoll = sample(5);

    patches.push({
      hourOffset,
      sinDec,
      cosDec: Math.sqrt(1 - sinDec * sinDec),
      angularRadius: lerp(9, 19, sample(3)) * DEG,
      alpha: lerp(0.5, 1, sample(4)),
      spriteIndex: colorRoll < 0.55 ? 0 : colorRoll < 0.85 ? 1 : 2,
    });
  }

  return patches;
};

// Pre-rendered radial-gradient sprites: one drawImage per patch per frame
// instead of building a fresh canvas gradient every frame.
const spriteCache = [];

const getPatchSprite = (index) => {
  if (!spriteCache[index]) {
    const sprite = document.createElement("canvas");
    sprite.width = SPRITE_SIZE;
    sprite.height = SPRITE_SIZE;

    const spriteCtx = sprite.getContext("2d");
    const { r, g, b } = SPRITE_COLORS[index];
    const half = SPRITE_SIZE / 2;
    const gradient = spriteCtx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.16)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    spriteCtx.fillStyle = gradient;
    spriteCtx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    spriteCache[index] = sprite;
  }

  return spriteCache[index];
};

const dirScratch = createDirectionTarget();
const projScratch = createProjectionTarget();

export const drawMilkyWay = ({
  ctx,
  milkyWay,
  rotation,
  derived,
  viewport,
  config,
  alphaScale = 1,
}) => {
  if (config.milkyWayEnabled === false || !milkyWay?.length) {
    return;
  }

  const intensity = (config.milkyWayIntensity ?? 0.65) * alphaScale;

  if (intensity <= 0.01) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (const patch of milkyWay) {
    const direction = equatorialToHorizontal({
      star: patch,
      hourAngle: patch.hourOffset + rotation,
      derived,
      target: dirScratch,
    });

    if (direction.y < -0.25) continue;

    const proj = projectDirection({
      direction,
      derived,
      viewport,
      config,
      target: projScratch,
    });

    if (!proj.visible || proj.fade < 0.02) continue;

    const radius = patch.angularRadius * viewport.focal * proj.scale * 1.7;
    if (radius < 6) continue;

    ctx.globalAlpha = clamp(proj.fade * patch.alpha * intensity * 0.42, 0, 1);
    ctx.drawImage(
      getPatchSprite(patch.spriteIndex),
      proj.x - radius,
      proj.y - radius,
      radius * 2,
      radius * 2
    );
  }

  ctx.restore();
};
