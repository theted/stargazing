// Camera projection.
//
// Wide skies are drawn with a one-parameter family of azimuthal projections:
//
//   r(θ) = scale · tan(α·θ) / (2α)
//
// where θ is the angle from the view centre. α = 0.5 is stereographic (conformal, the
// planetarium standard), α = 1 is the ordinary rectilinear lens. In between, the horizon
// bends only gently while stars near the edge keep their shape.
//
// View space: x → right, y → up, z → forward. Screen space is in device pixels with
// y pointing up (the GL convention), so shaders and JS share the same formulas.

import { DEG, clamp, mat3, mat3FromRows } from "./math.js";

// `fov` spans the geometric mean of width and height, which keeps the amount of sky
// on screen consistent between landscape monitors and portrait phones.
export const createViewport = (width, height, fovDeg, alpha = 0.5) => {
  const reference = Math.sqrt(width * height);
  const halfFov = (fovDeg * DEG) / 2;
  const scale = (alpha * reference) / Math.tan(alpha * halfFov);
  const cornerRadius = Math.hypot(width, height) / 2;

  return {
    width,
    height,
    cx: width / 2,
    cy: height / 2,
    fov: fovDeg,
    alpha,
    scale,
    // Angle from the centre to the farthest screen corner.
    maxAngle: Math.atan((2 * alpha * cornerRadius) / scale) / alpha,
  };
};

export const projectDirection = (v, viewport) => {
  const sinTheta = Math.hypot(v[0], v[1]);
  const theta = Math.atan2(sinTheta, v[2]);

  if (theta * viewport.alpha >= Math.PI / 2 - 1e-3) {
    return null;
  }

  if (sinTheta < 1e-9) {
    return [viewport.cx, viewport.cy];
  }

  const radius = (viewport.scale * Math.tan(viewport.alpha * theta)) / (2 * viewport.alpha);
  return [viewport.cx + (v[0] / sinTheta) * radius, viewport.cy + (v[1] / sinTheta) * radius];
};

export const unprojectPoint = (x, y, viewport) => {
  const dx = x - viewport.cx;
  const dy = y - viewport.cy;
  const radius = Math.hypot(dx, dy);

  if (radius < 1e-9) {
    return [0, 0, 1];
  }

  const theta = Math.atan((2 * viewport.alpha * radius) / viewport.scale) / viewport.alpha;
  const sinTheta = Math.sin(theta);
  return [(dx / radius) * sinTheta, (dy / radius) * sinTheta, Math.cos(theta)];
};

// Camera altitude (degrees) that puts the horizon `fraction` of the way down the screen
// (0 = top, 1 = bottom) in the middle of the frame, the way a photographer composes:
// a portrait phone needs a steeper tilt than a wide monitor for the same picture.
export const altitudeForHorizon = (width, height, fovDeg, alpha, fraction) => {
  const viewport = createViewport(width, height, fovDeg, alpha);
  const offset = (fraction - 0.5) * height;
  return (Math.atan((2 * alpha * offset) / viewport.scale) / alpha) / DEG;
};

// Rotation from the horizontal frame (east, north, up) into view space for a camera
// looking toward `azimuth` (from north through east) at `altitude`, with optional roll.
// The right vector comes straight from the azimuth, so looking at the zenith is stable.
export const horizontalToViewMatrix = (azimuthDeg, altitudeDeg, rollDeg = 0, out = mat3()) => {
  const az = azimuthDeg * DEG;
  const alt = clamp(altitudeDeg, -90, 90) * DEG;
  const roll = rollDeg * DEG;

  const forward = [Math.sin(az) * Math.cos(alt), Math.cos(az) * Math.cos(alt), Math.sin(alt)];
  let right = [Math.cos(az), -Math.sin(az), 0];
  let up = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];

  if (roll !== 0) {
    const cosine = Math.cos(roll);
    const sine = Math.sin(roll);
    const rolledRight = [
      right[0] * cosine + up[0] * sine,
      right[1] * cosine + up[1] * sine,
      right[2] * cosine + up[2] * sine,
    ];
    up = [
      up[0] * cosine - right[0] * sine,
      up[1] * cosine - right[1] * sine,
      up[2] * cosine - right[2] * sine,
    ];
    right = rolledRight;
  }

  return mat3FromRows(right, up, forward, out);
};
