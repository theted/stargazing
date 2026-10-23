// The Milky Way as data: the named star clouds, dark nebulae, emission regions and
// galaxies that make the real sky recognisable. The bake shader adds the procedural
// band, mottling and dust filaments around them.
//
// Galactic features use (l, b) in degrees; equatorial ones use RA in hours and Dec in
// degrees with a position angle. Sizes are Gaussian sigmas in degrees (for rings:
// radius and width).

import { DEG, cross3, normalize3 } from "./math.js";
import { galacticToVector, raDecToVector } from "./astro.js";

export const FEATURE_KIND = { glow: 0, dust: 1, ring: 2, galaxy: 3 };

const H_ALPHA = [1, 0.22, 0.34];
const H_ALPHA_SOFT = [1, 0.36, 0.42];
const OIII = [0.32, 0.86, 0.92];
const REFLECTION = [0.42, 0.6, 1];
const STARLIGHT = [1, 0.9, 0.76];
const OLD_STARS = [1, 0.84, 0.64];
const YOUNG_STARS = [0.86, 0.92, 1];

const galactic = (kind, l, b, sizeL, sizeB, color, amplitude) => ({
  frame: "galactic", kind, l, b, sizeL, sizeB, color, amplitude,
});

const equatorial = (kind, raHours, dec, major, minor, positionAngle, color, amplitude) => ({
  frame: "equatorial", kind, raHours, dec, major, minor, positionAngle, color, amplitude,
});

export const MILKY_WAY_FEATURES = [
  // Star clouds: the bright, grainy knots of the band.
  galactic("glow", 1.5, -4.5, 5.5, 3.5, OLD_STARS, 0.55), // Large Sagittarius Star Cloud
  galactic("glow", 12, -0.8, 1.6, 1.1, OLD_STARS, 0.45), // M24
  galactic("glow", 27, -2.5, 3.2, 2.4, STARLIGHT, 0.5), // Scutum Star Cloud
  galactic("glow", 330, -2, 5, 2.4, STARLIGHT, 0.32), // Norma Star Cloud
  galactic("glow", 76, 1.5, 9, 3.2, YOUNG_STARS, 0.38), // Cygnus Star Cloud
  galactic("glow", 287, -0.8, 6, 3, YOUNG_STARS, 0.34), // Carina
  galactic("glow", 307, -0.5, 9, 3, YOUNG_STARS, 0.26), // Crux–Centaurus
  galactic("glow", 40, -2.5, 7, 3, STARLIGHT, 0.22), // Aquila
  galactic("glow", 262, -1, 14, 4, YOUNG_STARS, 0.12), // Puppis–Vela
  galactic("glow", 125, 0, 18, 4, YOUNG_STARS, 0.08), // Cassiopeia–Perseus

  // Dark nebulae.
  galactic("dust", 301, -1, 2.6, 2.1, [1, 1, 1], 2.4), // Coalsack
  galactic("dust", 82, 1.2, 4.5, 2.2, [1, 1, 1], 1.6), // Northern Coalsack / Cygnus Rift
  galactic("dust", 30, 3, 9, 3.5, [1, 1, 1], 1.1), // Aquila Rift
  galactic("dust", 4, 4.5, 6, 2.6, [1, 1, 1], 1.5), // Ophiuchus clouds
  galactic("dust", 1, 6.5, 6.5, 1.1, [1, 1, 1], 1.4), // Pipe Nebula stem
  galactic("dust", 357, 4, 2.5, 3.5, [1, 1, 1], 1.3), // Pipe bowl
  galactic("dust", 353, 17, 3, 2, [1, 1, 1], 1.2), // Rho Ophiuchi cloud
  galactic("dust", 344, 13, 6, 1.4, [1, 1, 1], 0.6), // Rho Oph streamers
  galactic("dust", 172, -15, 8, 5, [1, 1, 1], 0.5), // Taurus clouds
  galactic("dust", 18, 2.5, 6, 1.8, [1, 1, 1], 0.9), // Serpens–Aquila lane
  galactic("dust", 62, 2, 8, 2, [1, 1, 1], 0.7), // Vulpecula rift

  // Emission and reflection nebulae.
  galactic("glow", 6, -1.2, 0.45, 0.32, H_ALPHA, 0.9), // Lagoon
  galactic("glow", 7, -0.25, 0.22, 0.22, H_ALPHA_SOFT, 0.45), // Trifid
  galactic("glow", 16.9, 0.8, 0.35, 0.35, H_ALPHA, 0.4), // Eagle
  galactic("glow", 15.1, -0.7, 0.3, 0.25, H_ALPHA, 0.4), // Omega
  galactic("glow", 287.6, -0.6, 0.9, 0.7, H_ALPHA_SOFT, 1.1), // Carina Nebula
  galactic("glow", 287.4, -0.6, 0.35, 0.3, OIII, 0.35),
  galactic("glow", 294.8, -1.6, 0.6, 0.5, H_ALPHA, 0.35), // Running Chicken
  galactic("glow", 336.5, -1.5, 0.7, 0.5, H_ALPHA, 0.3), // NGC 6188
  galactic("glow", 343.4, 1.2, 0.6, 0.5, H_ALPHA, 0.3), // Prawn
  galactic("glow", 351.2, 0.5, 0.45, 0.4, H_ALPHA, 0.3), // Cat's Paw
  galactic("glow", 85.6, -0.7, 1.4, 1.1, H_ALPHA, 0.42), // North America
  galactic("glow", 99.3, 3.7, 1.4, 1.3, H_ALPHA, 0.28), // IC 1396
  galactic("glow", 134, 0.9, 1.3, 0.8, H_ALPHA, 0.22), // Heart & Soul
  galactic("glow", 206.3, -2.1, 0.6, 0.6, H_ALPHA, 0.4), // Rosette
  galactic("glow", 160.3, -12.4, 1.3, 0.4, H_ALPHA, 0.16), // California
  galactic("glow", 258, -2, 16, 12, H_ALPHA_SOFT, 0.05), // Gum Nebula
  galactic("glow", 6, 23.5, 5, 4, H_ALPHA_SOFT, 0.05), // Sh2-27
  galactic("glow", 351.9, 15.1, 1.2, 1, [1, 0.72, 0.36], 0.32), // Antares nebulosity
  galactic("glow", 353.7, 17.7, 0.8, 0.7, REFLECTION, 0.3), // Rho Oph reflection
  galactic("glow", 351.3, 17, 1, 0.8, H_ALPHA, 0.22), // Sh2-9
  galactic("ring", 203, -17, 7, 0.7, H_ALPHA_SOFT, 0.05), // Barnard's Loop
  galactic("ring", 195, -12, 4, 0.6, H_ALPHA_SOFT, 0.035), // Lambda Orionis ring
  equatorial("glow", 5.588, -5.39, 0.4, 0.32, 0, [1, 0.5, 0.58], 0.9), // Orion Nebula
  equatorial("glow", 3.79, 24.1, 0.6, 0.5, 0, REFLECTION, 0.12), // Pleiades reflection

  // Galaxies and globular clusters.
  equatorial("galaxy", 5.39, -69.75, 2.8, 2.2, 170, [0.88, 0.92, 1], 0.22), // Large Magellanic Cloud
  equatorial("galaxy", 5.33, -69.6, 1.5, 0.4, 115, [0.95, 0.94, 1], 0.3), // LMC bar
  equatorial("glow", 5.643, -69.1, 0.22, 0.22, 0, H_ALPHA, 0.6), // Tarantula
  equatorial("galaxy", 0.878, -72.8, 1.3, 0.75, 45, [0.9, 0.93, 1], 0.24), // Small Magellanic Cloud
  equatorial("glow", 0.712, 41.27, 1.0, 0.26, 35, [1, 0.9, 0.78], 0.1), // Andromeda disc
  equatorial("glow", 0.712, 41.27, 0.14, 0.09, 35, [1, 0.88, 0.72], 0.45), // Andromeda core
  equatorial("glow", 1.565, 30.66, 0.3, 0.2, 23, [0.9, 0.92, 1], 0.04), // Triangulum
  equatorial("glow", 13.447, -47.48, 0.12, 0.12, 0, [1, 0.92, 0.8], 0.6), // Omega Centauri
  equatorial("glow", 0.401, -72.08, 0.09, 0.09, 0, [1, 0.92, 0.8], 0.5), // 47 Tucanae
  equatorial("glow", 16.695, 36.46, 0.05, 0.05, 0, [1, 0.94, 0.85], 0.35), // M13
];

const tangentFrame = (center, northPole) => {
  const east = normalize3(cross3(northPole, center));
  const north = cross3(center, east);
  return { east, north };
};

const GALACTIC_NORTH = galacticToVector(0, Math.PI / 2);
const EQUATORIAL_NORTH = [0, 0, 1];

// Each feature becomes 4 RGBA float texels for the bake shader:
//   [centre.xyz, kind]  [axis1.xyz, size1]  [axis2.xyz, size2]  [colour.rgb, amplitude]
export const packMilkyWayFeatures = (features = MILKY_WAY_FEATURES) => {
  const data = new Float32Array(features.length * 16);

  features.forEach((feature, index) => {
    let center;
    let axis1;
    let axis2;
    let size1;
    let size2;

    if (feature.frame === "galactic") {
      center = galacticToVector(feature.l * DEG, feature.b * DEG);
      const { east, north } = tangentFrame(center, GALACTIC_NORTH);
      // In galactic coordinates "east" is the direction of increasing longitude.
      axis1 = east;
      axis2 = north;
      size1 = feature.sizeL * DEG;
      size2 = feature.sizeB * DEG;
    } else {
      center = raDecToVector((feature.raHours / 24) * Math.PI * 2, feature.dec * DEG);
      const { east, north } = tangentFrame(center, EQUATORIAL_NORTH);
      const angle = feature.positionAngle * DEG;
      axis1 = normalize3([
        north[0] * Math.cos(angle) + east[0] * Math.sin(angle),
        north[1] * Math.cos(angle) + east[1] * Math.sin(angle),
        north[2] * Math.cos(angle) + east[2] * Math.sin(angle),
      ]);
      axis2 = cross3(center, axis1);
      size1 = feature.major * DEG;
      size2 = feature.minor * DEG;
    }

    data.set(
      [
        ...center, FEATURE_KIND[feature.kind],
        ...axis1, size1,
        ...axis2, size2,
        ...feature.color, feature.amplitude,
      ],
      index * 16
    );
  });

  return { data, count: features.length };
};
