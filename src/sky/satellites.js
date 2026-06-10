import { clamp, lerp, smoothstep } from "./math.js";

const randomBetween = (random, min, max) => lerp(min, max, random());

export const createSatelliteDelay = (config, random = Math.random) => {
  if (!config.satellitesEnabled || (config.satelliteRate ?? 0) <= 0) {
    return Number.POSITIVE_INFINITY;
  }

  const baseDelay = 60 / config.satelliteRate;
  return randomBetween(random, baseDelay * 0.5, baseDelay * 1.5);
};

export const createSatellite = ({ viewport, config, random = Math.random }) => {
  // Straight line through a random interior point, long enough to cross the frame.
  const angle = randomBetween(random, 0, Math.PI * 2);
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const travel = Math.hypot(viewport.width, viewport.height) * 1.25;
  const duration = randomBetween(random, 18, 40);
  const throughX = viewport.width * randomBetween(random, 0.2, 0.8);
  const throughY = viewport.height * randomBetween(random, 0.12, 0.72);
  // Roughly a third of passes catch the sun for an iridium-style flare.
  const willFlare = random() < 0.35;

  return {
    x: throughX - direction.x * travel * 0.5,
    y: throughY - direction.y * travel * 0.5,
    direction,
    speed: travel / duration,
    age: 0,
    duration,
    size: randomBetween(random, 0.8, 1.5),
    baseAlpha: randomBetween(random, 0.28, 0.55),
    blinkSpeed: randomBetween(random, 1.6, 6.5),
    blinkDepth: randomBetween(random, 0.1, 0.45),
    flareAt: willFlare ? randomBetween(random, 0.3, 0.7) : -1,
    flareWidth: randomBetween(random, 0.025, 0.06),
    flareGain: randomBetween(random, 2.2, 4.5),
  };
};

export const createSatelliteSystem = (config, random = Math.random) => ({
  active: [],
  cooldown: createSatelliteDelay(config, random),
  random,
});

export const resetSatelliteSystem = (system, config) => {
  system.active.length = 0;
  system.cooldown = createSatelliteDelay(config, system.random);
};

export const updateSatelliteSystem = ({ system, viewport, config, delta }) => {
  if (!config.satellitesEnabled || (config.maxActiveSatellites ?? 0) <= 0) {
    system.active.length = 0;
    system.cooldown = createSatelliteDelay(config, system.random);
    return;
  }

  system.cooldown -= delta;

  while (system.cooldown <= 0 && system.active.length < config.maxActiveSatellites) {
    system.active.push(createSatellite({ viewport, config, random: system.random }));
    system.cooldown += createSatelliteDelay(config, system.random);
  }

  for (let index = system.active.length - 1; index >= 0; index -= 1) {
    const satellite = system.active[index];
    satellite.age += delta;
    satellite.x += satellite.direction.x * satellite.speed * delta;
    satellite.y += satellite.direction.y * satellite.speed * delta;

    if (satellite.age >= satellite.duration) {
      system.active.splice(index, 1);
    }
  }
};

export const getSatelliteAlpha = (satellite) => {
  const life = clamp(satellite.age / satellite.duration, 0, 1);
  const edgeFade = smoothstep(0, 0.08, life) * (1 - smoothstep(0.92, 1, life));
  const blink =
    1 - satellite.blinkDepth * (0.5 + 0.5 * Math.sin(satellite.age * satellite.blinkSpeed));
  const flare =
    satellite.flareAt > 0
      ? satellite.flareGain *
        Math.exp(-(((life - satellite.flareAt) / satellite.flareWidth) ** 2))
      : 0;

  return {
    alpha: clamp(satellite.baseAlpha * edgeFade * blink * (1 + flare), 0, 1),
    flare,
  };
};

export const drawSatellites = ({ ctx, system, viewport }) => {
  if (system.active.length === 0) {
    return;
  }

  ctx.save();

  for (const satellite of system.active) {
    if (
      satellite.x < -10 ||
      satellite.x > viewport.width + 10 ||
      satellite.y < -10 ||
      satellite.y > viewport.height + 10
    ) {
      continue;
    }

    const { alpha, flare } = getSatelliteAlpha(satellite);

    if (alpha <= 0.02) {
      continue;
    }

    // Flare halo only while it is actually flaring — rare, so the gradient cost is fine.
    if (flare > 0.4) {
      const haloRadius = satellite.size * (4 + flare * 3);
      const halo = ctx.createRadialGradient(
        satellite.x,
        satellite.y,
        0,
        satellite.x,
        satellite.y,
        haloRadius
      );
      halo.addColorStop(0, `rgba(255, 250, 235, ${(alpha * 0.5).toFixed(3)})`);
      halo.addColorStop(1, "rgba(255, 250, 235, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(
        satellite.x - haloRadius,
        satellite.y - haloRadius,
        haloRadius * 2,
        haloRadius * 2
      );
    }

    const pixel = Math.max(1, satellite.size);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgb(235, 240, 248)";
    ctx.fillRect(satellite.x - pixel * 0.5, satellite.y - pixel * 0.5, pixel, pixel);
  }

  ctx.restore();
};
