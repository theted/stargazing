import { DEG } from "./config.js";
import { cross, dot, lerp, normalize, rotateAroundAxis, smoothstep } from "./math.js";

const WORLD_UP = { x: 0, y: 1, z: 0 };
const WORLD_FORWARD = { x: 0, y: 0, z: 1 };

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

export const createViewport = (width, height, fieldOfView) => ({
  width,
  height,
  cx: width * 0.5,
  cy: height * 0.5,
  focal: (Math.min(width, height) * 0.5) / Math.tan((fieldOfView * DEG) * 0.5),
});

export const equatorialToHorizontal = ({ star, hourAngle, derived }) => {
  const sinHour = Math.sin(hourAngle);
  const cosHour = Math.cos(hourAngle);

  return {
    x: -star.cosDec * sinHour,
    y: star.sinDec * derived.latSin + star.cosDec * derived.latCos * cosHour,
    z: star.sinDec * derived.latCos - star.cosDec * derived.latSin * cosHour,
  };
};

export const projectDirection = ({ direction, derived, viewport, config }) => {
  if (direction.y < config.horizonFadeStart) {
    return { visible: false };
  }

  const viewX = dot(direction, derived.camera.right);
  const viewY = dot(direction, derived.camera.up);
  const viewZ = dot(direction, derived.camera.forward);

  if (viewZ <= config.edgeFadeStart) {
    return { visible: false };
  }

  const x = viewport.cx + (viewX / viewZ) * viewport.focal;
  const y = viewport.cy - (viewY / viewZ) * viewport.focal;
  const ndcX = x / viewport.width;
  const ndcY = y / viewport.height;
  const inFrame = ndcX >= -0.1 && ndcX <= 1.1 && ndcY >= -0.1 && ndcY <= 1.1;

  if (!inFrame) {
    return { visible: false };
  }

  const horizonFade = smoothstep(config.horizonFadeStart, config.horizonFadeEnd, direction.y);
  const radialEdge = Math.hypot(viewX, viewY) / Math.max(viewZ, 0.001);
  const edgeFade = 1 - smoothstep(config.edgeFadeEnd, 1.18, radialEdge);
  const scale = lerp(0.68, 1.22, smoothstep(config.edgeFadeStart, 1, viewZ));
  const fade = horizonFade * edgeFade;

  if (fade <= 0.01) {
    return { visible: false };
  }

  return { visible: true, x, y, scale, fade };
};

export const projectStar = ({
  star,
  rotation,
  offset = 0,
  derived,
  viewport,
  config,
}) =>
  projectDirection({
    direction: equatorialToHorizontal({
      star,
      hourAngle: star.hourOffset + rotation + offset,
      derived,
    }),
    derived,
    viewport,
    config,
  });
