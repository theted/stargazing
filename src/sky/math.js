export const lerp = (start, end, amount) => start + (end - start) * amount;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const fract = (value) => value - Math.floor(value);

export const smoothstep = (min, max, value) => {
  const amount = clamp((value - min) / (max - min), 0, 1);
  return amount * amount * (3 - 2 * amount);
};

export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

export const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const normalize = (vector) => {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
};

export const rotateAroundAxis = (vector, axis, angle) => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const crossProduct = cross(axis, vector);
  const axisProjection = dot(axis, vector) * (1 - cosine);

  return {
    x: vector.x * cosine + crossProduct.x * sine + axis.x * axisProjection,
    y: vector.y * cosine + crossProduct.y * sine + axis.y * axisProjection,
    z: vector.z * cosine + crossProduct.z * sine + axis.z * axisProjection,
  };
};

export const randomNormal = (random = Math.random, mean = 0, standardDeviation = 1) => {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(Math.PI * 2 * u2);

  return mean + gaussian * standardDeviation;
};

export const hashNoise1D = (value, seed = 0) =>
  fract(Math.sin(value * 127.1 + seed * 311.7) * 43758.5453123);

export const valueNoise1D = (value, seed = 0) => {
  const left = Math.floor(value);
  const amount = smoothstep(0, 1, fract(value));
  const start = hashNoise1D(left, seed);
  const end = hashNoise1D(left + 1, seed);

  return lerp(start, end, amount);
};
