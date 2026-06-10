export const SKY_CONFIG = {
  // Star field
  density: 0.0009,
  minStars: 2600,
  maxStars: 9000,
  dprCap: 1.3,

  // Camera
  cameraPreset: "equatorial-night",
  observerLatitude: 11,
  lookAzimuth: 28,
  lookAltitude: 61,
  lookRoll: -7,
  fieldOfView: 118,
  fisheyeEnabled: true,
  cameraInertia: 0.97,

  // Idle camera drift — slow noise-driven look-around for a living 3D feel
  cameraDriftEnabled: true,
  cameraDriftAmount: 2.4,
  cameraDriftSpeed: 1,

  // Depth parallax — differential rotation rate per star depth layer
  depthParallaxEnabled: true,
  depthParallax: 0.38,

  // Motion
  motionScale: 5.2,
  timelapseEnabled: true,
  timelapseIntensity: 2,
  rotationSpeed: 0.0028,
  trailExposureSeconds: 42,
  trailTimeWarp: 14,
  backgroundParallax: 0.05,

  // Star appearance
  baseStarSize: 0.8,
  maxStarSize: 4.2,
  starSizeVariation: 2.5,
  sizeVariationEnabled: true,
  glowScale: 5,
  diffractionSpikesEnabled: true,
  twinkleEnabled: true,
  twinkleAmount: 0.36,
  twinkleSpeedMin: 0.9,
  twinkleSpeedMax: 3.6,

  // Visibility falloff
  horizonFadeStart: -0.08,
  horizonFadeEnd: 0.22,
  edgeFadeStart: 0.06,
  edgeFadeEnd: 0.94,

  // Distribution
  driftSeed: 1.7,
  bandWeight: 0.88,
  bandFrequency: 2.15,
  bandAmplitude: 0.5,
  bandSpread: 0.28,
  bandPhase: 0.85,
  starSpread: 1,
  screenFill: 1.05,

  // Milky way glow band (follows the star band)
  milkyWayEnabled: true,
  milkyWayIntensity: 0.65,

  // Nebulae
  nebulaEnabled: true,

  // Aurora curtains
  auroraEnabled: true,
  auroraIntensity: 0.5,
  auroraSpeed: 1,
  auroraHue: 135,
  auroraBands: 3,
  auroraHeight: 0.42,

  // Atmosphere + lensing
  atmosphereEnabled: true,
  atmosphereStrength: 0.95,
  atmosphereGlow: 0.72,
  gravityEnabled: false,
  gravityStrength: 0.28,
  screenCoverageBoost: 0.22,
  edgeMagnification: 0.16,
  horizonMagnification: 0.2,

  // Persistence trails
  trailsEnabled: false,
  trailLength: 8,
  trailIntensity: 0.85,

  // Guided tour
  guidedTourEnabled: false,

  // Meteors
  meteorsEnabled: true,
  meteorRate: 1.6,
  meteorDurationMin: 0.68,
  meteorDurationMax: 1.18,
  meteorTrailLength: 0.19,
  meteorGlow: 0.95,
  meteorWidth: 1.85,
  maxActiveMeteors: 2,

  // Satellites
  satellitesEnabled: true,
  satelliteRate: 1.4,
  maxActiveSatellites: 3,

  // Performance
  adaptiveQualityEnabled: true,
  targetFps: 50,
  maxFps: 0,
};

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
