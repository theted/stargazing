// Star generation: the real naked-eye sky from the Yale Bright Star Catalogue, plus a
// procedural field of fainter stars that thickens toward the galactic plane.
//
// Both sets share one GPU layout, 8 floats per star:
//   direction.xyz (equatorial unit vector), magnitude, colour.rgb (linear), seed

import { BRIGHT_STARS_BASE64 } from "./data/bright-stars.js";
import { bvToLinearRgb, galacticToVector } from "./astro.js";
import { DEG, TAU, clamp, createRandom, normalize3, randomGaussian } from "./math.js";

export const STAR_STRIDE = 8;

const CATALOG_RECORD_BYTES = 6;
const CATALOG_LIMIT_MAGNITUDE = 6.5;
// Cumulative star counts grow by ~10^0.45 per magnitude between V = 6.5 and V = 10.
const COUNT_SLOPE = 0.45;
const BRIGHT_COUNT_AT_LIMIT = 9100;

const decodeBase64 = (base64) => {
  if (typeof atob === "function") {
    return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  }

  return new Uint8Array(Buffer.from(base64, "base64"));
};

export const decodeBrightStars = (base64 = BRIGHT_STARS_BASE64) => {
  const bytes = decodeBase64(base64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = Math.floor(bytes.byteLength / CATALOG_RECORD_BYTES);

  return Array.from({ length: count }, (_, index) => {
    const offset = index * CATALOG_RECORD_BYTES;
    return {
      ra: (view.getUint16(offset, true) / 65536) * TAU,
      dec: (view.getInt16(offset + 2, true) / 32767) * (Math.PI / 2),
      magnitude: view.getUint8(offset + 4) / 25 - 1.6,
      bv: view.getUint8(offset + 5) / 90 - 0.4,
    };
  });
};

// B−V → linear RGB lookup; generating 100k+ stars should not cost 100k colour solves.
const BV_MIN = -0.4;
const BV_MAX = 2.4;
const LUT_SIZE = 256;

const createColorLookup = (saturation) => {
  const table = Array.from({ length: LUT_SIZE }, (_, index) =>
    bvToLinearRgb(BV_MIN + ((BV_MAX - BV_MIN) * index) / (LUT_SIZE - 1), saturation)
  );
  return (bv) => table[Math.round(((clamp(bv, BV_MIN, BV_MAX) - BV_MIN) / (BV_MAX - BV_MIN)) * (LUT_SIZE - 1))];
};

// Direction through texel (s, t) of a cube face, matching the GL cube-map layout and the
// bake shader's faceDirection().
export const cubeFaceDirection = (face, s, t) => {
  const sc = s * 2 - 1;
  const tc = t * 2 - 1;
  switch (face) {
    case 0:
      return [1, -tc, -sc];
    case 1:
      return [-1, -tc, sc];
    case 2:
      return [sc, 1, tc];
    case 3:
      return [sc, -1, -tc];
    case 4:
      return [sc, -tc, 1];
    default:
      return [-sc, -tc, -1];
  }
};

// Draws directions with probability proportional to `weights`: six cube faces of
// size × size texels, rows from t = 0, each weighted by its solid angle. Samples are
// spread with a tent filter so the density blends smoothly between texels instead of
// showing the texel grid.
export const createCubeDensitySampler = (weights, size) => {
  const texelsPerFace = size * size;
  const cdf = new Float64Array(weights.length);
  let total = 0;

  for (let index = 0; index < weights.length; index += 1) {
    const texel = index % texelsPerFace;
    const u = (((texel % size) + 0.5) / size) * 2 - 1;
    const v = ((Math.floor(texel / size) + 0.5) / size) * 2 - 1;
    total += weights[index] / Math.pow(1 + u * u + v * v, 1.5);
    cdf[index] = total;
  }

  // Reflect at the face edges rather than clamping, so samples never pile up on a seam.
  const reflect = (value) => (value < 0 ? -value : value > 1 ? 2 - value : value);

  return (random) => {
    const target = random() * total;
    let low = 0;
    let high = cdf.length - 1;

    while (low < high) {
      const middle = (low + high) >> 1;
      if (cdf[middle] < target) low = middle + 1;
      else high = middle;
    }

    const face = Math.floor(low / texelsPerFace);
    const texel = low % texelsPerFace;
    const s = reflect(((texel % size) + 0.5 + random() - random()) / size);
    const t = reflect((Math.floor(texel / size) + 0.5 + random() - random()) / size);
    return normalize3(cubeFaceDirection(face, s, t));
  };
};

const writeStar = (target, index, direction, magnitude, color, seed) => {
  const offset = index * STAR_STRIDE;
  target[offset] = direction[0];
  target[offset + 1] = direction[1];
  target[offset + 2] = direction[2];
  target[offset + 3] = magnitude;
  target[offset + 4] = color[0];
  target[offset + 5] = color[1];
  target[offset + 6] = color[2];
  target[offset + 7] = seed;
};

export const createBrightStarData = ({ colorSaturation = 1.4, seed = 7 } = {}) => {
  const random = createRandom(seed);
  const stars = decodeBrightStars();
  const data = new Float32Array(stars.length * STAR_STRIDE);

  stars.forEach((star, index) => {
    const cosDec = Math.cos(star.dec);
    writeStar(
      data,
      index,
      [cosDec * Math.cos(star.ra), cosDec * Math.sin(star.ra), Math.sin(star.dec)],
      star.magnitude,
      bvToLinearRgb(star.bv, colorSaturation),
      random()
    );
  });

  return { data, count: stars.length };
};

// Faintest magnitude reached when `count` field stars follow the real sky's counts.
export const fieldLimitMagnitude = (count) =>
  CATALOG_LIMIT_MAGNITUDE + Math.log10(1 + count / BRIGHT_COUNT_AT_LIMIT) / COUNT_SLOPE;

const sampleFieldMagnitude = (random, limit) => {
  const span = Math.pow(10, COUNT_SLOPE * (limit - CATALOG_LIMIT_MAGNITUDE)) - 1;
  return CATALOG_LIMIT_MAGNITUDE + Math.log10(1 + random() * span) / COUNT_SLOPE;
};

// B−V mixture skewed toward the yellow-orange dwarfs and giants that dominate faint
// counts; hot blue stars mostly live in the thin disk.
const sampleFieldColorIndex = (random, inDisk) => {
  const roll = random();
  const blueShare = inDisk ? 0.16 : 0.05;

  if (roll < blueShare) return randomGaussian(random) * 0.1 - 0.08;
  if (roll < blueShare + 0.2) return randomGaussian(random) * 0.14 + 0.36;
  if (roll < 0.86) return randomGaussian(random) * 0.22 + 0.95;
  return randomGaussian(random) * 0.16 + 1.45;
};

const sampleLaplace = (random, scale) =>
  (random() < 0.5 ? -1 : 1) * -Math.log(Math.max(random(), 1e-9)) * scale;

// Galactic position for a star of the given magnitude: brighter field stars are nearby
// and spread over the whole sky, fainter ones crowd the disk and the central bulge.
const sampleGalacticPosition = (random, magnitude) => {
  const faintness = clamp((magnitude - CATALOG_LIMIT_MAGNITUDE) / 3, 0, 1);
  const roll = random();
  const isotropicShare = 0.42 - 0.22 * faintness;
  const bulgeShare = 0.04 + 0.1 * faintness;

  if (roll < isotropicShare) {
    return { l: random() * TAU, b: Math.asin(random() * 2 - 1), inDisk: false };
  }

  if (roll < isotropicShare + bulgeShare) {
    return {
      l: randomGaussian(random) * 13 * DEG,
      b: clamp(randomGaussian(random) * 8 - 1.5, -89, 89) * DEG,
      inDisk: true,
    };
  }

  const towardCentre = random() < 0.45;
  const l = towardCentre ? randomGaussian(random) * 55 * DEG : random() * TAU;
  const scaleHeight = 16 - 9 * faintness;
  return { l, b: clamp(sampleLaplace(random, scaleHeight), -89, 89) * DEG, inDisk: true };
};

// Generation can run all at once or in slices: the generators yield every
// YIELD_EVERY stars so the runtime can spread the work across frames.
const YIELD_EVERY = 4096;

const runToCompletion = (generator) => {
  let step = generator.next();
  while (!step.done) step = generator.next();
  return step.value;
};

// `sampleBand`, when given, draws directions that trace the baked Milky Way, so the
// band reads as a river of individual stars; `bandShare` of the field comes from it.
export function* generateFieldStars({
  count = 100000,
  clusterCount = 70,
  colorSaturation = 1.25,
  seed = 1977,
  sampleBand = null,
  bandShare = 0.6,
} = {}) {
  const random = createRandom(seed);
  const limit = fieldLimitMagnitude(count);
  const data = new Float32Array(count * STAR_STRIDE);
  const colorOf = createColorLookup(colorSaturation);
  let index = 0;

  // Open clusters: tight knots of mostly faint stars hugging the galactic plane.
  for (let cluster = 0; cluster < clusterCount && index < count; cluster += 1) {
    const centerL = random() < 0.5 ? randomGaussian(random) * 70 * DEG : random() * TAU;
    const centerB = sampleLaplace(random, 2.5) * DEG;
    const radius = (0.08 + Math.pow(random(), 2) * 0.45) * DEG;
    const members = Math.min(count - index, Math.round(12 + Math.pow(random(), 2) * 110));
    const brightest = 6.6 + random() * 2;

    for (let member = 0; member < members; member += 1) {
      const magnitude = Math.min(limit, brightest + Math.pow(random(), 0.6) * 3);
      const l = centerL + (randomGaussian(random) * radius) / Math.max(0.2, Math.cos(centerB));
      const b = centerB + randomGaussian(random) * radius;
      writeStar(data, index, galacticToVector(l, b), magnitude, colorOf(sampleFieldColorIndex(random, true)), random());
      index += 1;
    }
  }

  while (index < count) {
    const magnitude = sampleFieldMagnitude(random, limit);

    if (sampleBand && random() < bandShare) {
      writeStar(data, index, sampleBand(random), magnitude, colorOf(sampleFieldColorIndex(random, true)), random());
    } else {
      const { l, b, inDisk } = sampleGalacticPosition(random, magnitude);
      writeStar(data, index, galacticToVector(l, b), magnitude, colorOf(sampleFieldColorIndex(random, inDisk)), random());
    }

    index += 1;
    if (index % YIELD_EVERY === 0) yield index / count;
  }

  return { data, count, limit };
}

export const createFieldStarData = (options) => runToCompletion(generateFieldStars(options));

// Unresolved-looking "dust" stars: hundreds of thousands of faint points that make the
// Milky Way read as starlight. Packed into 8 bytes each to stay light on memory:
//   int16 × 3  direction (normalised)
//   uint8      magnitude ((V − 7) × 40)
//   uint8      B−V ((B−V + 0.4) × 90)
export const DUST_STAR_BYTES = 8;

export function* generateDustStars({ count = 200000, sampleBand, seed = 4242, brightest = 8.4, faintest = 11.6 } = {}) {
  const random = createRandom(seed);
  const bytes = new Uint8Array(count * DUST_STAR_BYTES);
  const shorts = new Int16Array(bytes.buffer);
  const span = Math.pow(10, COUNT_SLOPE * (faintest - brightest)) - 1;

  for (let index = 0; index < count; index += 1) {
    const direction = sampleBand(random);
    const magnitude = brightest + Math.log10(1 + random() * span) / COUNT_SLOPE;
    const bv = sampleFieldColorIndex(random, true);
    shorts[index * 4] = Math.round(direction[0] * 32767);
    shorts[index * 4 + 1] = Math.round(direction[1] * 32767);
    shorts[index * 4 + 2] = Math.round(direction[2] * 32767);
    bytes[index * 8 + 6] = Math.max(0, Math.min(255, Math.round((magnitude - 7) * 40)));
    bytes[index * 8 + 7] = Math.max(0, Math.min(255, Math.round((bv + 0.4) * 90)));
    if ((index + 1) % YIELD_EVERY === 0) yield (index + 1) / count;
  }

  return { data: bytes, count };
}

export const createDustStarData = (options) => runToCompletion(generateDustStars(options));

// Everything that follows the baked galaxy's light, from its luminance map (six cube
// faces, see createCubeDensitySampler). Yields while it works.
export function* generateBandStars({ luminance, size, fieldCount, dustCount, fieldSaturation, fieldBandShare }) {
  const fieldSampler = createCubeDensitySampler(luminance.map((value) => Math.pow(value, 1.25)), size);
  yield 0;
  const dustSampler = createCubeDensitySampler(luminance.map((value) => value * value), size);
  yield 0;
  const field = yield* generateFieldStars({
    count: fieldCount,
    colorSaturation: fieldSaturation,
    sampleBand: fieldSampler,
    bandShare: fieldBandShare,
  });
  const dust = yield* generateDustStars({ count: dustCount, sampleBand: dustSampler });
  return { field, dust };
}
