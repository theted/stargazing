// Packs a place definition (degrees, nested objects) into flat uniform arrays.

import { DEG } from "../math.js";

const MAX_DOMES = 3;
const MAX_CONES = 2;

export const createPlaceUniforms = (place) => {
  const { ridges, cones = [], trees } = place.landscape;
  const { lightDomes = [] } = place.atmosphere;

  const ridge = new Float32Array(12);
  const ridgeColor = new Float32Array(12);
  const ridgeSeed = new Float32Array(3);
  let landscapeTop = -Infinity;

  ridges.slice(0, 3).forEach((layer, index) => {
    ridge.set([layer.base * DEG, layer.amplitude * DEG, layer.frequency, layer.roughness], index * 4);
    ridgeColor.set([...layer.color, layer.mist], index * 4);
    ridgeSeed[index] = layer.seed;
    landscapeTop = Math.max(landscapeTop, layer.base + layer.amplitude * 1.4);
  });

  const cone = new Float32Array(MAX_CONES * 4);
  cones.slice(0, MAX_CONES).forEach((entry, index) => {
    cone.set([entry.azimuth * DEG, entry.height * DEG, entry.width * DEG, entry.layer], index * 4);
    landscapeTop = Math.max(landscapeTop, ridges[entry.layer].base + entry.height);
  });

  const treeUniform = trees
    ? new Float32Array([trees.layer, trees.density / DEG, trees.height * DEG, trees.variation])
    : new Float32Array([-1, 0, 0, 0]);

  if (trees) {
    const layer = ridges[trees.layer];
    landscapeTop = Math.max(landscapeTop, layer.base + layer.amplitude * 1.4 + trees.height);
  }

  const dome = new Float32Array(MAX_DOMES * 4);
  const domeColor = new Float32Array(MAX_DOMES * 3);
  lightDomes.slice(0, MAX_DOMES).forEach((entry, index) => {
    dome.set([entry.azimuth * DEG, entry.width * DEG, entry.strength, 0], index * 4);
    domeColor.set(entry.color, index * 3);
  });

  return {
    treeColor: new Float32Array(place.landscape.treeColor ?? [0.0004, 0.00045, 0.0006]),
    groundLight: new Float32Array(place.landscape.groundLight ?? [0, 0, 0]),
    ridge,
    ridgeColor,
    ridgeSeed,
    cone,
    trees: treeUniform,
    treeWidth: trees?.width ?? 0.3,
    landscapeTop: (landscapeTop + 0.5) * DEG,
    dome,
    domeColor,
    airglow: new Float32Array([place.atmosphere.airglow, place.atmosphere.airglowRed]),
    skyGlow: place.atmosphere.skyGlow,
  };
};
