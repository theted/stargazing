// Astronomy helpers: celestial frames, sidereal time, extinction and star colour.
//
// Frames used throughout:
//   equatorial  x → (RA 0h, Dec 0°)   y → (RA 6h, Dec 0°)   z → north celestial pole
//   galactic    x → galactic centre   y → l = 90°           z → north galactic pole
//   horizontal  x → east              y → north             z → zenith

import { DEG, TAU, clamp, mat3FromRows, mat3TransformVec3 } from "./math.js";

export const SIDEREAL_DAY_SECONDS = 86164.0905;
export const SIDEREAL_RATE = TAU / SIDEREAL_DAY_SECONDS;

export const raDecToVector = (raRad, decRad) => {
  const cosDec = Math.cos(decRad);
  return [cosDec * Math.cos(raRad), cosDec * Math.sin(raRad), Math.sin(decRad)];
};

// IAU galactic frame, J2000 realisation (rows map equatorial → galactic).
export const EQUATORIAL_TO_GALACTIC = mat3FromRows(
  [-0.0548755604, -0.8734370902, -0.4838350155],
  [0.4941094279, -0.44482963, 0.7469822445],
  [-0.867666149, -0.1980763734, 0.4559837762]
);

export const galacticToVector = (lRad, bRad) => {
  const g = [Math.cos(bRad) * Math.cos(lRad), Math.cos(bRad) * Math.sin(lRad), Math.sin(bRad)];
  const m = EQUATORIAL_TO_GALACTIC;
  // Inverse of an orthonormal matrix is its transpose.
  return [
    m[0] * g[0] + m[1] * g[1] + m[2] * g[2],
    m[3] * g[0] + m[4] * g[1] + m[5] * g[2],
    m[6] * g[0] + m[7] * g[1] + m[8] * g[2],
  ];
};

export const vectorToGalactic = (v) => {
  const g = mat3TransformVec3(EQUATORIAL_TO_GALACTIC, v);
  return {
    l: (Math.atan2(g[1], g[0]) + TAU) % TAU,
    b: Math.asin(clamp(g[2], -1, 1)),
  };
};

// Rotation taking equatorial vectors into the observer's horizontal frame for a given
// local sidereal time and latitude (both radians).
export const equatorialToHorizontalMatrix = (lst, latitude, out) => {
  const sinT = Math.sin(lst);
  const cosT = Math.cos(lst);
  const sinP = Math.sin(latitude);
  const cosP = Math.cos(latitude);

  return mat3FromRows(
    [-sinT, cosT, 0],
    [-sinP * cosT, -sinP * sinT, cosP],
    [cosP * cosT, cosP * sinT, sinP],
    out
  );
};

export const horizontalToAltAz = (h) => ({
  altitude: Math.asin(clamp(h[2], -1, 1)),
  azimuth: (Math.atan2(h[0], h[1]) + TAU) % TAU,
});

// Relative air mass (Kasten & Young 1989); finite at the horizon.
export const airmass = (altitudeRad) => {
  const degrees = Math.max(altitudeRad / DEG, 0);
  return 1 / (Math.sin(degrees * DEG) + 0.50572 * Math.pow(degrees + 6.07995, -1.6364));
};

export const julianDate = (date) => date.getTime() / 86400000 + 2440587.5;

// Local mean sidereal time in radians for a longitude in degrees (east positive).
export const localSiderealTime = (date, longitudeDeg) => {
  const days = julianDate(date) - 2451545.0;
  const gmstDeg = 280.46061837 + 360.98564736629 * days;
  return (((gmstDeg + longitudeDeg) * DEG) % TAU + TAU) % TAU;
};

// Effective temperature from B−V (Ballesteros 2012).
export const bvToTemperature = (bv) => {
  const index = clamp(bv, -0.4, 2.4);
  return 4600 * (1 / (0.92 * index + 1.7) + 1 / (0.92 * index + 0.62));
};

// Planckian locus chromaticity (Kim et al. 2002), valid 1667 K – 25000 K.
const planckianChromaticity = (temperature) => {
  const t = clamp(temperature, 1667, 25000);
  const t1 = 1e3 / t;
  const t2 = t1 * t1;
  const t3 = t2 * t1;
  const x =
    t <= 4000
      ? -0.2661239 * t3 - 0.234358 * t2 + 0.8776956 * t1 + 0.17991
      : -3.0258469 * t3 + 2.1070379 * t2 + 0.2226347 * t1 + 0.24039;
  const x2 = x * x;
  const x3 = x2 * x;
  const y =
    t <= 2222
      ? -1.1063814 * x3 - 1.3481102 * x2 + 2.18555832 * x - 0.20219683
      : t <= 4000
        ? -0.9549476 * x3 - 1.37418593 * x2 + 2.09137015 * x - 0.16748867
        : 3.081758 * x3 - 5.8733867 * x2 + 3.75112997 * x - 0.37001483;
  return { x, y };
};

// Linear sRGB colour of a blackbody, normalised to unit luminance so that the
// star's magnitude alone controls its brightness. `saturation` exaggerates the
// (physically pale) hue the way softened astrophotographs do.
export const temperatureToLinearRgb = (temperature, saturation = 1) => {
  const { x, y } = planckianChromaticity(temperature);
  const X = x / y;
  const Z = (1 - x - y) / y;
  let r = Math.max(0, 3.2406 * X - 1.5372 - 0.4986 * Z);
  let g = Math.max(0, -0.9689 * X + 1.8758 + 0.0415 * Z);
  let b = Math.max(0, 0.0557 * X - 0.204 + 1.057 * Z);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  r /= luminance;
  g /= luminance;
  b /= luminance;

  return [
    Math.max(0, 1 + (r - 1) * saturation),
    Math.max(0, 1 + (g - 1) * saturation),
    Math.max(0, 1 + (b - 1) * saturation),
  ];
};

export const bvToLinearRgb = (bv, saturation = 1) =>
  temperatureToLinearRgb(bvToTemperature(bv), saturation);

export const formatSexagesimal = (value, { hours = false, signed = false } = {}) => {
  const sign = value < 0 ? "−" : signed ? "+" : "";
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute);
  const minutes = Math.floor((absolute - whole) * 60);
  return hours
    ? `${String(whole).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`
    : `${sign}${whole}°${String(minutes).padStart(2, "0")}′`;
};
