import { DEG, TAU } from "./config.js";
import { equatorialToHorizontal, projectDirection, createDirectionTarget, createProjectionTarget } from "./projection.js";

// Real-ish celestial positions (RA in radians, Dec in degrees)
// RA = RA_hours / 24 * TAU
const NEBULA_DATA = [
  {
    // Orion Nebula / Horsehead region — vivid magenta-purple emission
    ra: (5.58 / 24) * TAU, dec: -5.4,
    stops: ['rgba(220, 70, 255, 0.22)', 'rgba(160, 40, 220, 0.14)', 'rgba(100, 20, 160, 0.06)', 'rgba(0,0,0,0)'],
    angularRadius: 20 * DEG,
  },
  {
    // Pleiades — blue reflection nebula haze
    ra: (3.78 / 24) * TAU, dec: 24.1,
    stops: ['rgba(90, 150, 255, 0.18)', 'rgba(55, 105, 230, 0.10)', 'rgba(25, 55, 150, 0.04)', 'rgba(0,0,0,0)'],
    angularRadius: 17 * DEG,
  },
  {
    // Sagittarius / Galactic Center — rich golden star clouds
    ra: (17.76 / 24) * TAU, dec: -29.0,
    stops: ['rgba(255, 185, 75, 0.20)', 'rgba(230, 110, 45, 0.14)', 'rgba(165, 55, 15, 0.05)', 'rgba(0,0,0,0)'],
    angularRadius: 28 * DEG,
  },
  {
    // Carina Nebula — vivid pink-red massive emission region
    ra: (10.73 / 24) * TAU, dec: -59.5,
    stops: ['rgba(255, 75, 155, 0.20)', 'rgba(210, 45, 95, 0.13)', 'rgba(130, 18, 55, 0.05)', 'rgba(0,0,0,0)'],
    angularRadius: 22 * DEG,
  },
  {
    // Lagoon / Trifid region — teal-green emission
    ra: (18.07 / 24) * TAU, dec: -24.4,
    stops: ['rgba(50, 220, 195, 0.17)', 'rgba(28, 160, 138, 0.10)', 'rgba(10, 80, 68, 0.04)', 'rgba(0,0,0,0)'],
    angularRadius: 16 * DEG,
  },
  {
    // Andromeda direction — diffuse cool blue galaxy glow
    ra: (0.71 / 24) * TAU, dec: 41.3,
    stops: ['rgba(75, 115, 255, 0.14)', 'rgba(48, 78, 210, 0.08)', 'rgba(18, 38, 130, 0.03)', 'rgba(0,0,0,0)'],
    angularRadius: 24 * DEG,
  },
  {
    // Cygnus / North America nebula — deep crimson
    ra: (20.97 / 24) * TAU, dec: 44.0,
    stops: ['rgba(255, 88, 72, 0.17)', 'rgba(210, 55, 44, 0.10)', 'rgba(130, 25, 18, 0.04)', 'rgba(0,0,0,0)'],
    angularRadius: 19 * DEG,
  },
  {
    // Large Magellanic Cloud direction — warm golden satellite galaxy
    ra: (5.38 / 24) * TAU, dec: -69.7,
    stops: ['rgba(255, 210, 120, 0.18)', 'rgba(220, 155, 70, 0.11)', 'rgba(150, 90, 30, 0.04)', 'rgba(0,0,0,0)'],
    angularRadius: 20 * DEG,
  },
  {
    // Perseus / Double Cluster — electric blue cluster glow
    ra: (2.32 / 24) * TAU, dec: 57.1,
    stops: ['rgba(120, 170, 255, 0.14)', 'rgba(75, 120, 220, 0.08)', 'rgba(0,0,0,0)'],
    angularRadius: 12 * DEG,
  },
  {
    // Scorpius heart — warm amber near Antares
    ra: (16.49 / 24) * TAU, dec: -26.4,
    stops: ['rgba(255, 160, 60, 0.16)', 'rgba(220, 100, 30, 0.09)', 'rgba(0,0,0,0)'],
    angularRadius: 18 * DEG,
  },
];

export const createNebulae = () =>
  NEBULA_DATA.map((n) => ({
    hourOffset: n.ra,
    sinDec: Math.sin(n.dec * DEG),
    cosDec: Math.cos(n.dec * DEG),
    stops: n.stops,
    angularRadius: n.angularRadius,
  }));

const dirScratch = createDirectionTarget();
const projScratch = createProjectionTarget();

export const drawNebulae = ({ ctx, nebulae, rotation, derived, viewport, config }) => {
  if (config.nebulaEnabled === false) return;

  const baseAlpha = Math.min(1, config.atmosphereGlow ?? 0.72);

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  for (const nebula of nebulae) {
    const direction = equatorialToHorizontal({
      star: nebula,
      hourAngle: nebula.hourOffset + rotation,
      derived,
      target: dirScratch,
    });

    if (direction.y < -0.2) continue;

    const proj = projectDirection({
      direction,
      derived,
      viewport,
      config,
      target: projScratch,
    });

    if (!proj.visible || proj.fade < 0.02) continue;

    // Screen radius: for fisheye, focal × angularRadius is exact.
    // For perspective, this approximation is fine for large soft blobs.
    const screenRadius = nebula.angularRadius * viewport.focal * proj.scale * 1.6;
    if (screenRadius < 8) continue;

    const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, screenRadius);
    const stops = nebula.stops;
    for (let i = 0; i < stops.length; i++) {
      gradient.addColorStop(i / (stops.length - 1), stops[i]);
    }

    ctx.globalAlpha = proj.fade * baseAlpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, screenRadius, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
};
