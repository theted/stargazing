// Camera state and motion: direct drag with inertia, smoothed zoom, and gentle glides
// between framings. Pure functions over a plain state object; input wiring lives in
// createSky.

import { clamp, damp } from "./math.js";

export const CAMERA_LIMITS = {
  minAltitude: -30,
  maxAltitude: 90,
  minFov: 12,
  maxFov: 150,
};

const INERTIA_RATE = 3.2;
const ZOOM_RATE = 9;
const GLIDE_RATE = 2.2;
const MAX_SPEED = 240;

export const createCamera = ({ azimuth = 0, altitude = 30, fov = 100 } = {}) => ({
  azimuth,
  altitude: clamp(altitude, CAMERA_LIMITS.minAltitude, CAMERA_LIMITS.maxAltitude),
  fov: clamp(fov, CAMERA_LIMITS.minFov, CAMERA_LIMITS.maxFov),
  targetFov: clamp(fov, CAMERA_LIMITS.minFov, CAMERA_LIMITS.maxFov),
  velocityAzimuth: 0,
  velocityAltitude: 0,
  dragging: false,
  glide: null,
});

// Moves the view so the sky follows the pointer. Deltas are in CSS pixels;
// `degreesPerPixel` comes from the current field of view.
export const dragCamera = (camera, dx, dy, degreesPerPixel, dt) => {
  const deltaAzimuth = -dx * degreesPerPixel;
  const deltaAltitude = dy * degreesPerPixel;
  camera.dragging = true;
  camera.glide = null;
  camera.azimuth += deltaAzimuth;
  camera.altitude = clamp(camera.altitude + deltaAltitude, CAMERA_LIMITS.minAltitude, CAMERA_LIMITS.maxAltitude);

  if (dt > 0) {
    const blend = 1 - Math.exp(-dt * 18);
    camera.velocityAzimuth += (clamp(deltaAzimuth / dt, -MAX_SPEED, MAX_SPEED) - camera.velocityAzimuth) * blend;
    camera.velocityAltitude += (clamp(deltaAltitude / dt, -MAX_SPEED, MAX_SPEED) - camera.velocityAltitude) * blend;
  }
};

export const releaseCamera = (camera, idleSeconds = 0) => {
  camera.dragging = false;

  // A pause before letting go means the user stopped: no fling.
  if (idleSeconds > 0.08) {
    camera.velocityAzimuth = 0;
    camera.velocityAltitude = 0;
  }
};

export const zoomCamera = (camera, factor) => {
  camera.targetFov = clamp(camera.targetFov * factor, CAMERA_LIMITS.minFov, CAMERA_LIMITS.maxFov);
};

export const glideCamera = (camera, view) => {
  const azimuth = camera.azimuth + ((((view.azimuth - camera.azimuth) % 360) + 540) % 360) - 180;
  camera.glide = { azimuth, altitude: view.altitude };
  camera.targetFov = clamp(view.fov ?? camera.targetFov, CAMERA_LIMITS.minFov, CAMERA_LIMITS.maxFov);
  camera.velocityAzimuth = 0;
  camera.velocityAltitude = 0;
};

export const setCameraView = (camera, view) => {
  camera.azimuth = view.azimuth;
  camera.altitude = clamp(view.altitude, CAMERA_LIMITS.minAltitude, CAMERA_LIMITS.maxAltitude);
  camera.fov = clamp(view.fov ?? camera.fov, CAMERA_LIMITS.minFov, CAMERA_LIMITS.maxFov);
  camera.targetFov = camera.fov;
  camera.velocityAzimuth = 0;
  camera.velocityAltitude = 0;
  camera.glide = null;
};

export const updateCamera = (camera, dt) => {
  if (camera.glide) {
    camera.azimuth = damp(camera.azimuth, camera.glide.azimuth, GLIDE_RATE, dt);
    camera.altitude = damp(camera.altitude, camera.glide.altitude, GLIDE_RATE, dt);

    if (Math.abs(camera.azimuth - camera.glide.azimuth) + Math.abs(camera.altitude - camera.glide.altitude) < 0.01) {
      camera.glide = null;
    }
  } else if (!camera.dragging) {
    camera.azimuth += camera.velocityAzimuth * dt;
    camera.altitude = clamp(
      camera.altitude + camera.velocityAltitude * dt,
      CAMERA_LIMITS.minAltitude,
      CAMERA_LIMITS.maxAltitude
    );
    const decay = Math.exp(-INERTIA_RATE * dt);
    camera.velocityAzimuth *= decay;
    camera.velocityAltitude *= decay;
  }

  camera.fov = damp(camera.fov, camera.targetFov, ZOOM_RATE, dt);
  camera.azimuth = ((camera.azimuth % 360) + 360) % 360;

  if (camera.glide) {
    camera.glide.azimuth = camera.azimuth + ((((camera.glide.azimuth - camera.azimuth) % 360) + 540) % 360) - 180;
  }

  return camera;
};
