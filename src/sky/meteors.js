import { clamp, lerp, normalize, smoothstep } from "./math.js";

const randomBetween = (random, min, max) => lerp(min, max, random());

const isMeteorVisible = (meteor, viewport) =>
  meteor.x >= -meteor.trailLength * 1.25 &&
  meteor.x <= viewport.width + meteor.trailLength * 1.25 &&
  meteor.y >= -viewport.height * 0.35 &&
  meteor.y <= viewport.height + meteor.trailLength * 1.1;

export const createMeteorDelay = (config, random = Math.random) => {
  if (!config.meteorsEnabled || config.meteorRate <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const baseDelay = 60 / config.meteorRate;
  return randomBetween(random, baseDelay * 0.55, baseDelay * 1.45);
};

export const createMeteor = ({ viewport, config, random = Math.random }) => {
  const fromRight = random() > 0.42;
  const angle = fromRight
    ? randomBetween(random, Math.PI * 0.67, Math.PI * 0.88)
    : randomBetween(random, Math.PI * 0.12, Math.PI * 0.34);
  const direction = normalize({ x: Math.cos(angle), y: Math.sin(angle), z: 0 });
  const minDimension = Math.min(viewport.width, viewport.height);
  const duration = randomBetween(random, config.meteorDurationMin, config.meteorDurationMax);
  const travelDistance = randomBetween(random, minDimension * 0.55, minDimension * 1.12);

  return {
    x: fromRight
      ? randomBetween(random, viewport.width * 0.74, viewport.width * 1.08)
      : randomBetween(random, viewport.width * -0.08, viewport.width * 0.26),
    y: viewport.height * randomBetween(random, -0.16, 0.24),
    age: 0,
    duration,
    direction,
    speed: travelDistance / duration,
    trailLength:
      config.meteorTrailLength * minDimension * randomBetween(random, 0.78, 1.18),
    width: randomBetween(random, config.meteorWidth * 0.82, config.meteorWidth * 1.28),
    glow: randomBetween(random, config.meteorGlow * 0.85, config.meteorGlow * 1.18),
    brightness: randomBetween(random, 0.72, 1.18),
  };
};

export const createMeteorSystem = (config, random = Math.random) => ({
  active: [],
  cooldown: createMeteorDelay(config, random),
  random,
});

export const resetMeteorSystem = (system, config) => {
  system.active.length = 0;
  system.cooldown = createMeteorDelay(config, system.random);
};

export const updateMeteorSystem = ({ system, viewport, config, delta }) => {
  if (!config.meteorsEnabled || config.maxActiveMeteors <= 0) {
    system.active.length = 0;
    system.cooldown = createMeteorDelay(config, system.random);
    return;
  }

  system.cooldown -= delta;

  while (system.cooldown <= 0 && system.active.length < config.maxActiveMeteors) {
    system.active.push(
      createMeteor({
        viewport,
        config,
        random: system.random,
      })
    );
    system.cooldown += createMeteorDelay(config, system.random);
  }

  for (let index = system.active.length - 1; index >= 0; index -= 1) {
    const meteor = system.active[index];
    meteor.age += delta;
    meteor.x += meteor.direction.x * meteor.speed * delta;
    meteor.y += meteor.direction.y * meteor.speed * delta;

    if (meteor.age >= meteor.duration || !isMeteorVisible(meteor, viewport)) {
      system.active.splice(index, 1);
    }
  }
};

export const drawMeteors = ({ ctx, system }) => {
  if (system.active.length === 0) {
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (const meteor of system.active) {
    const life = clamp(meteor.age / meteor.duration, 0, 1);
    const alpha =
      smoothstep(0, 0.12, life) * (1 - smoothstep(0.64, 1, life)) * meteor.brightness;

    if (alpha <= 0.01) {
      continue;
    }

    const tailX = meteor.x - meteor.direction.x * meteor.trailLength;
    const tailY = meteor.y - meteor.direction.y * meteor.trailLength;
    const trail = ctx.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
    trail.addColorStop(0, `rgba(255, 252, 244, ${0.94 * alpha})`);
    trail.addColorStop(0.16, `rgba(200, 227, 255, ${0.64 * alpha})`);
    trail.addColorStop(0.52, `rgba(116, 168, 255, ${0.22 * alpha})`);
    trail.addColorStop(1, "rgba(116, 168, 255, 0)");

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(meteor.x, meteor.y);
    ctx.lineWidth = meteor.width;
    ctx.lineCap = "round";
    ctx.strokeStyle = trail;
    ctx.stroke();

    const glowRadius = meteor.width * (2.4 + meteor.glow * 2.3);
    const glow = ctx.createRadialGradient(
      meteor.x,
      meteor.y,
      0,
      meteor.x,
      meteor.y,
      glowRadius
    );
    glow.addColorStop(0, `rgba(255, 244, 226, ${0.28 * alpha * meteor.glow})`);
    glow.addColorStop(0.42, `rgba(145, 197, 255, ${0.14 * alpha * meteor.glow})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(
      meteor.x - glowRadius,
      meteor.y - glowRadius,
      glowRadius * 2,
      glowRadius * 2
    );

    ctx.beginPath();
    ctx.arc(meteor.x, meteor.y, meteor.width * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  ctx.restore();
};
