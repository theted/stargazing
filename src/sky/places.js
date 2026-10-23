// Curated observing sites. A place is pure data: where you stand, where you look,
// what the horizon looks like and what the air above it is doing.
//
// Angles are in degrees. Ridge layers run from the farthest (index 0) to the nearest.
// Each ridge is periodic fractal noise around the full horizon:
//   base       altitude of the ridge floor
//   amplitude  height of the noise on top of the floor
//   frequency  features around the horizon (higher = busier skyline)
//   roughness  octave gain (0.4 smooth hills … 0.6 jagged rock)
//   color      silhouette colour, display-linear
//   mist       how much valley haze lightens the lower part of the layer

export const PLACES = {
  atacama: {
    label: "Atacama",
    name: "Cerro Paranal",
    region: "Atacama Desert",
    latitude: -24.627,
    longitude: -70.404,
    startLst: 14.2,
    // `horizon` is where the horizon sits on screen, from the top (0) to the bottom (1).
    view: { azimuth: 122, horizon: 0.8, fov: 104 },
    landscape: {
      ridges: [
        { base: 0.4, amplitude: 3.2, frequency: 2.1, roughness: 0.48, seed: 3, color: [0.0026, 0.003, 0.0045], mist: 0.45 },
        { base: -0.2, amplitude: 2.4, frequency: 3.6, roughness: 0.52, seed: 11, color: [0.0014, 0.0016, 0.0025], mist: 0.3 },
        { base: -2.6, amplitude: 3.4, frequency: 6.5, roughness: 0.58, seed: 23, color: [0.0005, 0.00055, 0.0009], mist: 0.12 },
      ],
      cones: [{ azimuth: 100, height: 6.2, width: 10, layer: 0 }],
      trees: null,
      groundLight: [0.0005, 0.00045, 0.0004],
    },
    atmosphere: {
      extinction: 0.13,
      skyGlow: 1,
      airglow: 1.1,
      airglowRed: 0.55,
      lightDomes: [
        { azimuth: 72, width: 12, strength: 0.4, color: [1, 0.6, 0.32] },
        { azimuth: 205, width: 10, strength: 0.25, color: [1, 0.7, 0.45] },
      ],
      aurora: 0,
    },
    meteorRadiant: { ra: 6.6, dec: 22 },
  },

  lapland: {
    label: "Lapland",
    name: "Abisko",
    region: "Swedish Lapland",
    latitude: 68.35,
    longitude: 18.82,
    startLst: 2.2,
    view: { azimuth: 352, horizon: 0.78, fov: 108 },
    landscape: {
      ridges: [
        { base: 0.8, amplitude: 4.6, frequency: 2.4, roughness: 0.44, seed: 5, color: [0.0045, 0.0052, 0.0078], mist: 0.4 },
        { base: 0.1, amplitude: 2.2, frequency: 3.2, roughness: 0.46, seed: 17, color: [0.0022, 0.0026, 0.0038], mist: 0.3 },
        { base: -1.2, amplitude: 1.3, frequency: 5, roughness: 0.5, seed: 29, color: [0.0016, 0.0019, 0.0026], mist: 0.1 },
      ],
      cones: [],
      trees: { layer: 2, density: 0.8, height: 6.5, variation: 0.62, width: 0.26 },
      treeColor: [0.0003, 0.00034, 0.00045],
      // Snow under starlight.
      groundLight: [0.0022, 0.0028, 0.0038],
    },
    atmosphere: {
      extinction: 0.2,
      skyGlow: 0.85,
      airglow: 0.7,
      airglowRed: 0.4,
      lightDomes: [{ azimuth: 118, width: 14, strength: 0.35, color: [1, 0.66, 0.38] }],
      aurora: 1,
    },
    meteorRadiant: { ra: 3.1, dec: 58 },
  },
};

export const PLACE_KEYS = Object.keys(PLACES);

export const getPlace = (key) => PLACES[key] ?? PLACES[PLACE_KEYS[0]];
