import { DEG } from "./config.js";
import { warpSkyProjection } from "./atmosphere.js";
import { cross, dot, lerp, normalize, rotateAroundAxis, smoothstep } from "./math.js";

const WORLD_UP = { x: 0, y: 1, z: 0 };
const WORLD_FORWARD = { x: 0, y: 0, z: 1 };

const createInvisibleProjection = () => ({
  visible: false,
  x: 0,
  y: 0,
  scale: 1,
  fade: 0,
});

const hideProjection = (target) => {
  target.visible = false;
  target.fade = 0;
  return target;
};

export const createDirectionTarget = () => ({ x: 0, y: 0, z: 0 });

export const createProjectionTarget = () => createInvisibleProjection();

export const buildCamera = ({ azimuth, altitude, roll }) => {
  const forward = normalize({
    x: Math.cos(altitude) * Math.sin(azimuth),
    y: Math.sin(altitude),
    z: Math.cos(altitude) * Math.cos(azimuth),
  });

  const referenceUp =
    Math.abs(dot(forward, WORLD_UP)) > 0.999 ? WORLD_FORWARD : WORLD_UP;

  let right = normalize(cross(referenceUp, forward));
  let up = normalize(cross(forward, right));

  if (roll !== 0) {
    right = normalize(rotateAroundAxis(right, forward, roll));
    up = normalize(cross(forward, right));
  }

  return { forward, right, up };
};

export const createDerivedScene = (config) => ({
  latSin: Math.sin(config.observerLatitude * DEG),
  latCos: Math.cos(config.observerLatitude * DEG),
  trailAngle: config.rotationSpeed * config.trailExposureSeconds * config.trailTimeWarp,
  camera: buildCamera({
    azimuth: config.lookAzimuth * DEG,
    altitude: config.lookAltitude * DEG,
    roll: config.lookRoll * DEG,
  }),
});

export const createViewport = (width, height, fieldOfView, fisheyeEnabled = false) => {
  const fovHalfRad = fieldOfView * DEG * 0.5;
  const R = Math.min(width, height) * 0.5;
  // For fisheye, anchor the FOV to the screen diagonal so stars fill all four
  // corners instead of being cropped to an inscribed circle.
  const diagonalHalf = Math.hypot(width * 0.5, height * 0.5);
  return {
    width,
    height,
    cx: width * 0.5,
    cy: height * 0.5,
    focal: fisheyeEnabled ? diagonalHalf / fovHalfRad : R / Math.tan(fovHalfRad),
    fovHalfRad,
    cosHalfFov: Math.cos(fovHalfRad),
    fisheyeEnabled,
  };
};

export const equatorialToHorizontal = ({
  star,
  hourAngle,
  derived,
  target = createDirectionTarget(),
}) => {
  const sinHour = Math.sin(hourAngle);
  const cosHour = Math.cos(hourAngle);

  target.x = -star.cosDec * sinHour;
  target.y = star.sinDec * derived.latSin + star.cosDec * derived.latCos * cosHour;
  target.z = star.sinDec * derived.latCos - star.cosDec * derived.latSin * cosHour;

  return target;
};

export const projectDirection = ({
  direction,
  derived,
  viewport,
  config,
  target = createProjectionTarget(),
}) => {
  if (direction.y < config.horizonFadeStart) {
    return hideProjection(target);
  }

  const viewX = dot(direction, derived.camera.right);
  const viewY = dot(direction, derived.camera.up);
  const viewZ = dot(direction, derived.camera.forward);

  if (viewport.fisheyeEnabled) {
    // Equidistant fisheye: r = focal * θ, where θ is angle from forward axis
    // Stars beyond FOV/2 are outside the circular view
    if (viewZ < viewport.cosHalfFov - 0.002) {
      return hideProjection(target);
    }

    const cosTheta = Math.min(1, viewZ);
    const theta = Math.acos(cosTheta);
    const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
    const r = theta * viewport.focal;

    const sx = sinTheta > 0.0001
      ? viewport.cx + (viewX / sinTheta) * r
      : viewport.cx;
    const sy = sinTheta > 0.0001
      ? viewport.cy - (viewY / sinTheta) * r
      : viewport.cy;

    // Rectangular screen bounds (with a small margin)
    if (sx < -10 || sx > viewport.width + 10 || sy < -10 || sy > viewport.height + 10) {
      return hideProjection(target);
    }

    // Fade toward the screen edges (Chebyshev distance from center, normalized)
    const edgeX = Math.abs(sx - viewport.cx) / (viewport.width * 0.5);
    const edgeY = Math.abs(sy - viewport.cy) / (viewport.height * 0.5);
    const edgeDist = Math.max(edgeX, edgeY);

    const horizonFade = smoothstep(config.horizonFadeStart, config.horizonFadeEnd, direction.y);
    const edgeFade = 1 - smoothstep(0.92, 1.04, edgeDist);
    const scale = lerp(0.68, 1.22, smoothstep(0, 1, viewZ));
    const fade = horizonFade * edgeFade;

    if (fade <= 0.01) {
      return hideProjection(target);
    }

    target.visible = true;
    target.x = sx;
    target.y = sy;
    target.scale = scale;
    target.fade = fade;
    return target;
  }

  // Perspective projection (original path)
  if (viewZ <= config.edgeFadeStart) {
    return hideProjection(target);
  }

  const x = viewport.cx + (viewX / viewZ) * viewport.focal;
  const y = viewport.cy - (viewY / viewZ) * viewport.focal;
  const ndcX = x / viewport.width;
  const ndcY = y / viewport.height;
  const inFrame = ndcX >= -0.1 && ndcX <= 1.1 && ndcY >= -0.1 && ndcY <= 1.1;

  if (!inFrame) {
    return hideProjection(target);
  }

  const horizonFade = smoothstep(config.horizonFadeStart, config.horizonFadeEnd, direction.y);
  const radialEdge = Math.hypot(viewX, viewY) / Math.max(viewZ, 0.001);
  const edgeFade = 1 - smoothstep(config.edgeFadeEnd, 1.18, radialEdge);
  const scale = lerp(0.68, 1.22, smoothstep(config.edgeFadeStart, 1, viewZ));
  const fade = horizonFade * edgeFade;

  if (fade <= 0.01) {
    return hideProjection(target);
  }

  return warpSkyProjection({
    projectionX: x,
    projectionY: y,
    projectionScale: scale,
    projectionFade: fade,
    direction,
    viewX,
    viewY,
    viewZ,
    viewport,
    config,
    target,
  });
};

export const projectStar = ({
  star,
  rotation,
  offset = 0,
  derived,
  viewport,
  config,
  directionTarget = createDirectionTarget(),
  target = createProjectionTarget(),
}) =>
  projectDirection({
    direction: equatorialToHorizontal({
      star,
      hourAngle: star.hourOffset + rotation + offset,
      derived,
      target: directionTarget,
    }),
    derived,
    viewport,
    config,
    target,
  });
