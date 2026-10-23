// Central tuning surface.
//
// SKY_DEFAULTS are the user-facing choices (also accepted by createSky and the embed
// build). RENDER_TUNING holds the look: exposure, star shape, atmosphere and motion.

export const SKY_DEFAULTS = {
  place: "atacama",
  // How much faster than reality the sky turns. 36× is one sidereal hour per 100 s.
  timeScale: 36,
  // Long-exposure trail length in minutes of sky time; 0 shows pinpoint stars.
  trails: 0,
  quality: "auto",
  interactive: true,
  intro: true,
  layers: {
    milkyWay: true,
    landscape: true,
    atmosphere: true,
    aurora: true,
    meteors: true,
    satellites: true,
    twinkle: true,
  },
};

export const RENDER_TUNING = {
  // Global exposure applied before the exponential tone curve.
  exposure: 1,
  // Magnitude whose PSF peak reaches 1.0 (≈ 63% grey) before tone mapping.
  referenceMagnitude: 2.7,
  // 0.5 = stereographic, 1 = rectilinear (see projection.js).
  projectionAlpha: 0.72,
  // Point-spread function, in CSS pixels: a crisp Gaussian core, a skirt and a soft glow
  // that each carry a share of a bright star's light, like a diffusion filter on a lens.
  // Below a component's knee (peak intensity) it fades away, so faint stars stay sharp.
  psfSigma: 0.62,
  skirtSigma: 1.7,
  skirtRatio: 0.1,
  skirtKnee: 0.7,
  glowSigma: 6.5,
  glowRatio: 0.04,
  glowKnee: 3,
  // Magnitudes added to faint field and dust stars so the Milky Way resolves into stars.
  fieldBoost: 1.0,
  dustBoost: 2.1,
  // Extra stellar exposure when zoomed in, so a narrow field reveals fainter stars.
  zoomGain: 0.55,
  referenceFov: 104,
  // How strongly hue is exaggerated relative to true blackbody colour.
  starSaturation: 1.45,
  fieldStarSaturation: 0.75,
  // Share of faint field stars scattered along the baked Milky Way's light.
  fieldBandShare: 0.62,
  twinkle: 1,
  // Relative extinction per channel (blue scatters most), multiplied by the site's k.
  extinctionColor: [0.72, 1, 1.5],
  milkyWayGain: 0.3,
  trailGain: 0.55,
  trailFade: 0.7,
  meteorsPerMinute: 2.2,
  satellitesPerMinute: 0.8,
  vignette: 0.32,
  introSeconds: 6,
};

// Per-tier budgets. "auto" picks one from the device in createSky.
export const QUALITY_TIERS = {
  low: { dprCap: 1.25, fieldStars: 40000, dustStars: 60000, bakeSize: 512, trailStars: 2500, trailSegments: 24 },
  medium: { dprCap: 1.6, fieldStars: 85000, dustStars: 180000, bakeSize: 1024, trailStars: 5000, trailSegments: 36 },
  high: { dprCap: 2, fieldStars: 140000, dustStars: 360000, bakeSize: 1024, trailStars: 9096, trailSegments: 48 },
};
