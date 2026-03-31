import { lerp, valueNoise1D } from "./math.js";

export const sampleSkyDriftVelocity = ({ elapsed, config }) => {
  // Keep the sky moving forward with slight, irregular speed changes instead of a visible loop.
  const base = valueNoise1D(elapsed * 0.018 + config.driftSeed * 3.1, config.driftSeed);
  const detail = valueNoise1D(elapsed * 0.051 + config.driftSeed * 9.7, config.driftSeed + 17.4);
  const blended = base * 0.76 + detail * 0.24;

  return config.backgroundParallax * lerp(0.006, 0.02, blended);
};

export const sampleAtmospherePulse = ({ elapsed, config }) => {
  const base = valueNoise1D(elapsed * 0.028 + config.driftSeed * 5.3, config.driftSeed + 4.2);
  const detail = valueNoise1D(elapsed * 0.066 + config.driftSeed * 11.1, config.driftSeed + 23.8);

  return lerp(0.72, 1.02, base * 0.8 + detail * 0.2);
};
