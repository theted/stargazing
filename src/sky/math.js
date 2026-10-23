export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const lerp = (start, end, amount) => start + (end - start) * amount;

export const smoothstep = (edge0, edge1, value) => {
  const amount = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
};

// Frame-rate independent exponential approach toward a target.
export const damp = (current, target, rate, dt) => lerp(current, target, 1 - Math.exp(-rate * dt));

export const wrapAngle = (angle) => angle - TAU * Math.floor((angle + Math.PI) / TAU);

// Deterministic PRNG so generated skies are identical across reloads.
export const createRandom = (seed = 1) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomGaussian = (random) => {
  const u = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * random());
};

// ─── 3-vectors (plain arrays) ────────────────────────────────────────────────

export const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const cross3 = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const normalize3 = (v) => {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
};

// Spherical interpolation between unit vectors.
export const slerp3 = (a, b, t) => {
  const cosine = clamp(dot3(a, b), -1, 1);
  const angle = Math.acos(cosine);

  if (angle < 1e-6) {
    return [...a];
  }

  const sine = Math.sin(angle);
  const wa = Math.sin((1 - t) * angle) / sine;
  const wb = Math.sin(t * angle) / sine;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
};

// ─── 3×3 matrices ────────────────────────────────────────────────────────────
// Stored column-major in a Float32Array(9), the layout uniformMatrix3fv expects.

export const mat3 = () => new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

export const mat3FromRows = (r0, r1, r2, out = mat3()) => {
  out[0] = r0[0];
  out[1] = r1[0];
  out[2] = r2[0];
  out[3] = r0[1];
  out[4] = r1[1];
  out[5] = r2[1];
  out[6] = r0[2];
  out[7] = r1[2];
  out[8] = r2[2];
  return out;
};

export const mat3Row = (m, row) => [m[row], m[row + 3], m[row + 6]];

export const mat3Multiply = (a, b, out = mat3()) => {
  const a00 = a[0], a10 = a[1], a20 = a[2];
  const a01 = a[3], a11 = a[4], a21 = a[5];
  const a02 = a[6], a12 = a[7], a22 = a[8];

  for (let column = 0; column < 3; column += 1) {
    const b0 = b[column * 3];
    const b1 = b[column * 3 + 1];
    const b2 = b[column * 3 + 2];
    out[column * 3] = a00 * b0 + a01 * b1 + a02 * b2;
    out[column * 3 + 1] = a10 * b0 + a11 * b1 + a12 * b2;
    out[column * 3 + 2] = a20 * b0 + a21 * b1 + a22 * b2;
  }

  return out;
};

export const mat3Transpose = (m, out = mat3()) => {
  const m1 = m[1], m2 = m[2], m5 = m[5];
  out[0] = m[0];
  out[4] = m[4];
  out[8] = m[8];
  out[1] = m[3];
  out[3] = m1;
  out[2] = m[6];
  out[6] = m2;
  out[5] = m[7];
  out[7] = m5;
  return out;
};

export const mat3TransformVec3 = (m, v) => [
  m[0] * v[0] + m[3] * v[1] + m[6] * v[2],
  m[1] * v[0] + m[4] * v[1] + m[7] * v[2],
  m[2] * v[0] + m[5] * v[1] + m[8] * v[2],
];
